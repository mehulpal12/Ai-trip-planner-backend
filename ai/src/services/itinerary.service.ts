import { OpenAI } from "openai";
import crypto from "crypto";
import { generateItineraryPrompt } from "../prompts/itinerary.prompt.js";
import type { ItineraryInput } from "../types/itinerary.types.js";
import { ItineraryOutputSchema } from "../types/itinerary.types.js";
import { CacheService } from "./cache.service.js";
import { getItinerary, saveItinerary } from "../client/trip.client.js";
import { config } from "dotenv";

config();

const nvClient = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});

export function generateInputHash(input: ItineraryInput): string {
  const sortedString = JSON.stringify(input, Object.keys(input).sort());
  return crypto.createHash("sha256").update(sortedString).digest("hex");
}

/**
 * BACKGROUND PROCESSING SYSTEM: Executed completely out-of-band inside the BullMQ Worker.
 * Handles the actual execution of Redis checks, DB fallbacks, and NVIDIA AI generation.
 */
// Helper utility to safely sanitize, balance, and parse LLM JSON responses
function cleanAndRecoverAIJson(rawText: string): any {
  let cleaned = rawText.trim();

  // 1. Remove Markdown code fence markers if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  }

  try {
    // Attempt normal parse
    return JSON.parse(cleaned);
  } catch (initialError: any) {
    console.warn(`[JSON PARSE ATTEMPT 1 FAILED] Error position: ${initialError.message}. Initiating aggressive sanitize pipeline...`);
    
    try {
      // 2. High-Fidelity Pre-Parsing Sanitization Loop
      let sanitized = cleaned.replace(
        /(?<=:\s*\[?\s*")(.+?)(?="\s*\]?[\s,}\]])/g, 
        (match) => {
          return match.replace(/(?<!\\)"/g, '\\"');
        }
      );
      
      return JSON.parse(sanitized);
    } catch (sanitizeError) {
      console.warn("[JSON RECOVERY] Aggressive string sanitization missed target, checking for truncation blocks...");
      
      // 3. Structural Recovery Fallback (If truncated via max_tokens cutoff)
      if (cleaned.startsWith("{") && !cleaned.endsWith("}")) {
        try {
          let repairedText = cleaned;
          repairedText = repairedText.replace(/,\s*"[^"]*"\s*:\s*[^]*$/, ""); // Trim hanging properties
          repairedText = repairedText.replace(/,\s*[^,]*$/, "");              // Trim hanging array commas

          const repairAttempts = [
            repairedText + '"]}]}',
            repairedText + '"]}]}}',
            repairedText + '}]}',
            repairedText + ']}'
          ];

          for (const attempt of repairAttempts) {
            try {
              return JSON.parse(attempt);
            } catch {
              continue;
            }
          }
        } catch (repairError) {
          console.error("[JSON RECOVERY CRITICAL] Truncation repair failed entirely.");
        }
      }

      throw new Error(
        `AI generated data formatting was heavily corrupted. (Original Position Error: ${initialError.message})`
      );
    }
  }
}

export async function processItineraryGeneration(
  input: ItineraryInput,
  tripId: string,
): Promise<any> {
  const inputHash = generateInputHash(input);
  const cacheKey = `trip:${tripId}:input:${inputHash}:itinerary`;

  try {
    // ==========================
    // 1. REDIS CACHE VERIFICATION
    // ==========================
    const cachedData = await CacheService.get<any>(cacheKey);
    if (cachedData) {
      console.log(`[REDIS HIT] ${cacheKey}`);
      return { source: "redis-cache", data: cachedData.data };
    }
    console.log(`[REDIS MISS] ${cacheKey}`);

    // ==========================
    // 2. MICROSERVICE / DATABASE VERIFICATION
    // ==========================
    let dbResponse = null;
    try {
      dbResponse = await getItinerary(tripId, inputHash);
    } catch (error: any) {
      if (error.response?.status !== 404) throw error;
    }

    if (dbResponse?.itinerary) {
      console.log(`[DB HIT] Trip ${tripId}`);
      const dbPayload = { source: "database", data: dbResponse.itinerary };

      await CacheService.set(cacheKey, dbPayload, 3600);
      return dbPayload;
    }
    console.log(`[DB MISS OR HASH MISMATCH] Trip ${tripId}`);

    // ==========================
    // 3. GENERATION VIA NVIDIA LLM ENGINE
    // ==========================
    console.log(
      `[AI GENERATION] Input configuration altered. Executing Gemma-2...`,
    );
    const corePromptText = generateItineraryPrompt(input);
    const combinedPayloadPrompt = `
[SYSTEM DIRECTION]
You are a deterministic backend data orchestration engine.
You must output raw valid JSON only. Do not wrap the response in markdown blocks.
Keep activity descriptions short and punchy to prevent running out of token limits.

[USER REQUEST]
${corePromptText}
`;

    // CRITICAL NVIDIA NIM RESOLUTION: response_format parameter removed entirely to pass gateway restrictions
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

    // Process output using defensive structural parser function
    const parsedJsonData = cleanAndRecoverAIJson(rawContent);
    
    // Fallback adjustment matching schema parsing rules
    const targetPayloadData = parsedJsonData.data ? parsedJsonData.data : parsedJsonData;

    const validatedItinerary = ItineraryOutputSchema.parse(targetPayloadData);
    const clientPayload = { source: "nvidia-gemma", data: validatedItinerary };

    // ==========================
    // 4. PERSIST AND CACHE RESULTS
    // ==========================
    await saveItinerary(tripId, validatedItinerary, inputHash);
    console.log(`[DB UPSERT SUCCESS] Synchronized input config ${inputHash}`);

    await CacheService.set(cacheKey, clientPayload, 3600);
    console.log(`[REDIS WARMUP] Saved key ${cacheKey}`);

    return clientPayload;
  } catch (error: any) {
    console.error("[AI Service Pipeline Failure]", error);
    throw new Error(
      error.message || "Failed to process target itinerary lifecycle step.",
    );
  }
}

export async function getExistingItineraryResult(
  input: ItineraryInput,
  tripId: string,
): Promise<any | null> {
  const inputHash = generateInputHash(input);
  const cacheKey = `trip:${tripId}:input:${inputHash}:itinerary`;

  const cachedData = await CacheService.get<any>(cacheKey);
  if (cachedData) {
    console.log(`[REDIS HIT] ${cacheKey}`);
    return { source: "redis-cache", data: cachedData.data };
  }

  let dbResponse = null;
  try {
    dbResponse = await getItinerary(tripId, inputHash);
  } catch (error: any) {
    if (error.response?.status !== 404) throw error;
  }

  if (!dbResponse?.itinerary) {
    return null;
  }

  console.log(`[DB HIT] Trip ${tripId}`);
  const dbPayload = { source: "database", data: dbResponse.itinerary };
  await CacheService.set(cacheKey, dbPayload, 3600);

  return dbPayload;
}
