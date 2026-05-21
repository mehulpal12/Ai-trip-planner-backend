import prisma from "./src/config/db.js";

async function test() {
  try {
    console.log("Testing connection...");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
      }
    });
    console.log("All Users:", JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Test failed:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
