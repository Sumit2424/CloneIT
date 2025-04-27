require('dotenv').config({ path: require("path").resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const { GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar'); // More reliable file watcher
const { log } = require('console');
const mime = require('mime-types'); // For detecting file types

// Get MongoDB URI from environment variables
const MONGO_URI = process.env.MONGO_URI;
console.log('MongoDB URI found:', MONGO_URI ? 'Yes' : 'No'); // Debug logging

// Initialize variables
let gfs;
let uploadMiddleware;
let watcher;

// Queue for processing files
const uploadQueue = [];
let isProcessing = false;

// Track already processed files
const processedFiles = new Set();

// Initialize GridFS
const initGridFS = async () => {
    try {
        console.log('Connecting to MongoDB for GridFS...');
        console.log('Using MongoDB URI:', MONGO_URI ? 'URI found' : 'URI NOT FOUND'); // Debug log
        
        if (!MONGO_URI) {
            throw new Error('MongoDB URI is not defined in your .env file');
        }
        
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        const conn = mongoose.connection;
        
        // Set up connection event handlers
        conn.once('open', () => {
            gfs = new GridFSBucket(conn.db, {
                bucketName: 'uploads',
            });
            console.log('✅ GridFS connected');
            
            // 🚀 Start watching the prompt-store folder for uploads
            watchPromptStore();
        });
        
        conn.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        
        // Create GridFS storage
        const storage = new GridFsStorage({
            url: MONGO_URI,
            file: (req, file) => {
                return { 
                    filename: file.originalname,
                    metadata: {
                        contentType: file.mimetype,
                        uploadDate: new Date(),
                        source: 'gridUploader'
                    }
                };
            },
        });
        
        // Initialize multer upload
        uploadMiddleware = multer({ storage });
        
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize GridFS:', error);
        return false;
    }
};

// Get metadata for a file
function getFileMetadata(filePath) {
    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mime.lookup(ext) || 'application/octet-stream';
    
    // Extract parent directory name for categorizing
    const parentDir = path.basename(path.dirname(filePath));
    
    return {
        filename,
        contentType,
        fileSize: stats.size,
        uploadDate: new Date(),
        parentDirectory: parentDir,
        ext: ext.replace('.', ''),
        fileType: getFileType(ext),
        path: filePath
    };
}

// Get the type of file based on extension
function getFileType(ext) {
    const extension = ext.toLowerCase().replace('.', '');
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
        return 'image';
    } else if (['json'].includes(extension)) {
        return 'json';
    } else if (['txt', 'md', 'html', 'css', 'js'].includes(extension)) {
        return 'text';
    } else {
        return 'other';
    }
}

// Process the queue
async function processQueue() {
    if (isProcessing || uploadQueue.length === 0) return;
    
    isProcessing = true;
    console.log(`⏳ Processing queue: ${uploadQueue.length} files remaining`);
    
    try {
        const filePath = uploadQueue.shift();
        
        // Don't reprocess files
        if (processedFiles.has(filePath)) {
            console.log(`⏭️ Skipping already processed file: ${path.basename(filePath)}`);
            isProcessing = false;
            setImmediate(processQueue);
            return;
        }
        
        // Skip non-existent files
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ File no longer exists: ${filePath}`);
            isProcessing = false;
            setImmediate(processQueue);
            return;
        }
        
        console.log(`📄 Processing file: ${path.basename(filePath)}`);
        
        // Get file metadata
        const metadata = getFileMetadata(filePath);
        console.log(`📝 File type: ${metadata.fileType}, Size: ${Math.round(metadata.fileSize/1024)}KB`);
        
        // Upload to GridFS
        await uploadFileToGridFS(filePath, metadata);
        
        // Mark as processed
        processedFiles.add(filePath);
        
        // Process next in queue
        isProcessing = false;
        setImmediate(processQueue);
    } catch (error) {
        console.error('❌ Error processing queue:', error);
        isProcessing = false;
        setImmediate(processQueue);
    }
}

// Upload file to GridFS with proper metadata
const uploadFileToGridFS = async (filePath, metadata) => {
    return new Promise((resolve, reject) => {
        try {
            if (!gfs) {
                console.error('❌ GridFS not initialized.');
                reject(new Error('GridFS not initialized'));
                return;
            }
            
            if (!fs.existsSync(filePath)) {
                console.error(`❌ File doesn't exist: ${filePath}`);
                reject(new Error(`File doesn't exist: ${filePath}`));
                return;
            }
            
            console.log(`⬆️ Starting upload of ${metadata.filename} to MongoDB`);
            
            // Create upload stream with metadata
            const uploadStream = gfs.openUploadStream(metadata.filename, {
                metadata: {
                    contentType: metadata.contentType,
                    fileSize: metadata.fileSize,
                    fileType: metadata.fileType,
                    parentDirectory: metadata.parentDirectory,
                    uploadDate: metadata.uploadDate,
                    originalPath: filePath
                }
            });
            
            // Create read stream from file
            const readStream = fs.createReadStream(filePath);
            
            // Pipe data from file to GridFS
            readStream
                .pipe(uploadStream)
                .on('error', (err) => {
                    console.error(`❌ Upload failed for ${metadata.filename}:`, err);
                    reject(err);
                })
                .on('finish', () => {
                    console.log(`✅ Uploaded to MongoDB: ${metadata.filename} (${metadata.fileType})`);
                    
                    // Move file to 'done' directory while preserving folder structure
                    try {
                        const promptStorePath = path.resolve(__dirname, '../ai-processor/prompt-store');
                        const relativePath = path.relative(promptStorePath, path.dirname(filePath));
                        
                        // Create the same directory structure inside the done folder
                        const targetDoneDir = path.join(promptStorePath, 'done', relativePath);
                        if (!fs.existsSync(targetDoneDir)) {
                            fs.mkdirSync(targetDoneDir, { recursive: true });
                            console.log(`📁 Created done directory structure: ${targetDoneDir}`);
                        }
                        
                        const destPath = path.join(targetDoneDir, metadata.filename);
                        fs.renameSync(filePath, destPath);
                        console.log(`📦 Moved to done: ${relativePath}/${metadata.filename}`);
                    } catch (moveErr) {
                        console.error(`⚠️ Couldn't move file to done: ${moveErr.message}`);
                        // Continue even if move fails
                    }
                    
                    resolve(uploadStream.id);
                });
        } catch (err) {
            console.error(`❌ Error setting up upload: ${err.message}`);
            reject(err);
        }
    });
};

