const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const { chunkHTML } = require('./ai-processor/chunker');  // Import chunker
const cleanHtml = require('./ai-processor/cleaner');      // Import cleaner
const { init: initGroqProcessor } = require('./ai-processor/groqrunner');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Load env vars from root directory
const mongoose = require('mongoose');
const connectDB = require('./Database/db');
const Project = require('./Database/models/Project'); // Fix capitalization
const gridUploader = require('./gridUploader/gridUploader'); // Import gridUploader
const os = require('os'); // For platform detection

// Import routes
const historyRoutes = require('./routes/history');

// Session tracking variables
let activeSessionId = null;
let isCapturing = false;
let captureInterval = null;

// Initialize MongoDB when the server starts
connectDB().then(() => {
  console.log('🔌 MongoDB connection initialized through Database/db.js');
  
  // Initialize GridFS for file uploading
  gridUploader.initGridFS().then((result) => {
    if (result) {
      console.log('✅ GridFS initialized successfully');
    } else {
      console.error('❌ Failed to initialize GridFS');
    }
  });
}).catch(err => {
  console.error('❌ Failed to connect to MongoDB:', err);
});

// Setup Fluvio - with better platform-specific error handling
let fluvioConnected = false;
let producer = null;
let Fluvio;

try {
  // Check if we're on Windows
  const isWindows = os.platform() === 'win32';
  
  if (isWindows) {
    console.log('⚠️ Windows platform detected - Fluvio native bindings might need special handling');
    
    // Alternative approach for Windows
    try {
      // Try direct require - might work with newer versions
      Fluvio = require('@fluvio/client').Fluvio;
      console.log('✅ @fluvio/client loaded successfully on Windows');
    } catch (winErr) {
      console.error('❌ Error loading @fluvio/client on Windows:', winErr.message);
      
      if (winErr.message.includes('win/index.node')) {
        console.log('💡 Native module issue detected. Checking for alternative paths...');
        
        // Try to locate the module in node_modules
        const potentialPaths = [
          path.join(__dirname, 'node_modules', '@fluvio', 'client', 'lib'),
          path.join(__dirname, '..', 'node_modules', '@fluvio', 'client', 'lib')
        ];
        
        console.log('Looking for Fluvio in:', potentialPaths.join(', '));
        
        // Provide detailed troubleshooting info
        console.log('💡 To fix Fluvio on Windows, try these steps:');
        console.log('1. npm uninstall @fluvio/client');
        console.log('2. npm install @fluvio/client@latest');
        console.log('3. If still failing, check Node.js version (v16+ recommended)');
      }
    }
  } else {
    // Non-Windows platforms usually work fine
    Fluvio = require('@fluvio/client').Fluvio;
    console.log('✅ @fluvio/client loaded successfully');
  }
} catch (err) {
  console.error('❌ Error loading @fluvio/client:', err.message);
  console.log('💡 To fix this, run: npm install @fluvio/client --save');
}

async function setupFluvio() {
  if (!Fluvio) {
    console.log('⚠️ Fluvio not loaded - skipping connection');
    return;
  }

  try {
    console.log('Attempting to connect to Fluvio...');
    const fluvio = new Fluvio();
    await fluvio.connect();
    console.log('Connected to Fluvio, creating producer...');
    producer = await fluvio.topicProducer('screen-captures');
    fluvioConnected = true;
    console.log('✅ Fluvio connected successfully and producer created');
  } catch (err) {
    console.error('❌ Error connecting to Fluvio:', err.message);
    console.log('⚠️ Continuing without Fluvio - data will only be saved locally');
    
    if (err.message.includes('Command failed')) {
      console.log('💡 Make sure the Fluvio service is running and accessible');
    }
    
    // Check if this is a typical Windows path issue
    if (err.message.includes('win/index.node') || err.message.includes('find module')) {
      console.log('This appears to be a native module issue on Windows.');
      console.log('💡 Check if you have the right version of Node.js and Visual C++ build tools.');
    }
  }
}

