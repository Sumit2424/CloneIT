require("dotenv").config();
import express, { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as reactBasePrompt } from "./defaults/react";
import cors from "cors";
import multer from "multer";

// Define types for multer request
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Configure multer for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 🌐 New Request:`);
  console.log(`📍 ${req.method} ${req.url}`);
  console.log(`🔍 Origin: ${req.headers.origin}`);
  next();
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.post("/template", async (req, res) => {
    const prompt = req.body.prompt;
    console.log(`\n📝 Template Request Received:`);
    console.log(`💭 Prompt: "${prompt}"`);

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: {
            role: "system",
            parts: [{
                text: "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra"
            }]
        },
        generationConfig: {
            maxOutputTokens: 200,
        }
    });

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        });

        const answer = (await result.response.text()).trim().toLowerCase();

        if (answer === "react") {
            res.json({
                prompts: [
                    BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`
                ],
                uiPrompts: [reactBasePrompt]
            });
            return;
        }

        if (answer === "node") {
            res.json({
                prompts: [
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`
                ],
                uiPrompts: [nodeBasePrompt]
            });
            return;
        }

        res.status(403).json({ message: "You can't access this" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong" });
    }
});

app.post("/chat", async (req, res) => {
    const messages = req.body.messages;
    console.log(`\n💬 Chat Request Received:`);
    console.log(`📨 Number of messages: ${messages.length}`);
    console.log(`📝 Last message: "${messages[messages.length - 1].content}"`);

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: {
            role: "system",
            parts: [{ text: getSystemPrompt() }]
        },
        generationConfig: {
            maxOutputTokens: 8000,
        }
    });

    try {
        const contents = messages.map((msg: any) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
        }));

        const result = await model.generateContent({ contents });
        const responseText = await result.response.text();

        res.json({
            response: responseText
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong" });
    }
});

// Image analysis endpoint
app.post("/analyze-image", upload.single('image'), async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No image file provided" });
      return;
    }

    const prompt = req.body.prompt || ''; // Get the prompt from request body

    console.log(`\n🖼️ Image Analysis Request Received:`);
    console.log(`📁 File name: ${req.file.originalname}`);
    console.log(`📏 File size: ${req.file.size} bytes`);
    console.log(`📎 File type: ${req.file.mimetype}`);
    console.log(`📝 Prompt: ${prompt}`);

    // Convert the buffer to base64
    const imageBase64 = req.file.buffer.toString('base64');

    // Create a model instance that can process images
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    // Analyze the image with the prompt context
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: imageBase64
        }
      },
      {
        text: `You are a UI/UX expert. Analyze this website screenshot and consider the following user prompt: "${prompt}".
Provide a detailed description of:
1. The layout structure (header, sidebar, main content, footer, etc.)
2. Color scheme and typography
3. UI components and their positioning
4. Navigation structure
5. Key features and functionality visible in the image
6. Suggestions for modifications based on the user's prompt

Format the response as a JSON object with these sections as keys. Be specific and detailed, and make sure to address any specific requirements or modifications mentioned in the prompt.`
      }
    ]);

    const response = await result.response.text();
    console.log(`✅ Image and prompt analysis completed`);

    res.json({ 
      analysis: response,
      prompt: prompt 
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).json({ message: "Failed to analyze image" });
  }
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
