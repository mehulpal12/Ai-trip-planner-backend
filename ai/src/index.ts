import app from "./app.js";
import { env } from "./config/env.js";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`[AI Service] Running in ${env.NODE_ENV} mode on port ${PORT}`);
});