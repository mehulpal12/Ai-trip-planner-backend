import { env } from "../config/env.js";

import { GoogleGenAI } from "@google/genai";

// Keeps the setup abstract
export const aiProvider = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});