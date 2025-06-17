import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import multer from "multer";
import savePrompt from "./routes/savePrompt.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuth } from "firebase-admin/auth";
import "./firebase.js";
import { verifyFirebaseToken } from "./middlewares/verifyFirebaseToken.js";
import ExpressError from "./utils/ExpressError.js";
import wrapAsync from "./utils/wrapAsync.js";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  cors({
    origin: "https://amuroboclub-nsd-hackathon.onrender.com",
    methods: "GET,POST",
    credentials: true,
  })
);

app.use("/api/savePrompt", savePrompt);

app.options("*", cors({
  origin: "https://amuroboclub-nsd-hackathon.onrender.com",
  methods: "GET,POST",
  credentials: true,
}));

const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

async function run(name) {
  try {
    const prompt = `Give me the answer of ${name} in terms of astronomy and space`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I couldn't fetch the astronomical information at this time.";
  }
}

app.get("/", (req, res) => {
  res.send("Working");
});

app.post("/api/advanced-search", wrapAsync((req, res) => {
  const { temp, lumin, magni, color, spect, radii } = req.body;
  const query = {
    Temperature: temp,
    Relative_Luminosity: lumin,
    Absolute_Magnitude: magni,
    Color: color,
    Spectral_Class: spect,
    Relative_Radius: radii,
  };
  res.json(query);
}));

app.post("/search", verifyFirebaseToken, wrapAsync(async (req, res) => {
  const { name } = req.body;
  const response = await run(name);
  res.send(response);
}));

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const prompt = {
      role: "user",
      parts: [
        imagePart,
        { text: "Describe the astronomical objects or scene in this image." },
      ],
    };

    const result = await model.generateContent({
      contents: [prompt],
    });

    const response = await result.response;
    const text = response.text();

    res.json({
      message: "Image processed by Gemini successfully!",
      geminiResponse: text,
    });
  } catch (error) {
    console.error("Gemini Vision API Error:", error);
    res.status(500).json({ error: "Failed to analyze image." });
  }
});

app.all("*", (req, res, next) => {
  throw new ExpressError(404, "Page Not Found!");
});

app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).send(message);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ App is listening at port ${PORT}`);
});
