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

  const trip = await tripService.getTripById(req.params.id as string);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found",
    });
  }

  // 🚀 FIX: explicitly type 'member' matching Prisma's type signature, allowing null values
  const hasAccess =
    trip.createdBy === req.user.id ||
    trip.members?.some(
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
  const trip =
    await tripService.updateTrip(
      req.params.id as string,
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

    // 1. Fetch the trip first (or query itinerary directly via tripId depending on your logic)
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { itinerary: true }
    });

    // 2. Safeguard against undefined/null records (Fixes your 500 error)
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: `Trip with ID ${tripId} not found.`
      });
    }

    // 3. Safe to read properties now because we know 'trip' exists
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
  await tripService.deleteTrip(
    req.params.id as string
  );

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
