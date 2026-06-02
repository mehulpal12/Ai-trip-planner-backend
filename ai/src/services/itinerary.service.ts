import { OpenAI } from "openai";
import { generateItineraryPrompt } from "../prompts/itinerary.prompt.js";
import type { ItineraryInput, ItineraryOutput } from "../types/itinerary.types.js";
import { ItineraryOutputSchema } from "../types/itinerary.types.js";
import { CacheService } from "../services/cache.service.js";
import { generateItineraryCacheKey } from "../utils/cache.js";

const nvClient = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY || "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",
});

export async function processItineraryGeneration(input: ItineraryInput): Promise<any> {
  const cacheKey = generateItineraryCacheKey(
    input.destination,
    input.days,
    input.budget,
    input.travelStyle
  );

  try {
    // 1. Check Redis Cache First
    const cachedItinerary = await CacheService.get<ItineraryOutput>(cacheKey);

    if (cachedItinerary) {
      console.log(`[REDIS HIT] ${cacheKey}`);
      return {
        source: "redis",
        data: cachedItinerary,
      };
    }

    // 2. Cache Miss - Proceed to call NVIDIA Hosted Gemma-2 Model
    console.log(`[REDIS MISS] ${cacheKey}`);
    const corePromptText = generateItineraryPrompt(input);

    // Combine system and user context into a single user message block
    const combinedPayloadPrompt = `[SYSTEM DIRECTION]
You are a deterministic backend data orchestration engine. You must output raw, structurally valid JSON matching the requested structure perfectly. Do not include markdown formatting, markdown backticks (\`\`\`), or conversational prose.

[USER REQUEST]
${corePromptText}`;

    const completion = await nvClient.chat.completions.create({
      model: "google/gemma-2-2b-it",
      messages: [
        {
          role: "user", // ✅ Only use 'user' role to prevent 500 endpoint errors
          content: combinedPayloadPrompt,
        },
      ],
      temperature: 0.2, 
      top_p: 0.7,
      max_tokens: 2048, 
      stream: false,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("NVIDIA API endpoint returned an empty completion message content segment.");
    }

    // Clean up any stray markdown code fencing blocks (```json ... ```) if the model bleeds them
    const cleanedText = rawContent.replace(/```json|```/g, "").trim();
    const jsonParsed = JSON.parse(cleanedText);
    
    // Validate the raw object against your Zod structural requirements
    const validatedItinerary = ItineraryOutputSchema.parse(jsonParsed);

    // 3. Store the freshly generated itinerary in Redis for 1 hour (3600 seconds)
    await CacheService.set(cacheKey, validatedItinerary, 3600);

    return {
      source: "nvidia-gemma",
      data: validatedItinerary,
    };

  } catch (error: any) {
    console.error("[AI Service Error] Operations pipeline processing failure:", error);
    throw new Error(error.message || "Failed to generate a valid itinerary structure. Please try again.");
  }
}