import express, { Response, Request, NextFunction } from "express";
import { addCandidate } from "./controllers/candidate.controller";

export const app = express();
const port = 4050;

const LEGACY_API_KEY = "0194ec39-4437-7c7f-b720-7cd7b2c8d7f4";

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

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});
