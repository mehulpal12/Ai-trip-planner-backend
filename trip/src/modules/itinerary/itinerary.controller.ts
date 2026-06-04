import { Request, Response } from "express";
import * as itineraryService from "./itinerary.service.js";

export async function save(req: Request, res: Response) {
  try {
    const { tripId } = req.params;

    // 1. Defensively strip away potential hidden properties or circular strings
    // If this throws an error right here, your payload definitely has a circular reference!
    const cleanItinerary = JSON.parse(JSON.stringify(req.body));

    const result = await itineraryService.saveItinerary(
      tripId as string,
      cleanItinerary
    );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    // If the clean step caught it
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

    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: "Required parameter 'tripId' is missing from request route."
      });
    }

    // Call the service to find the itinerary by its unique tripId relation
    const result = await itineraryService.getItinerary(tripId as string);

    // If no record exists for this trip, return a clean 404 status instead of sending empty data
    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No itinerary found matching Trip ID: ${tripId}`
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

    const result = await itineraryService.deleteItinerary(
      tripId as string
    );

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