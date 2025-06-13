import { auth, provider, signInWithPopup } from "../firebase";
import { useState } from "react";
import axios from "axios";

const Login = () => {
  const [user, setUser] = useState(null);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // Optional: Send token to backend for session setup
      await axios.post("http://localhost:8080/api/auth/verify", {
        token: idToken,
      });

      setUser(result.user);
      console.log("Logged in as:", result.user.displayName);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="text-center">
      {user ? (
        <h2 className="text-white">Welcome {user.displayName}</h2>
      ) : (
        <button
          onClick={handleGoogleLogin}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition duration-300"
        >
          Login with Google
        </button>
      )}
    </div>
  );
};

export default Login;
