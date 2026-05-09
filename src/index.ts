// src/index.ts
import express from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "hse-dev-secret";

// --- Types ---
interface Inspection {
  id: string;
  site: string;
  inspector: string;
  date: string;
  ppeCompliant: boolean;
  hazards: string[];
  riskLevel: "low" | "medium" | "high";
  notes: string;
  createdAt: string;
}

// --- In-memory store (swap for PostgreSQL via pg or Prisma) ---
const db: Map<string, Inspection> = new Map();

// --- Zod schemas ---
const InspectionSchema = z.object({
  site: z.string().min(1, "Site name required"),
  inspector: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  ppeCompliant: z.boolean(),
  hazards: z.array(z.string()),
  riskLevel: z.enum(["low", "medium", "high"]),
  notes: z.string().optional().default(""),
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// --- Auth middleware ---
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET) as { username: string };
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token expired or invalid" });
  }
}

// --- Routes ---

// Login — returns JWT
app.post("/auth/login", (req, res) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  // Mock user check (replace with real DB lookup + bcrypt)
  const { username, password } = result.data;
  if (username === "admin" && password === "hse1234") {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "8h" });
    return res.json({ token, expiresIn: "8h" });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

// Create inspection
app.post("/inspections", authenticate, (req, res) => {
  const result = InspectionSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const inspection: Inspection = {
    id: uuidv4(),
    ...result.data,
    createdAt: new Date().toISOString(),
  };
  db.set(inspection.id, inspection);
  return res.status(201).json(inspection);
});

// Get all inspections (with optional risk level filter)
app.get("/inspections", authenticate, (req, res) => {
  const { riskLevel, site } = req.query;
  let results = Array.from(db.values());

  if (riskLevel) results = results.filter(i => i.riskLevel === riskLevel);
  if (site) results = results.filter(i => i.site.toLowerCase().includes((site as string).toLowerCase()));

  return res.json({ count: results.length, data: results });
});

// Get single inspection
app.get("/inspections/:id", authenticate, (req, res) => {
  const inspection = db.get(req.params.id);
  if (!inspection) return res.status(404).json({ error: "Inspection not found" });
  return res.json(inspection);
});

// Update inspection
app.patch("/inspections/:id", authenticate, (req, res) => {
  const inspection = db.get(req.params.id);
  if (!inspection) return res.status(404).json({ error: "Inspection not found" });

  const partial = InspectionSchema.partial().safeParse(req.body);
  if (!partial.success) return res.status(400).json({ error: partial.error.flatten() });

  const updated = { ...inspection, ...partial.data };
  db.set(req.params.id, updated);
  return res.json(updated);
});

// Delete inspection
app.delete("/inspections/:id", authenticate, (req, res) => {
  if (!db.has(req.params.id)) return res.status(404).json({ error: "Not found" });
  db.delete(req.params.id);
  return res.status(204).send();
});

// Summary stats
app.get("/stats", authenticate, (req, res) => {
  const all = Array.from(db.values());
  return res.json({
    total: all.length,
    byRisk: {
      low: all.filter(i => i.riskLevel === "low").length,
      medium: all.filter(i => i.riskLevel === "medium").length,
      high: all.filter(i => i.riskLevel === "high").length,
    },
    ppeComplianceRate: all.length
      ? `${Math.round((all.filter(i => i.ppeCompliant).length / all.length) * 100)}%`
      : "N/A",
  });
});

app.listen(3001, () => console.log("HSE Inspection Logger running on port 3001"));
