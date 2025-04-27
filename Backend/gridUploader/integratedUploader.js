/**
 * Integrated GridFS Uploader
 * - Uploads files to MongoDB GridFS
 * - Links files to Project models
 * - Preserves folder structure for organization
 */

// Load environment variables
require('dotenv').config({ path: require("path").resolve(__dirname, '../../.env') });

// Import required modules
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Import Project model
const Project = require('../Database/models/Project');

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
        console.log('Starting integrated uploader...');
        
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
        
        // Group files by folder for project organization
        const filesByFolder = groupFilesByFolder(files);
        
        // Create/update projects and upload files
        for (const [folderName, folderFiles] of Object.entries(filesByFolder)) {
            await processFilesAsProject(folderName, folderFiles);
        }
        
        console.log('✅ All uploads and project updates complete');
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

// Group files by their containing folder for project organization
function groupFilesByFolder(files) {
    const filesByFolder = {};
    
    for (const file of files) {
        // Get the relative path from the prompt-store directory
        const relativePath = path.relative(PROMPT_STORE_PATH, file);
        
        // Determine project name from folder structure
        const parts = relativePath.split(path.sep);
        let projectName;
        
        if (parts.length > 1) {
            // If file is in a subfolder, use the folder name as project name
            projectName = parts[0];
        } else {
            // If file is in the root folder, use 'default' as project name
            projectName = 'default';
        }
        
        if (!filesByFolder[projectName]) {
            filesByFolder[projectName] = [];
        }
        
        filesByFolder[projectName].push(file);
    }
    
    return filesByFolder;
}

// Process a group of files as a project
async function processFilesAsProject(folderName, files) {
    console.log(`\n📁 Processing project from folder: ${folderName}`);
    
    // Create or retrieve project
    let project = await Project.findOne({ projectName: folderName });
    
    if (!project) {
        console.log(`🆕 Creating new project: ${folderName}`);
        project = new Project({
            projectName: folderName,
            userID: 'system', // Default userID for system-generated projects
            status: 'imported',
            timeStamp: new Date()
        });
    } else {
        console.log(`🔄 Updating existing project: ${folderName}`);
    }
    
    // Process all files for this project
    for (const file of files) {
        const fileId = await uploadFile(file, project);
        if (fileId) {
            console.log(`🔗 Linked file ${path.basename(file)} to project ${folderName}`);
        }
    }
    
    // Save the updated project
    await project.save();
    console.log(`💾 Saved project ${folderName} with ${project.files.length} files`);
    
    return project;
}

// Upload a single file to GridFS and link to project
async function uploadFile(filePath, project) {
    return new Promise((resolve, reject) => {
        const filename = path.basename(filePath);
        const relativePath = path.relative(PROMPT_STORE_PATH, filePath);
        const ext = path.extname(filePath).toLowerCase();
        const stats = fs.statSync(filePath);
        const contentType = mime.lookup(ext) || 'application/octet-stream';
        
        // Map extension to file type category
        const fileType = getFileType(ext);
        
        console.log(`Uploading ${relativePath}... (${fileType}, ${Math.round(stats.size/1024)} KB)`);
        
        try {
            const readStream = fs.createReadStream(filePath);
            const uploadStream = gfs.openUploadStream(filename, {
                metadata: {
                    projectName: project.projectName,
                    originalPath: filePath,
                    uploadDate: new Date(),
                    relativePath: relativePath,
                    contentType: contentType,
                    fileType: fileType
                }
            });
            
            // Track if the file has specific content types for project metadata
            if (ext === '.json') {
                try {
                    const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    project.jsonData = jsonContent;
                } catch (parseErr) {
                    console.warn(`⚠️ Could not parse JSON for ${filename}: ${parseErr.message}`);
                }
            }
            
            // If this is an image file, store its URL as the project's imageUrl
            if (['.jpg', '.jpeg', '.png'].includes(ext) && !project.imageUrl) {
                project.imageUrl = `/api/files/${project.projectName}/${filename}`;
            }
            
            readStream.pipe(uploadStream)
                .on('error', (err) => {
                    console.error(`❌ Error uploading ${filename}:`, err);
                    reject(err);
                })
                .on('finish', () => {
                    console.log(`✅ Uploaded: ${filename}`);
                    
                    // Add file reference to the project
                    const fileReference = {
                        fileId: uploadStream.id,
                        filename: filename,
                        fileType: fileType,
                        relativePath: relativePath,
                        contentType: contentType,
                        size: stats.size,
                        uploadDate: new Date()
                    };
                    
                    // Add to the project's files array (avoid duplicates)
                    const existingFileIndex = project.files.findIndex(f => 
                        f.filename === filename && f.relativePath === relativePath);
                    
                    if (existingFileIndex >= 0) {
                        project.files[existingFileIndex] = fileReference;
                    } else {
                        project.files.push(fileReference);
                    }
                    
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
                    
                    resolve(uploadStream.id);
                });
        } catch (err) {
            console.error(`❌ Error setting up upload for ${filename}:`, err);
            reject(err);
        }
    });
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

// Run the main function
main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
}); 