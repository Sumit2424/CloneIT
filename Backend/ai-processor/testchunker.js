const { chunkHTML } = require('./chunker');

// Paths to HTML and JSON
const htmlPath = '../captured-images/session-10/1744979954330.html';
const jsonPath = '../captured-images/session-10/1744979954330.json';

const result = chunkHTML(htmlPath, jsonPath);

console.log("✅ Metadata:", result.metadata);
console.log("✅ Total Chunks:", result.structure.length);
console.log("🧪 First Chunk Preview:\n", result.structure[0]);
