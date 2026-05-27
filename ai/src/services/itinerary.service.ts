import { aiProvider } from "../providers/openai.provider.js";
import { generateItineraryPrompt } from "../prompts/itinerary.prompt.js";
import type { ItineraryInput, ItineraryOutput } from "../types/itinerary.types.js";
import { ItineraryOutputSchema } from "../types/itinerary.types.js";

/**
 * Orchestrates the travel itinerary generation using Google Gemini.
 * Abstracts the vendor transition completely away from the controller.
 */
export async function processItineraryGeneration(input: ItineraryInput): Promise<ItineraryOutput> {
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

  try {
    // Sanitize any accidental markdown code fencing blocks (```json ... ```) 
    // that the LLM might have wrapped around its raw output
    const cleanedText = rawText.replace(/```json|```/g, "").trim();
    const jsonParsed = JSON.parse(cleanedText);
    
    // Enforce strict structural schema validation using Zod before returning data
    return ItineraryOutputSchema.parse(jsonParsed);
  } catch (error) {
    console.error("[AI Service Error] Parsing or structural validation failed:", rawText);
    throw new Error("Failed to generate a valid itinerary structure. Please try again.");
  }
}