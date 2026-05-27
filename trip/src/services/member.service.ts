import prisma from "../config/db.js";

export const addMember = async (tripId: string, memberName: string, userId: string) => {
  console.log("Member added", tripId, memberName, userId);
  return prisma.tripMember.create({
    data: {
      tripId,
      memberName,
      userId,
      role: "MEMBER",
    },
  });
};

export const getMembers = async (tripId: string) => {
  return prisma.tripMember.findMany({
    where: { tripId },
  });
};

export const removeMember = async (tripId: string, userId: string) => {
  return prisma.tripMember.deleteMany({
    where: {
      tripId,
      userId,
    },
  });
};
