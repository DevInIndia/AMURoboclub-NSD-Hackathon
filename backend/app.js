import "./loadEnv.js"; // must stay first: everything below reads process.env

import express from "express";
import cors from "cors";
import multer from "multer";
import archive from "./routes/archive.js";
import advancedSearch from "./routes/advancedSearch.js";
import exoplanet from "./routes/exoplanet.js";
import { askAstronomy, describeImage } from "./services/gemini.js";
import { checkQuestionScope } from "./services/guardrails.js";
import { savePrompt } from "./db/archive.js";
import { requireAuth, userId } from "./middlewares/requireAuth.js";
import { generalLimiter, aiLimiter, uploadLimiter } from "./middlewares/rateLimit.js";
import { validateImageUpload } from "./middlewares/validateImage.js";
import { securityHeaders } from "./middlewares/securityHeaders.js";
import ExpressError from "./utils/ExpressError.js";
import wrapAsync from "./utils/wrapAsync.js";

const app = express();

// Behind Render/Netlify the client address arrives in X-Forwarded-For; without
// this every request looks like it comes from the proxy and IP-based rate
// limits would apply to all users collectively. Kept opt-in so a directly
// exposed server cannot be tricked by a spoofed header.
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
}

// No route consumes form-encoded bodies -- only JSON and multipart -- so the
// urlencoded parser is removed rather than merely patched. 32kb is generous
// for a question while capping how much text one request can push at Gemini.
app.use(securityHeaders);
app.use(express.json({ limit: "32kb" }));

app.use(generalLimiter);

// Deployed origins come from ALLOWED_ORIGINS (comma separated); the Vite dev
// server is always allowed so the project runs locally out of the box.
const allowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin(origin, callback) {
      // No origin header: curl, health checks, same-origin requests.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new ExpressError(403, `Origin ${origin} is not allowed.`));
    },
    methods: "GET,POST",
    credentials: true,
  })
);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, callback) => {
    if (file.mimetype.startsWith("image/")) return callback(null, true);
    callback(new ExpressError(400, "Only image files can be analysed."));
  },
});

app.get("/", (req, res) => {
  res.send("Working");
});

app.use("/api/archive", archive);
app.use("/api/advanced-search", advancedSearch);
app.use("/api/exoplanet", exoplanet);

const MAX_QUESTION_LENGTH = 500;

app.post(
  "/search",
  requireAuth,
  aiLimiter,
  wrapAsync(async (req, res) => {
    const { name } = req.body;
    if (typeof name !== "string" || !name.trim()) {
      throw new ExpressError(400, "Please include a question to ask.");
    }
    // Every character here becomes tokens we pay for, so the ceiling is
    // enforced server-side rather than trusting the input's maxLength.
    if (name.length > MAX_QUESTION_LENGTH) {
      throw new ExpressError(
        400,
        `Questions are limited to ${MAX_QUESTION_LENGTH} characters.`
      );
    }

    // Refuse off-topic prompts before spending a token on them.
    const scope = checkQuestionScope(name);
    if (!scope.allowed) {
      throw new ExpressError(400, scope.reason);
    }

    const answer = await askAstronomy(name);

    // Archive here rather than in a second call from the browser: one round
    // trip, and the answer is stored exactly as it was generated.
    let archiveError = null;
    try {
      await savePrompt(userId(req), { prompt: name, response: answer });
    } catch (error) {
      console.error("Could not archive prompt:", error);
      archiveError = "This answer could not be saved to your archive.";
    }

    res.json({ answer, archiveError });
  })
);

app.post(
  "/upload",
  requireAuth,
  uploadLimiter,
  upload.single("image"),
  validateImageUpload,
  wrapAsync(async (req, res) => {
    res.json({
      message: "Image processed by Gemini successfully!",
      geminiResponse: await describeImage(req.file.buffer, req.file.mimetype),
    });
  })
);

app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `Image must be smaller than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`
        : "Upload failed.";
    return res.status(400).json({ error: message });
  }

  // express-oauth2-jwt-bearer rejects bad or missing tokens with its own
  // status and code; surface those as-is rather than as a generic 500.
  const statusCode = err.statusCode || err.status || 500;

  // Client errors describe what the caller did wrong and are safe to return.
  // Server errors are not: their messages carry database hosts, credentials,
  // file paths and driver internals, so they stay in the log.
  if (statusCode >= 500) {
    console.error(err);
    return res.status(statusCode).json({ error: "Something went wrong." });
  }

  res.status(statusCode).json({ error: err.message || "Request failed." });
});

// Exported without listening so tests can drive it in-process; server.js owns
// binding the port.
export default app;
