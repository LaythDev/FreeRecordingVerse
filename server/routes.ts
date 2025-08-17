import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for the Screen Recorder app
  // This is a client-side only application, so we don't need any server-side routes
  
  // GET /api/health - Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
