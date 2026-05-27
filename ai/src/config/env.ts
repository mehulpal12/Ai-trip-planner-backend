import * as dotenv from "dotenv";

dotenv.config();

// 1. Define a TypeScript interface for your environment variables
interface Env {
  PORT: string;
  NODE_ENV: "development" | "production" | "test";
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  JWT_SECRET: string;
}

// 2. Helper function to validate and construct the env object
const validateEnv = (): Env => {
  const errors: string[] = [];

  // Check required variables
  if (!process.env.OPENAI_API_KEY) {
    errors.push("OpenAI API Key is required");
  }
  if (!process.env.GEMINI_API_KEY) {
    errors.push("Gemini API Key is required");
  }
  if (!process.env.JWT_SECRET) {
    errors.push("JWT Secret is required for verifying tokens");
  }

  // Handle allowed enums for NODE_ENV
  const nodeEnv = process.env.NODE_ENV || "development";
  if (!["development", "production", "test"].includes(nodeEnv)) {
    errors.push("NODE_ENV must be either 'development', 'production', or 'test'");
  }

  // If there are any validation errors, crash the app immediately with a clear message
  if (errors.length > 0) {
    console.error("❌ Invalid environment variables:");
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  // 3. Return the validated object with defaults applied
  return {
    PORT: process.env.PORT || "5002",
    NODE_ENV: nodeEnv as "development" | "production" | "test",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
    JWT_SECRET: process.env.JWT_SECRET!,
  };
};

export const env = validateEnv();