const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { db, storage } = require('../firebase/firebaseconfig');

const promptStorePath = path.join(__dirname, '../ai-processor/prompt-store');

console.log('Watching directory:', promptStorePath);

/**
 * Upload an image file to Firebase Storage
 * @param {string} filePath - Path to the image file
 * @param {string} fileName - Name of the file
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
async function uploadImageToStorage(filePath, fileName) {
  try {
    console.log(`Uploading image: ${fileName}`);
    const fileRef = storage.bucket().file(`prompts/${fileName}`);
    await fileRef.save(fs.readFileSync(filePath));

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storage.bucket().name}/o/${encodeURIComponent(fileRef.name)}?alt=media`;
    console.log(`✅ Image uploaded successfully: ${fileName}`);
    return publicUrl;
  } catch (error) {
    console.error(`❌ Error uploading image ${fileName}:`, error);
    throw error;
  }
}

/**
 * Save all metadata to Firestore
 * @param {string} fileName - Base file name (e.g., "image.jpg")
 * @param {string} imageUrl - Public URL of the uploaded image
 * @param {string} promptText - Content of the prompt text file
 * @param {object|null} processedData - Content of the JSON file if available
 */
async function saveToFirestore(fileName, imageUrl, promptText, processedData) {
  try {
    console.log(`Saving metadata to Firestore for: ${fileName}`);
    
    // Add to the prompts collection (original collection used in fluvio code)
    const docRef = await db.collection('prompts').add({
      fileName,
      imageUrl,
      promptText,
      processedData,
      session: fileName.split('_')[0], // Assuming session is part of the filename
      createdAt: new Date(),
      uploadedAt: new Date(),
    });

    // Also add to the received-prompts collection (used by the consumer code)
    await db.collection('received-prompts').add({
      fileName,
      imageUrl,
      promptText,
      processedData,
      receivedAt: new Date(),
      directUpload: true,
    });

    console.log(`✅ Metadata saved to Firestore with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`❌ Error saving metadata to Firestore for ${fileName}:`, error);
    throw error;
  }
}

/**
 * Process a set of related files (image, text, and optional JSON)
 * @param {string} imagePath - Path to the image file
 */
async function processFileSet(imagePath) {
  const fileName = path.basename(imagePath);
  const baseName = fileName.replace('.jpg', '');
  const textPath = imagePath.replace('.jpg', '.txt');
  const jsonPath = imagePath.replace('.jpg', '.json');

  console.log(`Processing file set for: ${fileName}`);
  console.log(`- Image: ${fs.existsSync(imagePath) ? '✓' : '✗'}`);
  console.log(`- Text: ${fs.existsSync(textPath) ? '✓' : '✗'}`);
  console.log(`- JSON: ${fs.existsSync(jsonPath) ? '✓' : '✗'}`);

  try {
    // Check if text file exists
    if (!fs.existsSync(textPath)) {
      console.error(`❌ Text file missing for ${fileName}`);
      return;
    }

    // Upload image to Firebase Storage
    const imageUrl = await uploadImageToStorage(imagePath, fileName);

    // Read text content
    const promptText = fs.readFileSync(textPath, 'utf-8');
    
    // Read JSON if available
    let processedData = null;
    if (fs.existsSync(jsonPath)) {
      try {
        processedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      } catch (jsonError) {
        console.error(`❌ Error parsing JSON for ${fileName}:`, jsonError);
      }
    }

    // Save everything to Firestore
    await saveToFirestore(fileName, imageUrl, promptText, processedData);
    
    console.log(`✅ Successfully processed complete file set for: ${fileName}`);
  } catch (error) {
    console.error(`❌ Error processing file set for ${fileName}:`, error);
  }
}

/**
 * Retrieve and display public URLs from Firestore
 * Use this function to see all your image URLs
 */
async function listStoredImageUrls() {
  try {
    console.log('Retrieving stored image URLs from Firestore...');
    const snapshot = await db.collection('prompts').get();
    
    if (snapshot.empty) {
      console.log('No documents found in prompts collection');
      return;
    }
    
    console.log('--- IMAGE URLS FROM FIRESTORE ---');
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Document ID: ${doc.id}`);
      console.log(`Filename: ${data.fileName || 'N/A'}`);
      console.log(`Public image URL: ${data.imageUrl}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error retrieving image URLs:', error);
  }
}

/**
 * Initialize the file watcher
 */
function initWatcher() {
  console.log('🔍 Starting file watcher...');
  
  // Watch the directory for new files
  const watcher = chokidar.watch(promptStorePath, {
    persistent: true,
    ignoreInitial: false, // Process existing files on startup
    awaitWriteFinish: true, // Wait until files are fully written
    recursive: true // Watch subdirectories too
  });

  // Handle new or existing files
  watcher.on('add', async (filePath) => {
    console.log(`File detected: ${filePath}`);
    
    // Only process JPG files - the rest will be handled as part of the set
    if (filePath.endsWith('.jpg')) {
      await processFileSet(filePath);
    }
  });

  // Log watcher errors
  watcher.on('error', (error) => {
    console.error('❌ Watcher error:', error);
  });

  // Log when watcher is ready
  watcher.on('ready', () => {
    console.log('👀 Initial scan complete. Watching for new files...');
  });
}

// Start the watcher
initWatcher();

console.log('🚀 Firebase uploader started');

// To get all stored image URLs, uncomment and run this function
// listStoredImageUrls().catch(console.error); 