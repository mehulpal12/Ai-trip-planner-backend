import { type Request, type Response } from "express";
import { ItineraryInputSchema } from "../types/itinerary.types.js";
import { processItineraryGeneration } from "../services/itinerary.service.js";

export async function handleItineraryCreation(req: Request, res: Response): Promise<void> {
  try {
    // Validate HTTP request payload input structural validity
    const validatedInput = ItineraryInputSchema.parse(req.body);

    const itineraryData = await processItineraryGeneration(validatedInput);

    res.status(200).json({
      success: true,
      data: itineraryData
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
       res.status(400).json({ success: false, errors: error.errors });
       return;
    }
    console.error(error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}