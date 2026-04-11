import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve static files from public directory
  app.use(express.static(path.join(process.cwd(), "public")));

  // In-memory storage for cloud tournaments (Simulation)
  const cloudTournaments = new Map<string, any>();
  
  // Predefined shortcodes
  const SHORTCODES = ["PADEL1", "PADEL2", "PADEL3", "PADEL4", "PADEL5", "PRO1", "PRO2", "PRO3", "PRO4", "PRO5", "MATCH1", "MATCH2", "MATCH3"];
  const shortcodeAssignments = new Map<string, string | null>(); // shortcode -> tournamentId
  SHORTCODES.forEach(code => shortcodeAssignments.set(code, null));

  // Helper to cleanup stale tournaments (Auto-finish after 24h)
  const AUTO_FINISH_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  setInterval(() => {
    const now = Date.now();
    cloudTournaments.forEach((t, id) => {
      if (t.status === 'active' && t.lastActivity && (now - t.lastActivity > AUTO_FINISH_TIMEOUT)) {
        console.log(`[SERVER] Auto-finishing stale tournament: ${t.name} (ID: ${id})`);
        t.status = 'finished';
        if (t.shortcode) {
          shortcodeAssignments.set(t.shortcode, null);
        }
      }
    });
  }, 60 * 60 * 1000); // Check every hour

  // API Routes
  app.get("/api/shortcodes/available", (req, res) => {
    const available = Array.from(shortcodeAssignments.entries())
      .filter(([_, tId]) => tId === null)
      .map(([code]) => code);
    res.json(available);
  });

  app.get("/api/admin/tournaments", (req, res) => {
    const list = Array.from(cloudTournaments.values()).map(t => {
      const activeCourts = t.matches ? t.matches.filter((m: any) => m.status === 'live').length : 0;
      return {
        id: t.id,
        name: t.name,
        shortcode: t.shortcode,
        status: t.status,
        courts: t.courts,
        activeCourts: activeCourts,
        lastActivity: t.lastActivity
      };
    });
    res.json(list);
  });

  app.post("/api/tournament/finish", (req, res) => {
    const { tournamentId } = req.body;
    const tournament = cloudTournaments.get(tournamentId);
    if (tournament) {
      tournament.status = 'finished';
      if (tournament.shortcode) {
        shortcodeAssignments.set(tournament.shortcode, null);
      }
      console.log(`[SERVER] Tournament finished: ${tournament.name} (ID: ${tournamentId})`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Tournament not found" });
    }
  });

  app.post("/api/tournament/create", (req, res) => {
    const tournament = req.body;
    if (!tournament.id) {
      console.error("Attempted to create tournament without ID", req.body);
      return res.status(400).json({ error: "Missing tournament ID" });
    }
    
    // Update last activity
    tournament.lastActivity = Date.now();
    
    cloudTournaments.set(tournament.id, tournament);
    
    // Assign shortcode if provided
    if (tournament.shortcode) {
      shortcodeAssignments.set(tournament.shortcode, tournament.id);
    }
    
    console.log(`[SERVER] Cloud tournament synced: ${tournament.name} (ID: ${tournament.id}, Shortcode: ${tournament.shortcode})`);
    res.json({ success: true });
  });

  app.get("/api/tournament/:id", (req, res) => {
    const id = req.params.id;
    const tournament = cloudTournaments.get(id);
    if (tournament) {
      tournament.lastActivity = Date.now(); // Update activity on fetch
      console.log(`[SERVER] Tournament fetched: ${tournament.name} (ID: ${id})`);
      res.json(tournament);
    } else {
      console.warn(`[SERVER] Tournament NOT FOUND: ID ${id}. Available IDs: ${Array.from(cloudTournaments.keys()).join(', ')}`);
      res.status(404).json({ error: "Tournament not found" });
    }
  });

  app.get("/api/tournament/shortcode/:code", (req, res) => {
    const code = req.params.code.toUpperCase();
    const tournament = Array.from(cloudTournaments.values()).find(t => t.shortcode === code && t.status === 'active');
    if (tournament) {
      tournament.lastActivity = Date.now();
      console.log(`[SERVER] Tournament fetched by shortcode: ${code}`);
      res.json(tournament);
    } else {
      res.status(404).json({ error: "Tournament not found or already finished" });
    }
  });

  app.post("/api/tournament/match/finish", (req, res) => {
    const { tournamentId, matchId, finalScore, players } = req.body;
    const tournament = cloudTournaments.get(tournamentId);
    if (tournament) {
      tournament.lastActivity = Date.now();
      // Update players in the tournament object
      tournament.players = players;
      // Also update the match status in the tournament object
      tournament.matches = tournament.matches.map(m => 
        m.id === matchId ? { 
          ...m, 
          status: 'finished', 
          teamA: { ...m.teamA, score: finalScore.teamAScore, games: finalScore.teamAGames }, 
          teamB: { ...m.teamB, score: finalScore.teamBScore, games: finalScore.teamBGames } 
        } : m
      );
      console.log(`[SERVER] Match ${matchId} in tournament ${tournamentId} finished and saved.`);
    } else {
      console.warn(`[SERVER] Attempted to finish match in non-existent tournament: ${tournamentId}`);
    }
    res.json({ success: true, message: "Match results saved successfully." });
  });

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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
