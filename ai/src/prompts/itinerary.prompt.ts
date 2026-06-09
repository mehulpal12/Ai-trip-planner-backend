import type { ItineraryInput } from "../types/itinerary.types.js";

export const generateItineraryPrompt = (input: ItineraryInput): string => {
  return ` You are a strict JSON generator. and You are an expert travel planner microservice. Create a structured travel itinerary based on the following parameters:

Destination: ${input.destination}
Duration: ${input.days} days
Total Budget: $${input.budget}
Travel Style: ${input.travelStyle}

CRITICAL REQUIREMENT: Return ONLY a valid JSON object matching this exact structure, with no markdown formatting, no code blocks (e.g. do not wrap in \`\`\`json), and no conversational intro/outro text:
{
  "days": [
    {
      "day": 1,
      "title": "Day Title Here",
      "activities": ["Activity 1", "Activity 2"]
    }
  ]
}`;
};