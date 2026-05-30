import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

async function run() {
  try {
    console.log("Testing with key:", process.env.GEMINI_API_KEY);
    const result = await model.generateContent("Hello, how are you?");
    console.log("Success! Response:", result.response.text());
  } catch (error) {
    console.error("Failed! Error:", error);
  }
}

run();
