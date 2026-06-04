import prisma from "../../config/db.js";

/**
 * Saves or updates an itinerary for a specific trip.
 * Validates trip existence beforehand to prevent foreign key violations.
 */
export async function saveItinerary(tripId: string, itinerary: any) {
  // 1. Check if the parent trip exists to avoid foreign key violations
  const tripExists = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true } // Selecting only the ID keeps this query lightweight
  });

  if (!tripExists) {
    throw new Error(`TRIP_NOT_FOUND: Trip with ID ${tripId} does not exist.`);
  }

  // 2. Safe to upsert now
  return prisma.itinerary.upsert({
    where: {
      tripId
    },
    update: {
      itinerary
    },
    create: {
      tripId,
      itinerary
    }
  });
}

/**
 * Retrieves the itinerary associated with a given trip ID.
 */
export async function getItinerary(tripId: string) {
  return prisma.itinerary.findUnique({
    where: {
      tripId
    }
  });
}

export async function deleteItinerary(tripId: string) {
  // 1. Check if the parent trip exists
  const tripExists = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true }
  });

  if (!tripExists) {
    throw new Error(`TRIP_NOT_FOUND: Trip with ID ${tripId} does not exist.`);
  }

  // 2. Delete the itinerary record for this trip
  return prisma.itinerary.deleteMany({
    where: {
      tripId
    }
  });
}