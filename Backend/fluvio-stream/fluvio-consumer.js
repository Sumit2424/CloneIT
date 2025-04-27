// Try to import Fluvio but have a fallback
let Fluvio;
try {
  Fluvio = require('@fluvio/client').Fluvio;
} catch (error) {
  console.warn('Fluvio client not available, will use direct Firestore method instead:', error.message);
}

const { db } = require('../firebase/firebaseconfig'); // Import Firestore instance

let isFluvioRunning = false;

async function processPrompt(promptText, offset = null) {
  try {
    // Save prompt to Firestore
    await db.collection('received-prompts').add({
      promptText,
      receivedAt: new Date(),
      fluvioOffset: offset,
    });

    console.log('✅ Prompt saved to Firestore!\n');
  } catch (err) {
    console.error('❌ Error saving prompt to Firestore:', err);
  }
}

async function runFluvioConsumer() {
  try {
    const fluvio = new Fluvio();
    await fluvio.connect();

    const consumer = await fluvio.partitionConsumer('prompts', 0); // 0 = first partition

    console.log('🎧 Fluvio Consumer is running and listening to topic: prompts\n');
    isFluvioRunning = true;

    await consumer.stream(async (record) => {
      try {
        const promptText = record.valueString(); // Get the prompt as string
        const offset = record.offset;

        console.log(`📥 New prompt at offset ${offset}:\n${promptText}`);
        
        await processPrompt(promptText, offset);
      } catch (err) {
        console.error('❌ Error processing record:', err);
      }
    });
  } catch (err) {
    console.error('❌ Error running Fluvio consumer:', err);
    isFluvioRunning = false;
    return false;
  }
  return true;
}

// Fallback method: Poll Firestore for new prompts that were directly inserted
async function pollDirectPrompts() {
  // Track the last document we processed to avoid duplicates
  let lastProcessedTimestamp = new Date();
  
  console.log('🔄 Starting direct Firestore polling (Fluvio fallback)\n');
  
  // Poll every 5 seconds
  setInterval(async () => {
    try {
      // Query for documents that:
      // 1. Have the directMethod flag
      // 2. Were created after the last document we processed
      const snapshot = await db
        .collection('received-prompts')
        .where('directMethod', '==', true)
        .where('receivedAt', '>', lastProcessedTimestamp)
        .orderBy('receivedAt', 'asc')
        .limit(10)
        .get();

      if (!snapshot.empty) {
        console.log(`📥 Found ${snapshot.size} new direct prompts in Firestore`);
        
        // Process each document
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`📝 Processing prompt: ${data.promptText.substring(0, 30)}...`);
          
          // Update the timestamp to the most recent document
          if (data.receivedAt && data.receivedAt.toDate() > lastProcessedTimestamp) {
            lastProcessedTimestamp = data.receivedAt.toDate();
          }
        });
      }
    } catch (error) {
      console.error('❌ Error polling Firestore for direct prompts:', error);
    }
  }, 5000);
}

async function main() {
  let fluvioSuccess = false;
  
  if (Fluvio) {
    fluvioSuccess = await runFluvioConsumer();
  }
  
  // If Fluvio isn't available or failed to start, use the direct method
  if (!fluvioSuccess) {
    console.log('⚠️ Fluvio consumer unavailable, falling back to direct Firestore polling');
    await pollDirectPrompts();
  }
}

main().catch((err) => {
  console.error('❌ Error in main process:', err);
});
