import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  // In this environment, we can often initialize with minimal config if running on GCP
  // or we might need to specify the project ID.
    try {
      // Use the project ID from the error message or common config
      admin.initializeApp({
        projectId: "gen-lang-client-0653894877"
      });
      console.log("Firebase Admin initialized");
    } catch (error) {
      console.error("Firebase Admin initialization failed:", error);
    }

  app.use(express.json());

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
