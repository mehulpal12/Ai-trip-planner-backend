import { Request, Response } from "express";
import * as itineraryService from "./itinerary.service.js";

export async function save(req: Request, res: Response) {
  try {
    const { tripId } = req.params;
    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: "Required parameter 'tripId' is missing from request route."
      });
    }
    
    // Extract both the data payload and the fingerprint hash from the request body
    const { itinerary, inputHash } = req.body;

    if (!inputHash) {
      return res.status(400).json({
        success: false,
        message: "Required property 'inputHash' is missing from the request body."
      });
    }

    if (!itinerary) {
      return res.status(400).json({
        success: false,
        message: "Required property 'itinerary' data payload is missing from the request body."
      });
    }

    // Defensively strip away potential hidden properties or circular strings
    const cleanItinerary = JSON.parse(JSON.stringify(itinerary));

    // Pass the inputHash along with the payload down to the database service layer
    const result = await itineraryService.saveItinerary(
      tripId as string,
      cleanItinerary,
      inputHash as string
    );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes("circular structure")) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload: Request body contains circular JSON references."
      });
    }

    if (error.message?.startsWith("TRIP_NOT_FOUND")) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    console.error("Error inside save itinerary controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

export async function get(req: Request, res: Response) {
  try {
    const { tripId } = req.params;
    // Get the inputHash from the query parameters: /api/.../itinerary?inputHash=abc123xyz
    const { inputHash } = req.query;

    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: "Required parameter 'tripId' is missing from request route."
      });
    }

    if (!inputHash) {
      return res.status(400).json({
        success: false,
        message: "Required query parameter 'inputHash' is missing from request URL."
      });
    }

    // Call the service, passing both fields to verify version alignment
    const result = await itineraryService.getItinerary(tripId as string, inputHash as string);

    // If no record exists, or if it was a version mismatch (service returned null)
    // return a clean 404 status so the orchestration client triggers AI generation fallback
    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No matching up-to-date itinerary found for Trip ID: ${tripId}`
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error("Error inside get itinerary controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

export async function deleteController(req: Request, res: Response) {
  try {
    const { tripId } = req.params;

    const result = await itineraryService.deleteItinerary(tripId as string);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.message?.startsWith("TRIP_NOT_FOUND")) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    console.error("Error inside delete itinerary controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}