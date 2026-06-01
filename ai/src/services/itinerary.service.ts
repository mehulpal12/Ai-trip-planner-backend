import { aiProvider } from "../providers/openai.provider.js";
import { generateItineraryPrompt } from "../prompts/itinerary.prompt.js";
import type { ItineraryInput, ItineraryOutput } from "../types/itinerary.types.js";
import { ItineraryOutputSchema } from "../types/itinerary.types.js";
import { CacheService } from "../services/cache.service.js";
import { generateItineraryCacheKey } from "../utils/cache.js";

/**
 * Orchestrates the travel itinerary generation using Google Gemini with Redis caching.
 * Abstracts the vendor transition completely away from the controller.
 */
export async function processItineraryGeneration(input: ItineraryInput): Promise<any> {
  // Generate the unique cache key based on the input criteria
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

    // 2. Cache Miss - Proceed to call Gemini
    console.log(`[REDIS MISS] ${cacheKey}`);
    const promptText = generateItineraryPrompt(input);

    // Call the Google Gen AI SDK instead of OpenAI
    const response = await aiProvider.models.generateContent({
      model: "gemini-2.5-flash", // Fast, lightweight, and perfect for structured JSON data
      contents: promptText,
      config: {
        // System instructions guide the underlying behavior of the model
        systemInstruction: "You are a deterministic data-serialization backend engine. You output raw JSON objects perfectly matching the requested schema. No markdown formatting blocks.",
        temperature: 0.7,
      }
    });

    // Extract text from the Gemini response payload structure
    const rawText = response.text;
    if (!rawText) {
      throw new Error("AI provider returned an empty response.");
    }

    // Sanitize any accidental markdown code fencing blocks (```json ... ```) 
    const cleanedText = rawText.replace(/```json|```/g, "").trim();
    const jsonParsed = JSON.parse(cleanedText);
    
    // Enforce strict structural schema validation using Zod before returning data
    const validatedItinerary = ItineraryOutputSchema.parse(jsonParsed);

    // 3. Store the freshly generated itinerary in Redis for 1 hour (3600 seconds)
    await CacheService.set(cacheKey, validatedItinerary, 3600);

    return {
      source: "gemini",
      data: validatedItinerary,
    };

  } catch (error: any) {
    console.error("[AI Service Error] Parsing or structural validation failed:", error);
    throw new Error(error.message || "Failed to generate a valid itinerary structure. Please try again.");
  }
}