// Set up a basic file-based message store as fallback
class FileMessageStore {
  constructor() {
    this.storePath = path.join(__dirname, 'message-store.json');
    this.ensureStoreExists();
    console.log('📁 File-based message store initialized at:', this.storePath);
  }
  
  ensureStoreExists() {
    if (!fs.existsSync(this.storePath)) {
      fs.writeFileSync(this.storePath, JSON.stringify({ messages: [] }));
    }
  }
  
  async saveMessage(key, value) {
    try {
      const store = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
      store.messages.push({ key, value, timestamp: Date.now() });
      fs.writeFileSync(this.storePath, JSON.stringify(store, null, 2));
      return true;
    } catch (err) {
      console.error('Error saving to file store:', err);
      return false;
    }
  }
}

// Create file store as fallback
const fileStore = new FileMessageStore();

// Set up the Express server
const app = express();
app.use(cors());

app.use(session({
  secret: 'cloneit-super-secret-key', // Change this to an env variable in production
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set true if using https
}));

app.use(bodyParser.json({ limit: '10mb' })); // increase limit for base64 images

app.use((req, res, next) => {
  if (!req.session.userId) {
    req.session.userId = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log('🆕 New session initialized:', req.session.userId);
  } else {
    console.log('🔁 Existing session:', req.session.userId);
  }
  next();
});

// Try to connect to Fluvio (won't block server startup if it fails)
setupFluvio();

// Get all sessions
app.get('/sessions', (req, res) => {
  const captureDir = path.join(__dirname, 'captured-images');
  
  if (!fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir, { recursive: true });
    return res.json({ sessions: [], message: 'No sessions found' });
  }
  
  // Get all session directories
  const directories = fs.readdirSync(captureDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('session-'))
    .map(dirent => dirent.name);
  
  // For each session, get basic info
  const sessions = directories.map(dir => {
    const sessionDir = path.join(captureDir, dir);
    const files = fs.readdirSync(sessionDir);
    const imageCount = files.filter(file => file.endsWith('.jpg') || file.endsWith('.png')).length;
    const htmlCount = files.filter(file => file.endsWith('.html')).length;
    
    // Try to get the first and last timestamps from filenames
    const timestamps = files
      .filter(file => file.endsWith('.jpg') || file.endsWith('.png'))
      .map(file => parseInt(path.basename(file, path.extname(file))))
      .filter(ts => !isNaN(ts))
      .sort((a, b) => a - b);
    
    const startTime = timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : null;
    const endTime = timestamps.length > 0 ? new Date(timestamps[timestamps.length-1]).toISOString() : null;
    
    return {
      id: dir,
      imageCount,
      htmlCount,
      startTime,
      endTime,
      active: dir === activeSessionId
    };
  });
  
  res.json({ 
    sessions: sessions.sort((a, b) => b.startTime - a.startTime), // newest first
    currentActiveSession: activeSessionId,
    isCapturing
  });
});

