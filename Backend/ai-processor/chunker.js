const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const cleanHtml = require('./cleaner'); // Assuming cleaner.js is in the same folder

/**
 * Recursively extract structured component tree with optimized data storage
 */
function extractElements($, element, depth = 0) {
  const tag = $(element).get(0)?.tagName;
  if (!tag) return null;

  // Skip unnecessary tags
  if (['script', 'style', 'meta', 'noscript', 'link', 'path', 'svg'].includes(tag)) return null;

  // Get text content, trimmed and limited
  const text = $(element).text().trim();
  const shortText = text.length > 50 ? text.substring(0, 50) + '...' : text;

  // Get only important attributes
  const attrs = {};
  const el = $(element);
  const importantAttrs = ['id', 'class', 'href', 'src', 'alt', 'title'];
  importantAttrs.forEach(attr => {
    const value = el.attr(attr);
    if (value) attrs[attr] = value;
  });

  // Create optimized element object
  const elementObj = {
    tag,
    children: []
  };

  // Only add properties if they have values
  if (Object.keys(attrs).length > 0) elementObj.attrs = attrs;
  if (shortText) elementObj.text = shortText;

  // Only store raw HTML for important elements
  if (['div', 'section', 'article', 'main', 'header', 'footer'].includes(tag)) {
    const rawHTML = $.html(element);
    if (rawHTML.length < 500) { // Only store if not too large
      elementObj.rawHTML = rawHTML;
    }
  }

  // Recursively process children, but limit depth
  if (depth < 4) { // Limit depth to 4 levels
  $(element).children().each((i, child) => {
    const childElement = extractElements($, child, depth + 1);
      if (childElement) elementObj.children.push(childElement);
  });
  }

  return elementObj;
}

function createChunksFromTree(tree, maxDepth = 2) {
  const chunks = [];

  function traverse(node, depth = 0) {
    if (!node) return;

    if (depth === maxDepth) {
      // Only include chunks that have meaningful content
      if (node.text || (node.attrs && Object.keys(node.attrs).length > 0)) {
      chunks.push(node);
      }
      return;
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => traverse(child, depth + 1));
    }
  }

  traverse(tree);
  return chunks.slice(0, 100); // Limit to 100 most relevant chunks
}

function chunkHTML(htmlContent, metadata) {
  try {
    // Clean the HTML
    const cleanedHTML = cleanHtml(htmlContent);
  const $ = cheerio.load(cleanedHTML);

  // Extract HTML structure from the body
  const body = $('body').first();
  const structure = extractElements($, body);

    // Create chunks from the structure
    const chunks = createChunksFromTree(structure, 3);

    // Create optimized result
    const result = {
     metadata: {
        url: metadata.url,
        title: metadata.title,
        timestamp: metadata.timestamp,
        captureTime: metadata.captureTime
     },
     structure: chunks
   };
 
    return result;
  } catch (error) {
    console.error('Error in chunkHTML:', error);
    throw error;
  }
}

module.exports = { chunkHTML };
