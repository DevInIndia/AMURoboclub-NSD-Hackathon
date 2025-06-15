import express from "express";
import { db } from "../firebase.js"; // already configured
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";

const router = express.Router();

router.post("/", verifyFirebaseToken, async (req, res) => {
  const { text, response } = req.body;
  const userId = req.user.uid;

  if (!text || !response) {
    return res.status(400).json({ error: "Missing prompt or response" });
  }

  try {
    await db.collection("users").doc(userId).collection("prompts").add({
      text,
      response,
      createdAt: new Date(),
    });

    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Error saving prompt:", error);
    res.status(500).json({ error: "Failed to save prompt" });
  }
});

export default router;