// Get captures for a specific session
app.get('/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const sessionDir = path.join(__dirname, 'captured-images', sessionId);
  
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Get all files in the session directory
  const files = fs.readdirSync(sessionDir);
  
  const captures = files
    .filter(file => file.endsWith('.jpg') || file.endsWith('.png'))
    .map(file => {
      const timestamp = path.basename(file, path.extname(file));
      const htmlFile = `${timestamp}.html`;
      
      return {
        timestamp,
        imagePath: `/captured-images/${sessionId}/${file}`,
        htmlPath: files.includes(htmlFile) ? `/captured-images/${sessionId}/${htmlFile}` : null
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp); // newest first
    
  res.json({ 
    sessionId,
    captures,
    isActive: sessionId === activeSessionId,
    isCapturing: sessionId === activeSessionId && isCapturing
  });
});

// Start a new capture session
app.post('/sessions/start', (req, res) => {
  if (isCapturing) {
    return res.status(400).json({ 
      error: 'A session is already active', 
      activeSessionId 
    });
  }
  
  // Create a new session ID
  const sessionCount = getNextSessionNumber();
  activeSessionId = `session-${sessionCount}`;
  isCapturing = true;
  
  // Create the session directory
  const sessionDir = path.join(__dirname, 'captured-images', activeSessionId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  console.log(`🚀 Started new capture session: ${activeSessionId}`);
  
  res.json({ 
    message: 'Capture session started',
    sessionId: activeSessionId
  });
});

// Stop the current capture session
app.post('/sessions/stop', (req, res) => {
  if (!isCapturing) {
    return res.status(400).json({ error: 'No active capture session' });
  }
  
  isCapturing = false;
  const stoppedSessionId = activeSessionId;
  
  // Reset the active session ID to allow starting a new session
  activeSessionId = null;
  
  // Clear any capture interval if it exists
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
    console.log(`🛑 Cleared capture interval for session: ${stoppedSessionId}`);
  }
  
  console.log(`🛑 Stopped capture session: ${stoppedSessionId}`);
  
  res.json({ 
    message: 'Capture session stopped',
    sessionId: stoppedSessionId
  });
});

// Helper function to get the next session number
function getNextSessionNumber() {
  const captureDir = path.join(__dirname, 'captured-images');
  
  if (!fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir, { recursive: true });
    return 1;
  }
  
  const sessionDirs = fs.readdirSync(captureDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('session-'))
    .map(dirent => {
      const match = dirent.name.match(/session-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => !isNaN(num));
  
  return sessionDirs.length > 0 ? Math.max(...sessionDirs) + 1 : 1;
}

// Add a route to get all captured screenshots (legacy endpoint - now redirects to sessions)
app.get('/captures', (req, res) => {
  res.redirect('/sessions');
});

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'Static')));

// Add a route for the main page - redirect to sessions UI
app.get('/', (req, res) => {
  res.redirect('/static/sessions.html');
});

// Serve captured images and HTML static files
app.use('/captured-images', express.static(path.join(__dirname, 'captured-images')));

