const fs = require('fs');
const path = require('path');
const { db, storage } = require('../firebase/firebaseconfig'); // Import db and storage from firebaseconfig
const chokidar = require('chokidar');

// Try to import Fluvio but have a fallback
let Fluvio;
let fluvio = null;
let isFluvioAvailable = false;

try {
  Fluvio = require('@fluvio/client').Fluvio;
} catch (error) {
  console.warn('Fluvio client not available, will use direct Firebase method instead:', error.message);
}

const promptStorePath = path.join(__dirname,'../ai-processor/prompt-store')

// console.log(__dirname); 

async function initFluvio() {
  try {
    fluvio = new Fluvio();
    await fluvio.connect();
    isFluvioAvailable = true;
    console.log('Successfully connected to Fluvio');
    return true;
  } catch (error) {
    console.error('Failed to initialize Fluvio, will use direct Firebase method instead:', error.message);
    return false;
  }
}

async function uploadToFirebase(filePath,fileName){
    try{
        const fileRef = storage.bucket().file(`prompts/${fileName}`)
        await fileRef.save(fs.readFileSync(filePath))

        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storage.bucket().name}/o/${encodeURIComponent(fileRef.name)}?alt=media`;
        return publicUrl;

    }catch(error){
        console.error('Error uploading to Firebase:',error);
        throw error;
    }
}

async function saveMetadataToFirebase(fileName, imageUrl) {
    try {
      const promptText = fs.readFileSync(path.join(promptStorePath, fileName.replace('.jpg', '.txt')), 'utf-8');
      
      // Read the associated processed.json if it exists
      const jsonPath = path.join(promptStorePath, fileName.replace('.jpg', '.json'));
      let processedData = null;
      if (fs.existsSync(jsonPath)) {
        processedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      }
  
      // Save all data to Firestore
      await db.collection('prompts').add({
        promptText,
        imageUrl,
        processedData, // Add processed JSON to Firestore
        session: fileName.split('_')[0], // Assuming session is part of the filename
        createdAt: new Date(),
      });
  
      console.log(`Metadata for ${fileName} saved to Firestore.`);
      
      // Return the prompt data to use in direct method if Fluvio fails
      return { promptText, imageUrl, processedData };
    } catch (error) {
      console.error('Error saving metadata to Firestore:', error);
      throw error;
    }
}

// Direct method to send data to Firestore when Fluvio is not available
async function sendDirectToFirestore(promptData) {
  try {
    await db.collection('received-prompts').add({
      promptText: promptData.promptText,
      imageUrl: promptData.imageUrl,
      processedData: promptData.processedData,
      receivedAt: new Date(),
      directMethod: true // Flag to indicate this was sent directly (without Fluvio)
    });
    console.log('Data sent directly to Firestore (Fluvio bypass)');
  } catch (error) {
    console.error('Error sending data directly to Firestore:', error);
  }
}

async function runProducer(){
    // Try to initialize Fluvio, but continue even if it fails
    await initFluvio();
    
    let producer = null;
    
    if (isFluvioAvailable) {
      try {
        producer = await fluvio.topicProducer('prompts');
        console.log('Fluvio producer initialized for topic: prompts');
      } catch (error) {
        console.error('Failed to create Fluvio producer:', error.message);
      }
    }

    chokidar.watch(promptStorePath, { recursive: true }).on('add', async (file) => {
        const fileName = path.basename(file); // Extract the filename from the full path
      
        // If the added file is a .jpg (screenshot image)
        if (file.endsWith('.jpg')) {
          try {
            // Upload the image to Firebase Storage
            const imageUrl = await uploadToFirebase(file, fileName);
      
            // Save metadata (including image URL and processed JSON) to Firestore
            const promptData = await saveMetadataToFirebase(fileName, imageUrl);
      
            // Read the corresponding .txt file (prompt text)
            const content = fs.readFileSync(file.replace('.jpg', '.txt'), 'utf-8');
            
            // Try to send data via Fluvio if available
            if (producer) {
              try {
                await producer.send('prompt-key', content);
                console.log(`Sent prompt data from: ${file} to Fluvio`);
              } catch (fluvioError) {
                console.error('Fluvio send failed, using direct method instead:', fluvioError.message);
                await sendDirectToFirestore(promptData);
              }
            } else {
              // Fall back to direct method if Fluvio producer is not available
              await sendDirectToFirestore(promptData);
            }
            
          } catch (error) {
            console.error('Error processing image', error);
          }
        }
    });
}

runProducer().catch(console.error);

