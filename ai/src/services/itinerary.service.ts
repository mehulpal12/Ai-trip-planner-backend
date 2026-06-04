import { OpenAI } from "openai";
import { generateItineraryPrompt } from "../prompts/itinerary.prompt.js";
import type { ItineraryInput } from "../types/itinerary.types.js";
import { ItineraryOutputSchema } from "../types/itinerary.types.js";
import { CacheService } from "../services/cache.service.js";
import { getItinerary, saveItinerary } from "../client/trip.client.js";

const nvClient = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY || "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", 
});

export async function processItineraryGeneration(
  input: ItineraryInput,
  tripId: string
): Promise<any> {
  const cacheKey = `trip:${tripId}:itinerary`;

  try {
    // ==========================
    // 1. REDIS CHECK
    // ==========================
    const cachedData = await CacheService.get<any>(cacheKey);

    if (cachedData) {
      console.log(`[REDIS HIT] ${cacheKey}`);
      return {
        source: "redis-cache",
        data: cachedData.data || cachedData, // Safety fallback for legacy cache structures
      };
    }
    console.log(`[REDIS MISS] ${cacheKey}`);

    // ==========================
    // 2. DATABASE CHECK
    // ==========================
    let dbResponse = null;
    try {
      dbResponse = await getItinerary(tripId);
    } catch (error: any) {
      // If it's anything other than a 404 (Not Found), it's a real DB issue we should throw
      if (error.response?.status !== 404) {
        throw error;
      }
    }

    // Checking if DB has payload data
    if (dbResponse?.data) {
      console.log(`[DB HIT] Trip ${tripId}`);
      
      const dbItineraryPayload = {
        source: "database",
        data: dbResponse.data.itinerary || dbResponse.data.data, 
      };

      // Warm up the Redis cache for next time (TTL: 1 hour)
      await CacheService.set(cacheKey, dbItineraryPayload, 3600);

      return dbItineraryPayload;
    }
    console.log(`[DB MISS] Trip ${tripId}`);

    // ==========================
    // 3. GENERATE AI (Fallback)
    // ==========================
    console.log(`[AI GENERATION START] Generating itinerary via Gemma for trip ${tripId}`);
    const corePromptText = generateItineraryPrompt(input);

    const combinedPayloadPrompt = `
[SYSTEM DIRECTION]
You are a deterministic backend data orchestration engine.
You must output raw valid JSON only.

[USER REQUEST]
${corePromptText}
`;

    const completion = await nvClient.chat.completions.create({
      model: "google/gemma-2-2b-it",
      messages: [
        {
          role: "user",
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
      throw new Error("NVIDIA API returned empty response");
    }

    const cleanedText = rawContent.replace(/```json|```/g, "").trim();
    const jsonParsed = JSON.parse(cleanedText);
    const validatedItinerary = ItineraryOutputSchema.parse(jsonParsed);

    const finalPayload = {
      source: "nvidia-gemma",
      data: validatedItinerary,
    };

    // ==========================
    // 4. PERSIST TO DB & CACHE
    // ==========================
    // Save to database so future requests hit step 2
    await saveItinerary(tripId, {
      source: "nvidia-gemma",
      data: validatedItinerary,
    });
    console.log(`[DB SAVE] Trip ${tripId}`);

    // Save to Redis cache so future requests hit step 1
    await CacheService.set(cacheKey, finalPayload, 3600);
    console.log(`[REDIS SAVE] ${cacheKey}`);

    return finalPayload;

  } catch (error: any) {
    console.error("[AI Service Error]", error);
    throw new Error(error.message || "Failed to generate itinerary");
  }
}