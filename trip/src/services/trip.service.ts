import prisma from "../config/db.js";

export const createTrip = async (
  data: any
) => {
  const { createdBy, destination, notes, description, startDate, endDate, ...tripData } = data;
  return prisma.trip.create({
    data: {
      ...tripData,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description ?? notes,
      createdBy,
      ...(destination
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

export const getTripById = async (
  id: string
) => {
  return prisma.trip.findUnique({
    where: { id },
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

export const updateTrip = async (
  id: string,
  data: any
) => {
  const { destination, notes, description, ...tripData } = data;

  const existingDestination = destination
    ? await prisma.destination.findFirst({
        where: { tripId: id },
        orderBy: { orderIndex: "asc" },
      })
    : null;

  if (destination) {
    if (existingDestination) {
      await prisma.destination.update({
        where: { id: existingDestination.id },
        data: {
          name: destination,
          city: destination,
        },
      });
    } else {
      await prisma.destination.create({
        data: {
          tripId: id,
          name: destination,
          city: destination,
          orderIndex: 0,
        },
      });
    }
  }

  return prisma.trip.update({
    where: { id },
    data: {
      ...tripData,
      ...(notes !== undefined || description !== undefined
        ? { description: description ?? notes }
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
