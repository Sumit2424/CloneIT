// groq-runner.js

const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const { callGroq } = require("./grokclient");

// Configuration
const PATHS = {
  cleanedData: path.join(__dirname, "../cleaneddata"),
  promptStore: path.join(__dirname, "prompt-store"),
  processing: path.join(__dirname, "prompt-store/.processing")
};

// Track processing files to avoid duplicates
const processingFiles = new Set();

// Ensure required directories exist
function ensureDirectories() {
  Object.values(PATHS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

// Extract website info from processed.json
function getWebsiteInfo(filePath) {
  try {
    // Get the directory containing processed.json
    const fileDir = path.dirname(filePath);
    const processedJsonPath = path.join(fileDir, 'processed.json');
    
    if (fs.existsSync(processedJsonPath)) {
      const processedData = JSON.parse(fs.readFileSync(processedJsonPath, 'utf-8'));
      const url = processedData.url || '';
      const domain = url ? new URL(url).hostname : '';
      
      console.log(`🌐 Found website URL: ${url}`);
      console.log(`🔍 Domain: ${domain}`);
      
      return {
        url,
        domain,
        title: processedData.title || '',
        timestamp: processedData.timestamp,
        colors: processedData.styles?.colors || [],
        backgroundColor: processedData.styles?.backgroundColor || '',
        textColor: processedData.styles?.textColor || ''
      };
    }
    return null;
  } catch (e) {
    console.error("❌ Error reading website info:", e.message);
    return null;
  }
}

// Extract essential data from JSON
function extractEssentialData(jsonContent, websiteInfo) {
  try {
    const data = JSON.parse(jsonContent);
    // Extract only the necessary fields to reduce payload size
    const essential = {
      layout: data.layout || {},
      interactions: data.interactions || {},
      styles: data.styles || {},
      metadata: {
        timestamp: websiteInfo?.timestamp || data.metadata?.timestamp,
        url: websiteInfo?.url || data.metadata?.url,
        title: websiteInfo?.title || data.metadata?.title
      }
    };
    return JSON.stringify(essential, null, 2);
  } catch (e) {
    console.error("❌ Error extracting essential data:", e.message);
    return jsonContent; // Return original if parsing fails
  }
}

// Process a single file
async function processFile(filePath) {
      const fileName = path.basename(filePath, ".json");
      const sessionFolder = path.basename(path.dirname(filePath));
  const fileDir = path.dirname(filePath);
  
  // Define all possible input files and output paths
  const paths = {
    json: filePath,
    screenshot: path.join(fileDir, 'screenshot.jpg'),
    // Create a folder for each analysis in prompt-store
    analysisDir: path.join(PATHS.promptStore, `${sessionFolder}_${fileName}`),
    lock: path.join(PATHS.processing, `${sessionFolder}_${fileName}.lock`)
  };

  // Check if file is already being processing
  if (processingFiles.has(filePath)) {
    console.log(`⏳ File ${filePath} is already being processed`);
    return;
  }

  try {
    // Create lock file and add to processing set
    fs.writeFileSync(paths.lock, new Date().toISOString());
    processingFiles.add(filePath);

    // Create analysis directory if it doesn't exist
    if (!fs.existsSync(paths.analysisDir)) {
      fs.mkdirSync(paths.analysisDir, { recursive: true });
    }

    console.log(`🔄 Processing ${sessionFolder}/${fileName}`);

    // Get website info from processed.json first
    const websiteInfo = getWebsiteInfo(filePath);
    if (!websiteInfo) {
      console.log("⚠️ No website info found in processed.json");
    }

    // Read and validate JSON content for UI/UX data
    const jsonContent = fs.readFileSync(paths.json, "utf-8");
    const data = JSON.parse(jsonContent);
    
    // Extract detailed style information
    const styles = data.styles || {};
    const colors = styles.colors || [];
    const backgroundColor = styles.backgroundColor || '';
    const textColor = styles.textColor || '';
    const layout = data.layout || {};
    const interactions = data.interactions || {};

    // Check for and copy screenshot
    const hasScreenshot = fs.existsSync(paths.screenshot);
    if (hasScreenshot) {
      fs.copyFileSync(paths.screenshot, path.join(paths.analysisDir, 'screenshot.jpg'));
      console.log('📸 Copied screenshot to analysis directory');
    } else {
      console.log('⚠️ No screenshot found');
    }

    // Copy processed.json
    fs.copyFileSync(paths.json, path.join(paths.analysisDir, 'processed.json'));
    console.log('📄 Copied processed.json to analysis directory');

    // Prepare data for analysis with website context and detailed visual information
        const combinedData = `
🌐 Website Analysis Target: ${websiteInfo?.url || 'Unknown URL'}
📑 Page Title: ${websiteInfo?.title || 'Unknown Title'}
⏰ Timestamp: ${new Date(websiteInfo?.timestamp || Date.now()).toISOString()}

🎨 Visual Design Elements:
- Primary Colors: ${colors.join(', ')}
- Background Color: ${backgroundColor}
- Text Color: ${textColor}
- Additional Style Information: ${JSON.stringify(styles, null, 2)}

📐 Layout Analysis:
${JSON.stringify(layout, null, 2)}

🔄 Interactive Elements:
${JSON.stringify(interactions, null, 2)}

🔍 UI/UX Data Analysis:
${JSON.stringify(data, null, 2)}
    `.trim();

    // Call Groq API with chunked processing
    const promptResult = await callGroq(combinedData);

    if (promptResult) {
      // Save the analysis in the analysis directory
      const promptPath = path.join(paths.analysisDir, 'analysis.txt');
      fs.writeFileSync(promptPath, promptResult);
      console.log(`✅ Analysis saved: ${path.basename(promptPath)}`);
      
      // Also save a copy in the session folder
      const sessionPromptPath = path.join(fileDir, `${fileName}_prompt.txt`);
      fs.writeFileSync(sessionPromptPath, promptResult);
      console.log(`📋 Analysis copied to session folder: ${sessionPromptPath}`);
    } else {
      throw new Error("Failed to get analysis from Groq API");
    }

      } catch (err) {
    console.error(`❌ Error processing ${filePath}:`, err.message);
  } finally {
    // Cleanup
    processingFiles.delete(filePath);
    if (fs.existsSync(paths.lock)) {
      fs.unlinkSync(paths.lock);
    }
  }
}

// Initialize and start watching
async function init() {
  console.log("🚀 Initializing CloneIT AI Processor...");
  
  // Check for GROQ API key and warn if missing, but don't fail
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ GROQ_API_KEY is not set in environment variables.");
    console.warn("AI processing will be disabled, but MongoDB and file uploads will still work.");
    return false; // Return false but don't throw an error
  }
  
  // Ensure directories exist
  ensureDirectories();

  // Clean up any stale lock files
  if (fs.existsSync(PATHS.processing)) {
    fs.readdirSync(PATHS.processing).forEach(file => {
      if (file.endsWith('.lock')) {
        fs.unlinkSync(path.join(PATHS.processing, file));
      }
    });
  }

  // Set up file watcher
  const watcher = chokidar.watch(PATHS.cleanedData, {
    persistent: true,
    depth: 2,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  watcher
    .on("add", async (filePath) => {
      if (filePath.endsWith(".json")) {
        await processFile(filePath);
      }
    })
    .on("error", error => {
      console.error("🔥 Watcher error:", error);
    });

  console.log(`
👀 Watching for cleaned UI/UX data in:
   ${PATHS.cleanedData}
📝 Saving analysis results in:
   ${PATHS.promptStore}
   and in each session folder
  `);

  return watcher; // Return watcher for cleanup if needed
}

// Export the init function
module.exports = { init };
