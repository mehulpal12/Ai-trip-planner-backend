import { Prisma } from "../generated/prisma/client.js";
import prisma from "../config/db.js";

export const createTrip = async (data: any) => {
  // 1. Destructure the updated 'destinations' array coming from your frontend payload
  const { 
    createdBy, 
    destination, // fallback for legacy logic if needed
    destinations, // 🚀 New structured destinations array 
    notes, 
    description, 
    startDate, 
    endDate, 
    ...tripData 
  } = data;

  return prisma.trip.create({
    data: {
      ...tripData,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description ?? notes,
      createdBy,
      
      // 2. Map and parse incoming structured destinations cleanly into Prisma's relational create block
      ...(destinations && destinations.length > 0
        ? {
            destinations: {
              create: destinations.map((dest: any, index: number) => ({
                name: dest.name || "Unmapped Destination",
                city: dest.city || null,
                state: dest.state || null,
                country: dest.country || null,
                orderIndex: index, // Dynamically set the orderIndex based on its array placement
              })),
            },
          }
        : destination // Fallback legacy fallback support in case a string comes through
        ? {
            destinations: {
              create: {
                name: destination,
                city: destination,
                orderIndex: 0,
              },
            },
          }
        : {}),

      members: {
        create: {
          userId: createdBy,
          role: "OWNER",
        },
      },
    },
    include: {
      destinations: {
        orderBy: {
          orderIndex: "asc",
        },
      },
      members: true,
    },
  });
};

export const getTrips = async (userId: string) => {
  return getUserTrips(userId);
};
export const getTripById = async (id: string) => {
  return prisma.trip.findUnique({
    where: { id },
    include: {
      itinerary: true, // This fetches the itineraries array associated with the trip
      // members: true,   // This fetches the members array associated with the trip
    },
  });
};

export const updateTrip = async (id: string, data: any) => {
  const { 
    createdBy, 
    destination, 
    destinations, 
    notes, 
    description, 
    startDate, 
    endDate, 
    ...tripData 
  } = data;

  return prisma.trip.update({
    where: { id },
    data: {
      ...tripData,
      // 🚀 FIX 1: Wrap dates in JS Date objects so they validate as true ISO-8601 instances
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description ?? notes,

      // 🚀 FIX 2: Clear old destinations and create the newly updated structured list
      ...(destinations && destinations.length > 0
        ? {
            destinations: {
              // Delete all previous destinations tied to this trip id to prevent duplicates
              deleteMany: {}, 
              // Create the updated set from the frontend array payload
              create: destinations.map((dest: any, index: number) => ({
                name: dest.name || "Unmapped Destination",
                city: dest.city || null,
                state: dest.state || null,
                country: dest.country || null,
                orderIndex: index,
              })),
            },
          }
        : destination
        ? {
            destinations: {
              deleteMany: {},
              create: {
                name: destination,
                city: destination,
                orderIndex: 0,
              },
            },
          }
        : {}),
    },
    include: {
      destinations: {
        orderBy: {
          orderIndex: "asc",
        },
      },
      members: true,
    },
  });
};

export const deleteTrip = async (
  id: string
) => {
  return prisma.$transaction(async (tx) => {
    await tx.tripMember.deleteMany({
      where: { tripId: id },
    });

    return tx.trip.delete({
      where: { id },
    });
  });
};

export const getUserTrips = async (userId: string) => {
  return prisma.trip.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      destinations: {
        orderBy: {
          orderIndex: "asc",
        },
      },
      members: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};