// Modified process endpoint to store in session folders
app.post('/process', async (req, res) => {
  try {
    const captureStartTime = Date.now();
    console.log(`\n📥 INCOMING CAPTURE REQUEST at ${new Date().toLocaleTimeString()}`);
    console.log('----------------------------------');
    
    const { image, area, html, url, timestamp, title } = req.body;

    // Log what data was received (with abbreviated length info)
    console.log('📋 Data received includes:');
    console.log('- Image data:', image ? `✅ (${Math.round(image.length/1024)} KB)` : '❌ Missing');
    console.log('- HTML data:', html ? `✅ (${Math.round(html.length/1024)} KB)` : '❌ Missing');
    console.log('- Area data:', area ? `✅ ${JSON.stringify(area)}` : '❌ Missing');
    console.log('- URL:', url || 'Not provided');
    console.log('- Title:', title || 'Not provided');

  if (!image || !area) {
      console.log('❌ ERROR: Required data missing (image or area)');
    return res.status(400).json({ error: 'Image or area not provided' });
  }

    // Check if we have an active session, but don't be too strict
    let targetSessionId = activeSessionId;
    
    if (!targetSessionId) {
      console.log('⚠️ WARNING: No active session found - but we will create one to save this capture');
      // Create a new emergency session
      const sessionCount = getNextSessionNumber();
      targetSessionId = `session-${sessionCount}`;
      activeSessionId = targetSessionId;
      isCapturing = true;
      console.log(`🚨 CREATED EMERGENCY SESSION: ${targetSessionId}`);
    }

    // Process the image (don't make the client wait for file operations)
    res.json({ 
      message: 'Image processing started', 
      sessionId: targetSessionId,
      imagePath: `/captured-images/${targetSessionId}/${timestamp || Date.now()}.jpg`,
      timestamp: timestamp || Date.now(),
      interval: 5000,
      status: 'processing'
    });

    // Now we can take our time processing
    try {
      const imageBuffer = Buffer.from(image, 'base64');
      const captureTimestamp = timestamp || Date.now();
      
      // Create directories for both original and cleaned data
      const captureDir = path.join(__dirname, 'captured-images', targetSessionId);
      const cleanedDataDir = path.join(__dirname, 'cleaneddata', targetSessionId, captureTimestamp.toString());
      
      // Create both directories
      fs.mkdirSync(captureDir, { recursive: true });
      fs.mkdirSync(cleanedDataDir, { recursive: true });
      
      console.log(`📁 Created directories:`);
      console.log(`   - Capture: ${captureDir}`);
      console.log(`   - Cleaned data: ${cleanedDataDir}`);
      
      // Paths for original capture files
      const imagePath = path.join(captureDir, `${captureTimestamp}.jpg`);
      const htmlPath = path.join(captureDir, `${captureTimestamp}.html`);
      const metaPath = path.join(captureDir, `${captureTimestamp}.json`);
      
      // Paths for cleaned and processed files
      const cleanedHtmlPath = path.join(cleanedDataDir, 'cleaned.html');
      const processedPath = path.join(cleanedDataDir, 'processed.json');
      const cleanedImagePath = path.join(cleanedDataDir, 'screenshot.jpg');

      // Save original files
  fs.writeFileSync(imagePath, imageBuffer);
      
      // Also save the image in the cleaned data directory
      fs.writeFileSync(cleanedImagePath, imageBuffer);
      console.log('✅ Screenshot saved in both locations');
    
    if (html) {
      fs.writeFileSync(htmlPath, html);
        
        // Process HTML using cleaner and chunker
        console.log('🔄 Processing HTML with cleaner and chunker...');
        try {
          // Clean the HTML first
          const cleanedHTML = cleanHtml(html);
          
          // Save cleaned HTML in the new location
          fs.writeFileSync(cleanedHtmlPath, cleanedHTML);
          console.log('✅ Cleaned HTML saved');

          // Create metadata object
          const metadata = {
            timestamp: captureTimestamp,
            url,
            title,
    area,
            captureTime: Date.now() - captureStartTime,
            originalPath: {
              image: imagePath,
              html: htmlPath,
              meta: metaPath
            }
          };

          // Process with chunker (using cleaned HTML)
          const processedData = chunkHTML(cleanedHTML, metadata);
          
          // Save processed data in the new location
          fs.writeFileSync(processedPath, JSON.stringify(processedData, null, 2));
          
          console.log('✅ HTML processed and chunked successfully');
        } catch (processingError) {
          console.error('⚠️ Error processing HTML:', processingError);
          // Continue with saving other files even if processing fails
        }
      }
      
      // Save metadata
      const metadata = {
        timestamp: captureTimestamp,
        url,
        title,
        area,
        captureTime: Date.now() - captureStartTime,
        cleanedDataPath: cleanedDataDir,
        hasProcessedVersion: fs.existsSync(processedPath),
        hasCleanedVersion: fs.existsSync(cleanedHtmlPath),
        hasScreenshot: fs.existsSync(cleanedImagePath)
      };
      fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

      // Get capture counts
      const captureFiles = fs.readdirSync(captureDir);
      const captureCount = Math.floor(captureFiles.length / 3); // Original files (jpg, html, json)
      
      console.log(`✅ Saved capture #${captureCount} to:`);
      console.log('📁 Original files:');
      console.log(`   - Image: ${path.basename(imagePath)}`);
      console.log(`   - HTML: ${path.basename(htmlPath)}`);
      console.log(`   - Metadata: ${path.basename(metaPath)}`);
      console.log('📁 Cleaned data:');
      console.log(`   - Screenshot: screenshot.jpg`);
      console.log(`   - Cleaned HTML: cleaned.html`);
      console.log(`   - Processed JSON: processed.json`);
      console.log(`⏱️ Processing took ${Date.now() - captureStartTime}ms`);
    console.log('----------------------------------');

    } catch (processingError) {
      console.error('⚠️ Error processing capture after response sent:', processingError);
    }
  } catch (error) {
    console.error('⚠️ SERVER ERROR:', error);
    // If we haven't sent a response yet, send an error
    if (!res.headersSent) {
    res.status(500).json({ error: 'Server error processing request' });
    }
  }
});