// Watch the prompt-store directory for new files
const watchPromptStore = () => {
    const promptStorePath = path.resolve(__dirname, '../ai-processor/prompt-store');
    const doneBasePath = path.join(promptStorePath, 'done');
    
    // Ensure base directories exist
    if (!fs.existsSync(promptStorePath)) {
        fs.mkdirSync(promptStorePath, { recursive: true });
        console.log(`📁 Created directory: ${promptStorePath}`);
    }
    
    if (!fs.existsSync(doneBasePath)) {
        fs.mkdirSync(doneBasePath, { recursive: true });
        console.log(`📁 Created done directory: ${doneBasePath}`);
    }
    
    // Create a test file to verify the watcher works
    const testFilePath = path.join(promptStorePath, 'test-file.txt');
    try {
        fs.writeFileSync(testFilePath, `Test file created at ${new Date().toISOString()}`);
        console.log(`📄 Created test file: ${testFilePath}`);
    } catch (err) {
        console.error(`❌ Failed to create test file: ${err.message}`);
    }
    
    console.log(`🔍 Watching prompt-store directory and all subfolders: ${promptStorePath}`);
    
    // Find all files that should be processed first
    const processFiles = [];
    const findFiles = (dir) => {
        try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
                const fullPath = path.join(dir, file.name);
                if (file.isDirectory()) {
                    if (file.name !== 'done' && file.name !== 'node_modules' && file.name !== '.git') {
                        findFiles(fullPath);
                    }
                } else {
                    const ext = path.extname(fullPath).toLowerCase();
                    const fileType = getFileType(ext);
                    if (['image', 'json', 'text'].includes(fileType)) {
                        processFiles.push(fullPath);
                    }
                }
            }
        } catch (err) {
            console.error(`❌ Error reading directory ${dir}: ${err.message}`);
        }
    };
    
    try {
        findFiles(promptStorePath);
        if (processFiles.length > 0) {
            console.log(`🔍 Found ${processFiles.length} existing files to process:`);
            processFiles.forEach(file => {
                console.log(`   - ${path.relative(promptStorePath, file)}`);
                
                // Add files to the processing queue
                uploadQueue.push(file);
            });
            // Start processing the queue immediately
            processQueue();
        } else {
            console.log('📂 No existing files to process, will watch for new ones.');
        }
    } catch (error) {
        console.error('❌ Error scanning directory:', error);
    }
    
    // Reset options to use native fs.watch for better Windows compatibility
    const useNativeWatcher = process.platform === 'win32';
    
    // Initialize chokidar watcher with better options for Windows
    watcher = chokidar.watch(promptStorePath, {
        ignored: [
            /(^|[\/\\])\../,          // Ignore dotfiles
            '**/done/**',             // Ignore done directory
            '**/node_modules/**',     // Ignore node_modules
            '**/.git/**'              // Ignore git directory
        ],
        persistent: true,
        depth: 5,                     // Increased depth to watch deeper nested directories
        ignoreInitial: true,          // CHANGED: Don't process existing files (we already did that)
        usePolling: useNativeWatcher, // Use polling on Windows
        interval: 1000,               // Check for changes every second
        binaryInterval: 3000,         // Binary file check interval
        awaitWriteFinish: {
            stabilityThreshold: 2000, // Increased time to ensure file is completely written
            pollInterval: 500
        },
        alwaysStat: true              // Get file stats with events
    });
    
    // Event handlers
    watcher
        .on('add', (filePath, stats) => {
            // Skip done directories
            if (filePath.includes('/done/') || filePath.includes('\\done\\')) {
                return;
            }
            
            // Log file detection
            console.log(`📝 New file detected: ${filePath}`);
            
            // Check if it's a file we want to process
            const ext = path.extname(filePath).toLowerCase();
            const fileType = getFileType(ext);
            
            if (['image', 'json', 'text'].includes(fileType)) {
                console.log(`🔍 Queueing new file: ${path.basename(filePath)} (${fileType}) in ${path.dirname(filePath)}`);
                
                // Add to processing queue
                uploadQueue.push(filePath);
                processQueue();
            }
        })
        .on('error', error => console.error(`❌ Watcher error: ${error}`))
        .on('ready', () => {
            console.log(`🔍 Initial scan complete. Ready to detect new files in ${promptStorePath}`);
        });
        
    // Log some useful information about the environment
    console.log(`📊 Environment info:`);
    console.log(`   - Platform: ${process.platform}`);
    console.log(`   - Node.js: ${process.version}`);
    console.log(`   - Working directory: ${process.cwd()}`);
    console.log(`   - Prompt store path: ${promptStorePath}`);
};

// Cleanup function
const cleanup = async () => {
    if (watcher) {
        await watcher.close();
        console.log('🔍 File watcher closed');
    }
    
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await cleanup();
    process.exit(0);
});

// Export functions and variables
module.exports = {
    initGridFS,
    get upload() { return uploadMiddleware; },
    get gfs() { return gfs; },
    cleanup
};

// If this file is run directly (not required as a module)
if (require.main === module) {
    console.log('🚀 Starting GridFS uploader in standalone mode...');
    
    // Install missing npm packages if needed
    if (!fs.existsSync(path.join(__dirname, 'node_modules/mime-types'))) {
        console.log('📦 Installing required npm packages...');
        try {
            const { execSync } = require('child_process');
            execSync('npm install mime-types', { cwd: __dirname });
            console.log('✅ Installed mime-types package');
        } catch (error) {
            console.warn('⚠️ Failed to install mime-types. Please run: npm install mime-types');
        }
    }
    
    // Initialize GridFS
    initGridFS().then(result => {
        if (result) {
            console.log('✅ GridFS initialized successfully in standalone mode');
            console.log('👀 Watching for files to upload...');
        } else {
            console.error('❌ Failed to initialize GridFS in standalone mode');
            process.exit(1);
        }
    }).catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
}


