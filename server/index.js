/**
 * FLA Desktop — server/index.js
 * Backend Express embebido: CRUD para clientes, maestros, trabajos y config.
 * Sin Gmail, sin OAuth, sin dependencias externas de red.
 */

const express = require("express");
const cors = require("cors");
const log = require("electron-log");
const { initDB, CONFIG, CLIENTES, MAESTROS, TRABAJOS } = require("./db.js");

function createServer(port) {
  global.FLA_PORT = port;

  initDB();

  const app = express();
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "10mb" }));

  // ── Health ──────────────────────────────────────────────────────────────
  app.get("/health", (req, res) => res.json({ ok: true, port, version: "1.0" }));

  // ── Config ──────────────────────────────────────────────────────────────
  app.get("/api/config", (req, res) => {
    try { res.json(CONFIG.getAll()); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/config", (req, res) => {
    try {
      CONFIG.setMany(req.body);
      res.json({ ok: true });
    }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Clientes ────────────────────────────────────────────────────────────
  app.get("/api/clientes", (req, res) => {
    try { res.json(CLIENTES.getAll()); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/clientes", (req, res) => {
    try { res.json(CLIENTES.create(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/clientes/:id", (req, res) => {
    try { res.json(CLIENTES.update(Number(req.params.id), req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/clientes/:id", (req, res) => {
    try { CLIENTES.delete(Number(req.params.id)); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Maestros ────────────────────────────────────────────────────────────
  app.get("/api/maestros", (req, res) => {
    try { res.json(MAESTROS.getAll()); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/maestros", (req, res) => {
    try { res.json(MAESTROS.create(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/maestros/:id", (req, res) => {
    try { res.json(MAESTROS.update(Number(req.params.id), req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/maestros/:id", (req, res) => {
    try { MAESTROS.delete(Number(req.params.id)); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Trabajos ────────────────────────────────────────────────────────────
  app.get("/api/trabajos", (req, res) => {
    try { res.json(TRABAJOS.getAll()); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/trabajos", (req, res) => {
    try { res.json(TRABAJOS.create(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/trabajos/:id", (req, res) => {
    try { res.json(TRABAJOS.update(Number(req.params.id), req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/trabajos/:id", (req, res) => {
    try { TRABAJOS.delete(Number(req.params.id)); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Start ────────────────────────────────────────────────────────────────
  const server = app.listen(port, "127.0.0.1", () => {
    log.info(`Express escuchando en http://127.0.0.1:${port}`);
  });

  server.on("error", (e) => log.error("Error en Express:", e));

  return server;
}

module.exports = { createServer };
