import { createApp } from "./app.js";

// Local development entry point: build the app and start listening.
// (On Vercel the app is served by api/[...path].ts instead — no listen there.)
const app = createApp();
const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, () => {
  console.log(`[loopcode] API listening on http://localhost:${PORT}`);
});
