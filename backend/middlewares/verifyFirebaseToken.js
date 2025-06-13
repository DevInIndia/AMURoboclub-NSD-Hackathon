import { getAuth } from "firebase-admin/auth";

export const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken; // You can access req.user in routes
    next();
  } catch (error) {
    console.error("Firebase Auth Error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
