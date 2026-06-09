import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/protect.js";

import * as tripService from "../services/trip.service.js";
import prisma from "../config/db.js";

export const createTrip = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const trip = await tripService.createTrip({
    ...req.body,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: trip,
  });
};

export const getTrips = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const trips = await tripService.getTrips(req.user.id);

  res.status(200).json({
    success: true,
    data: trips,
  });
};

export const getTripById: any = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  // Enforce string type to satisfy Prisma if this flows directly down stream
  const tripId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const trip = await tripService.getTripById(tripId as string);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found",
    });
  }

  // 🚀 FIX: Cast 'trip' as any or build an explicit type assertion here because 
  // tripService.getTripById's return type signature doesn't officially declare 'members'.
  const tripWithRelations = trip as any;

  const hasAccess =
    tripWithRelations.createdBy === req.user.id ||
    tripWithRelations.members?.some(
      (member: { userId: string }) => member.userId === req.user.id
    );

  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      message: "Forbidden - You do not have access to this trip",
    });
  }

  res.status(200).json({
    success: true,
    data: trip,
  });
};

export const updateTrip = async (
  req: AuthRequest,
  res: Response
) => {
  // FIX: Line 118 safeguard - Clean up string arrays from parameters
  const tripId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const trip = await tripService.updateTrip(
    tripId as string,
    req.body
  );

  res.status(200).json({
    success: true,
    data: trip,
  });
};

export async function getItineraryByTripId(req: Request, res: Response) {
  try {
    const { tripId } = req.params;

    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: "Trip ID parameter is required."
      });
    }

    // Clean parameter to force strict string type
    const cleanTripId = Array.isArray(tripId) ? tripId[0] : tripId;

    // 1. Fetch the trip with the relation arrays
    const trip = await prisma.trip.findUnique({
      where: { id: cleanTripId  as string},
      include: { itinerary: true, members: true }
    });

    // 2. Safeguard against undefined/null records
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: `Trip with ID ${cleanTripId} not found.`
      });
    }

    // 3. Since 'itinerary' is an array (Itinerary[]), returning it wholesale is valid.
    return res.status(200).json({
      success: true,
      data: trip.itinerary
    });

  } catch (error) {
    console.error("Error inside getItineraryByTripId:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

export const deleteTrip = async (
  req: AuthRequest,
  res: Response
) => {
  const tripId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  await tripService.deleteTrip(tripId as string);

  res.status(200).json({
    success: true,
    message: "Trip deleted",
  });
};

export const getUserTrips = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const trips = await tripService.getUserTrips(req.user.id);

  res.status(200).json({
    success: true,
    data: trips,
  });
};