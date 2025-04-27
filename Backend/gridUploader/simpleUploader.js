/**
 * Simple GridFS Uploader Script for Windows
 * - Scans the prompt-store directory and uploads files to MongoDB
 * - Designed to work reliably on Windows systems
 * - Provides detailed console output for debugging
 */

// Load environment variables
require('dotenv').config({ path: require("path").resolve(__dirname, '../../.env') });

// Import required modules
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Get MongoDB URI from environment variables
const MONGO_URI = process.env.MONGO_URI;
console.log('MongoDB URI found:', MONGO_URI ? 'Yes' : 'No'); 

// Prompt store path
const PROMPT_STORE_PATH = path.resolve(__dirname, '../ai-processor/prompt-store');
console.log(`Prompt store path: ${PROMPT_STORE_PATH}`);

// Global variables
let gfs;

// Main function
async function main() {
    try {
        console.log('Starting simple GridFS uploader...');
        
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        // Initialize GridFS
        const conn = mongoose.connection;
        gfs = new GridFSBucket(conn.db, {
            bucketName: 'uploads'
        });
        console.log('✅ GridFS initialized');
        
        // Find all files in prompt-store directory
        console.log('Scanning prompt-store directory for files...');
        const files = await scanDirectory(PROMPT_STORE_PATH);
        
        if (files.length === 0) {
            console.log('No files found to upload.');
            return;
        }
        
        console.log(`Found ${files.length} files to upload:`);
        files.forEach((file, index) => {
            console.log(`${index + 1}. ${path.relative(PROMPT_STORE_PATH, file)}`);
        });
        
        // Upload each file
        console.log('Starting uploads...');
        for (const file of files) {
            await uploadFile(file);
        }
        
        console.log('✅ All uploads complete');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        // Close MongoDB connection
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('MongoDB connection closed');
        }
    }
}

// Scan directory recursively for files
async function scanDirectory(dir) {
    const results = [];
    
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            // Skip done directory
            if (entry.isDirectory() && entry.name === 'done') {
                continue;
            }
            
            if (entry.isDirectory()) {
                // Recursively scan subdirectories
                const subDirFiles = await scanDirectory(fullPath);
                results.push(...subDirFiles);
            } else {
                // Only include files with these extensions
                const ext = path.extname(fullPath).toLowerCase();
                if (['.txt', '.json', '.jpg', '.jpeg', '.png', '.html'].includes(ext)) {
                    results.push(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
    }
    
    return results;
}

// Upload a single file to GridFS
async function uploadFile(filePath) {
    return new Promise((resolve, reject) => {
        const filename = path.basename(filePath);
        const relativePath = path.relative(PROMPT_STORE_PATH, filePath);
        
        console.log(`Uploading ${relativePath}...`);
        
        try {
            const readStream = fs.createReadStream(filePath);
            const uploadStream = gfs.openUploadStream(filename, {
                metadata: {
                    originalPath: filePath,
                    uploadDate: new Date(),
                    relativePath: relativePath
                }
            });
            
            readStream.pipe(uploadStream)
                .on('error', (err) => {
                    console.error(`❌ Error uploading ${filename}:`, err);
                    reject(err);
                })
                .on('finish', () => {
                    console.log(`✅ Uploaded: ${filename}`);
                    
                    // Move file to done directory
                    try {
                        const donePath = path.join(PROMPT_STORE_PATH, 'done');
                        if (!fs.existsSync(donePath)) {
                            fs.mkdirSync(donePath, { recursive: true });
                        }
                        
                        // Create subdirectory in done to match original structure
                        const relativeDir = path.dirname(relativePath);
                        if (relativeDir !== '.') {
                            const targetDir = path.join(donePath, relativeDir);
                            if (!fs.existsSync(targetDir)) {
                                fs.mkdirSync(targetDir, { recursive: true });
                            }
                        }
                        
                        const destPath = path.join(
                            donePath, 
                            relativeDir === '.' ? filename : path.join(relativeDir, filename)
                        );
                        
                        fs.renameSync(filePath, destPath);
                        console.log(`📦 Moved to: ${path.relative(PROMPT_STORE_PATH, destPath)}`);
                    } catch (moveErr) {
                        console.error(`⚠️ Couldn't move file:`, moveErr);
                    }
                    
                    resolve();
                });
        } catch (err) {
            console.error(`❌ Error setting up upload for ${filename}:`, err);
            reject(err);
        }
    });
}

// Run the main function
main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
}); 