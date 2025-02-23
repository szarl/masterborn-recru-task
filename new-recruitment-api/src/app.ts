import 'dotenv/config'
import express, { Response, Request, NextFunction } from "express";
import { addCandidate, addCandidateNote, deleteCandidate, getCandidateById, getCandidates } from "./controllers/candidate.controller";

const app = express();

const LEGACY_API_KEY = process.env.LEGACY_API_KEY || 'default-key';

const verifyApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== LEGACY_API_KEY) {
    res.status(403).json({ message: "Forbidden: Invalid API Key" });
    return;
  }

  next();
};

app.use(express.json({ limit: "5mb" }));

app.post("/candidates", verifyApiKey, addCandidate);
app.get("/candidates", verifyApiKey, getCandidates);
app.delete("/candidates", verifyApiKey, deleteCandidate);
app.get("/candidates/:id", verifyApiKey, getCandidateById);
app.post("/candidates/:id/note", verifyApiKey, addCandidateNote);

app.get("/", (_, res) => {
  res.send("New Recruitment API");
});

export default app;