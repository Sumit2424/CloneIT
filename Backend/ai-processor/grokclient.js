// grokclient.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const axios = require("axios");

// Configuration
const CONFIG = {
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1/chat/completions",
  model: "llama3-8b-8192",
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  timeout: 30000, // 30 seconds
  maxChunkSize: 12000, // Maximum characters per chunk
};

// Validate API key on startup - warn but don't exit
if (!CONFIG.apiKey) {
  console.warn("⚠️ GROQ_API_KEY is not set in environment variables");
  console.warn("AI processing will be disabled, but other features will still work");
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Extract website info and colors from the data
function extractWebsiteInfo(data) {
  try {
    const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
    const url = jsonData.metadata?.url || jsonData['🌐 Website'] || '';
    const title = jsonData.metadata?.title || jsonData['📑 Page Title'] || '';
    const timestamp = jsonData.metadata?.timestamp || Date.now();
    
    return {
      url,
      title,
      timestamp,
      domain: url ? new URL(url).hostname : ''
    };
  } catch (e) {
    return { url: '', title: '', domain: '', timestamp: Date.now() };
  }
}

// Split text into chunks that won't exceed API limits
function splitIntoChunks(text, maxSize = CONFIG.maxChunkSize) {
  const chunks = [];
  let currentChunk = "";
  
  // Split by lines to avoid breaking in middle of content
  const lines = text.split("\n");
  
  for (const line of lines) {
    if (currentChunk.length + line.length + 1 <= maxSize) {
      currentChunk += line + "\n";
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = line + "\n";
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// Process a single chunk with API key check
const processChunk = async (chunk, context, retryCount = 0) => {
  // Check API key before making request
  if (!CONFIG.apiKey) {
    console.warn("⚠️ Cannot process chunk: GROQ_API_KEY is not set");
    return null;
  }
  
  try {
    const prompt = `${context}\n\nAnalyze this portion of the UI/UX data:\n\n${chunk}`;
    
    const response = await axios.post(
      CONFIG.baseURL,
      {
        model: CONFIG.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: CONFIG.timeout,
      }
    );

    return response.data.choices[0].message.content;
  } catch (err) {
    console.error(`🔥 Groq API Error (attempt ${retryCount + 1}/${CONFIG.maxRetries}):`, err.message);
    
    if (err.response?.status === 401) {
      console.error("❌ Invalid API key or authentication error");
      return null;
    }
    
    if (err.response?.status === 429) {
      console.log("⏳ Rate limit reached, waiting before retry...");
      await sleep(CONFIG.retryDelay * 2);
    }

    if (retryCount < CONFIG.maxRetries - 1) {
      console.log(`🔄 Retrying in ${CONFIG.retryDelay/1000} seconds...`);
      await sleep(CONFIG.retryDelay);
      return processChunk(chunk, context, retryCount + 1);
    }

    return null;
  }
};

// Main analysis function
const callGroq = async (inputText) => {
  const chunks = splitIntoChunks(inputText);
  console.log(`📦 Split input into ${chunks.length} chunks`);
  
  const websiteInfo = extractWebsiteInfo(inputText);
  const { url, title, domain } = websiteInfo;
  
  const context = `You are analyzing a UI/UX snapshot from ${url}
Page Title: "${title}"
Timestamp: ${new Date(websiteInfo.timestamp).toLocaleString()}

Your task is to provide a detailed UI/UX analysis of this ${domain} page, comparing it with the actual website at ${url}.

Please analyze the following aspects:

1. Website Context & Brand Identity:
   - Compare with the actual ${domain} website (${url})
   - Analyze how this implementation matches ${domain}'s brand identity
   - Evaluate the target audience alignment

2. Visual Design Analysis:
   - Color scheme and brand color usage
   - Typography and text hierarchy
   - Layout structure and spacing
   - Visual elements and imagery
   - Responsive design patterns

3. User Interface Components:
   - Navigation and menu structure
   - Header and footer implementation
   - Call-to-action buttons and links
   - Forms and input fields
   - Search functionality
   - Shopping cart/conversion elements (if applicable)

4. User Experience Flow:
   - Navigation paths and user journey
   - Content organization
   - Interactive elements and feedback
   - Loading states and transitions
   - Mobile responsiveness
   - Error handling and user feedback

5. Performance & Technical Aspects:
   - Loading optimization opportunities
   - Accessibility considerations
   - Browser compatibility
   - Technical implementation quality

6. Recommendations:
   - Specific improvements for better alignment with ${domain}'s brand
   - UX enhancement suggestions
   - Performance optimization ideas
   - Mobile experience improvements

Please provide specific, actionable insights and compare with the actual ${domain} website (${url}) throughout your analysis.`;

  let fullAnalysis = "";
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`📝 Processing chunk ${i + 1}/${chunks.length}`);
    const result = await processChunk(chunks[i], context);
    
    if (!result) {
      console.error(`❌ Failed to process chunk ${i + 1}`);
      continue;
    }
    
    fullAnalysis += result + "\n\n";
  }
  
  if (!fullAnalysis) {
    return null;
  }
  
  // Add a summary if there were multiple chunks
  if (chunks.length > 1) {
    const summaryPrompt = `Provide a detailed executive summary of the UI/UX analysis for ${url}, focusing on key findings and comparisons with the actual website:\n\n${fullAnalysis}`;
    const summary = await processChunk(summaryPrompt, "");
    if (summary) {
      fullAnalysis = `🌐 Website Analysis: ${url}
📑 Page Title: ${title}
⏰ Analysis Time: ${new Date().toISOString()}

📋 EXECUTIVE SUMMARY:
${summary}

🎨 DETAILED ANALYSIS:
${fullAnalysis}`;
    }
  }
  
  return fullAnalysis;
};

module.exports = { callGroq };
