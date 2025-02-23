import 'dotenv/config'
import express, { Response, Request, NextFunction } from "express";
import { addCandidate } from "./controllers/candidate.controller";

const app = express();

const LEGACY_API_KEY = process.env.LEGACY_API_KEY;

const verifyApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== LEGACY_API_KEY) {
    res.status(403).json({ message: "Forbidden: Invalid API Key" });
    return next();
  }

  next();
};

app.use(express.json({ limit: "5mb" }));

app.post("/candidates", verifyApiKey, addCandidate);

app.get("/", (_, res) => {
  res.send("New Recruitment API");
});

export default app;