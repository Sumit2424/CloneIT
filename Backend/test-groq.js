require("dotenv").config();
const Groq = require("groq-sdk");

// Initialize the Groq client
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testGroqConnection() {
  try {
    console.log("🔄 Testing Groq API connection...");
    console.log("Using API Key:", process.env.GROQ_API_KEY ? "✅ Found" : "❌ Not found");

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content: "Say hello and confirm you're working!"
        }
      ],
      model: "llama3-8b-8192",  // ✅ updated model
      temperature: 0.7,
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content;
    console.log("\n✅ Groq API is working!");
    console.log("Response received:", response);
    console.log("\nAPI Key is valid and connection is successful.");

  } catch (error) {
    console.error("\n❌ Error testing Groq API:");
    console.error("Error message:", error.message);

    if (error.message.includes("api_key")) {
      console.log("\n💡 Your GROQ_API_KEY might be invalid or not properly loaded from .env file");
      console.log("Check that:");
      console.log("1. Your .env file exists in the Backend folder");
      console.log("2. It contains: GROQ_API_KEY=your-api-key");
      console.log("3. The API key is correct");
    }
  }
}

testGroqConnection();
