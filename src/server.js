import app from "./app.js";
import { initPool } from "./config/db.js";

const port = process.env.PORT || 3004;

app.listen(port, async () => {
  await initPool();
  console.log(`🚀 Server running at http://localhost:${port}`);
});


