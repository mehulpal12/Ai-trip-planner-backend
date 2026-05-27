import { z } from "zod";

// Expected Input Schema from frontend / trip service
export const ItineraryInputSchema = z.object({
  destination: z.string().min(1),
  days: z.number().int().min(1).max(30),
  budget: z.number().positive(),
  travelStyle: z.string().default("Adventure")
});

export type ItineraryInput = z.infer<typeof ItineraryInputSchema>;

// Exact Schema the AI must conform to
export const ItineraryOutputSchema = z.object({
  days: z.array(
    z.object({
      day: z.number(),
      title: z.string(),
      activities: z.array(z.string())
    })
  )
});

export type ItineraryOutput = z.infer<typeof ItineraryOutputSchema>;