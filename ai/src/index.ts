import app from "./app.js"; // or wherever your Express app instance is
import { redisClient } from "./config/redis.js";

async function startServer() {
  try {
    // Only connect if the socket isn't already open
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    app.listen(4002, () => {
      console.log("🚀 AI Service running on port 4002");
    });
  } catch (error) {
    console.error("Failed to start the AI server application:", error);
    process.exit(1);
  }
}

startServer();