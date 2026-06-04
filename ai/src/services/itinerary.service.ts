import { OpenAI } from "openai";
import crypto from "crypto";
import { generateItineraryPrompt } from "../prompts/itinerary.prompt.js";
import type { ItineraryInput } from "../types/itinerary.types.js";
import { ItineraryOutputSchema } from "../types/itinerary.types.js";
import { CacheService } from "../services/cache.service.js";
import { getItinerary, saveItinerary } from "../client/trip.client.js";
import { config } from "dotenv";
config();
const nvClient = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY, 
});

function generateInputHash(input: ItineraryInput): string {
  const sortedString = JSON.stringify(input, Object.keys(input).sort());
  return crypto.createHash("sha256").update(sortedString).digest("hex");
}

export async function processItineraryGeneration(
  input: ItineraryInput,
  tripId: string
): Promise<any> {
  const inputHash = generateInputHash(input);
  const cacheKey = `trip:${tripId}:input:${inputHash}:itinerary`;

  try {
    // ==========================
    // 1. REDIS CHECK
    // ==========================
    const cachedData = await CacheService.get<any>(cacheKey);
    if (cachedData) {
      console.log(`[REDIS HIT] ${cacheKey}`);
      return { source: "redis-cache", data: cachedData.data };
    }
    console.log(`[REDIS MISS] ${cacheKey}`);

    // ==========================
    // 2. MICROSERVICE / DB CHECK
    // ==========================
    let dbResponse = null;
    try {
      dbResponse = await getItinerary(tripId, inputHash);
    } catch (error: any) {
      if (error.response?.status !== 404) throw error;
    }

    // If the controller returns a value, it verified the input hash match
    if (dbResponse?.itinerary) {
      console.log(`[DB HIT] Trip ${tripId}`);
      const dbPayload = { source: "database", data: dbResponse.itinerary };
      
      await CacheService.set(cacheKey, dbPayload, 3600);
      return dbPayload;
    }
    console.log(`[DB MISS OR HASH MISMATCH] Trip ${tripId}`);

    // ==========================
    // 3. GENERATE VIA LLM ENGINE
    // ==========================
    console.log(`[AI GENERATION] Input configuration altered. Executing Gemma-2...`);
    const corePromptText = generateItineraryPrompt(input);
    const combinedPayloadPrompt = `\n[SYSTEM DIRECTION]\nYou are a deterministic backend data orchestration engine.\nYou must output raw valid JSON only.\n\n[USER REQUEST]\n${corePromptText}\n`;

    const completion = await nvClient.chat.completions.create({
      model: "google/gemma-2-2b-it",
      messages: [{ role: "user", content: combinedPayloadPrompt }],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 2048,
      stream: false,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) throw new Error("NVIDIA API returned empty response");

    const cleanedText = rawContent.replace(/```json|```/g, "").trim();
    const validatedItinerary = ItineraryOutputSchema.parse(JSON.parse(cleanedText));

    const clientPayload = { source: "nvidia-gemma", data: validatedItinerary };

    // ==========================
    // 4. PERSIST NEW DATA VARIANT
    // ==========================
    await saveItinerary(tripId, validatedItinerary, inputHash);
    console.log(`[DB UPSERT SUCCESS] Synchronized input config ${inputHash}`);

    await CacheService.set(cacheKey, clientPayload, 3600);
    console.log(`[REDIS WARMUP] Saved key ${cacheKey}`);

    return clientPayload;

  } catch (error: any) {
    console.error("[AI Service Pipeline Failure]", error);
    throw new Error(error.message || "Failed to process target itinerary lifecycle step.");
  }
}