// Endpoint to handle automatically capturing a page every X seconds
app.post('/auto-capture', async (req, res) => {
  try {
    // Get the URL to capture and interval (default 2 seconds)
    const { url, interval = 2000 } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!isCapturing || !activeSessionId) {
      return res.status(400).json({ error: 'No active capture session. Start a session first.' });
    }
    
    // Check if we already have an interval running
    if (captureInterval) {
      clearInterval(captureInterval);
      console.log('🔄 Cleared existing capture interval');
    }
    
    console.log(`🔄 Setting up auto-capture for ${url} every ${interval}ms`);
    
    // Start the interval
    captureInterval = setInterval(async () => {
      // This would be where we'd trigger a capture
      // In a real implementation, we would use puppeteer or similar
      // to automate browser capture
      console.log(`🔄 Auto-capture triggered for ${url}`);
      
      // For now, we're just logging it
    }, interval);
    
    res.json({
      message: 'Auto-capture started',
      sessionId: activeSessionId,
      url,
      interval
    });
  } catch (error) {
    console.error('⚠️ Error setting up auto-capture:', error);
    res.status(500).json({ error: 'Server error setting up auto-capture' });
  }
});

// Add route to get session view page
app.get('/sessions/:sessionId/view', (req, res) => {
  const { sessionId } = req.params;
  res.redirect(`/static/session-view.html?id=${sessionId}`);
});

// Add a simple test endpoint for connectivity checks
app.get('/test', (req, res) => {
  console.log('📡 Received test connection request from client');
  
  // Check the active session state
  const hasActiveSessionId = activeSessionId !== null && activeSessionId !== undefined;
  
  // Detailed session information for debugging
  const sessionStatus = {
    activeSession: activeSessionId || null,
    isCapturing: isCapturing || false,
    canStartNewSession: !hasActiveSessionId,
    sessionInfo: hasActiveSessionId ? {
      id: activeSessionId,
      // Check if the session directory exists
      exists: fs.existsSync(path.join(__dirname, 'captured-images', activeSessionId)),
      // If directory exists, get file count
      fileCount: hasActiveSessionId && 
                fs.existsSync(path.join(__dirname, 'captured-images', activeSessionId)) ? 
                fs.readdirSync(path.join(__dirname, 'captured-images', activeSessionId)).length : 0
    } : null
  };
  
  // Add a timestamp to the response
  const timestamp = Date.now();
  
  // Send a comprehensive response
  res.json({ 
    status: 'online',
    message: 'CloneIT server is running correctly',
    time: new Date(timestamp).toISOString(),
    timestamp,
    ...sessionStatus
  });
});

// Initialize the Groq processor when the server starts
console.log("🤖 Initializing Groq AI Processor...");
initGroqProcessor().catch(err => {
  console.error("❌ Failed to initialize Groq processor:", err);
});

app.use(express.json())

app.post('/add-project', async (req, res) => {
  try {
    const { userId, projectName, imageUrl, prompt, jsonData } = req.body;
    
    const newProject = new Project({
      userId,
      projectName,
      imageUrl,
      prompt,
      jsonData
    });

    await newProject.save();
    res.status(200).send('Project data saved successfully');
  } catch (err) {
    res.status(500).send('Error saving project data');
  }
});

// Register API routes
app.use('/api/history', historyRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`💡 Sessions viewable at http://localhost:${PORT}/sessions`);
});
