import { useState } from "react";
import BiotechIcon from "@mui/icons-material/Biotech";
import { useAuth } from "../context/AuthContext";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdvancedSearchButton from "../components/AdvancedSearchButton";
import { marked } from "marked";
import DOMPurify from "dompurify";

function Home() {
  const { user } = useAuth();
  const [isOutputVisible, setIsOutputVisible] = useState(false);
  const [currVal, setCurrVal] = useState("");
  const [searchedContent, setSearchedContent] = useState(
    "Please wait, Loading..."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadResponse, setUploadResponse] = useState(null);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const userInput = (e) => {
    setCurrVal(e.target.value);
  };

  const parseMarkdown = (markdown) => {
    const rawHtml = marked.parse(markdown);
    return DOMPurify.sanitize(rawHtml);
  };

  const handleClick = async (e) => {
    e.preventDefault();

    if (!currVal.trim() && !uploadResponse) return;

    setIsOutputVisible(true);
    setIsLoading(true);
    setSearchedContent("Scanning distant galaxies for cosmic wisdom...");

    try {
      if (uploadResponse) {
        setSearchedContent(uploadResponse.geminiResponse);
      } else {
        const token = await user.getIdToken();
        const response = await axios.post(
          "http://localhost:8080/search",
          { name: currVal },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setSearchedContent(response.data);
      }
    } catch (error) {
      console.error("API Error:", error);
      setSearchedContent(
        "🛰️ Houston, we have a problem! The cosmic servers seem to be in another dimension. Please check your backend connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setIsImageUploading(true);
  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await axios.post("http://localhost:8080/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setUploadResponse(res.data); // ✅ Just store it, don't show yet
    setImagePreview(URL.createObjectURL(file));
  } catch (err) {
    console.error("Upload failed", err);
    setSearchedContent("🛸 Failed to upload or process the image.");
    setIsOutputVisible(true); // Show error output
  } finally {
    setIsImageUploading(false);
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Nebula-like background elements */}
        <div
          className="absolute w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"
          style={{ top: "10%", left: "20%", animationDuration: "12s" }}
        />
        <div
          className="absolute w-80 h-80 bg-cyan-400/5 rounded-full blur-3xl animate-pulse"
          style={{
            bottom: "20%",
            right: "15%",
            animationDuration: "10s",
            animationDelay: "2s",
          }}
        />
        <div
          className="absolute w-60 h-60 bg-pink-500/5 rounded-full blur-3xl animate-pulse"
          style={{
            top: "60%",
            left: "60%",
            animationDuration: "14s",
            animationDelay: "4s",
          }}
        />

        {/* Enhanced stars */}
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-twinkle"
            style={{
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              background:
                i % 3 === 0 ? "#00ffff" : i % 3 === 1 ? "#ffffff" : "#ff69b4",
              borderRadius: "50%",
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.8 + 0.2,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}

        {/* Shooting stars */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-0"
            style={{
              top: `${Math.random() * 40 + 10}%`,
              left: `${Math.random() * 20}%`,
              animation: "shoot 12s linear infinite",
              animationDelay: `${i * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center space-y-8">
          {!user ? (
            <div className="text-center text-white max-w-2xl backdrop-blur-sm bg-white/5 rounded-3xl p-8 border border-purple-500/20">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🌌</span>
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Welcome to Celestial Chatbot
              </h2>
              <p className="text-lg mb-8 text-gray-200 leading-relaxed">
                Embark on an interstellar journey through the cosmos. Ask
                questions about space exploration, celestial phenomena, and the
                mysteries of the universe. Our AI navigator is ready to guide
                you through the stars.
              </p>
              <button
                onClick={loginWithGoogle}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center space-x-3 mx-auto"
              >
                <span>🚀</span>
                <span>Launch into Space</span>
              </button>
            </div>
          ) : (
            <>
              {/* Corrected Solar System Animation */}
              <div className="relative w-full h-40 flex justify-center items-center mb-6 overflow-visible">
                <div className="relative w-32 h-32 z-10">
                  {/* Central star (Sun) */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full shadow-lg shadow-yellow-400/50 animate-pulse" />

                  {/* Planet 1 - Closest orbit */}
                  <div
                    className="absolute top-1/2 left-1/2 w-2 h-2 bg-red-400 rounded-full animate-orbit-fast"
                    style={{
                      transformOrigin: "0 0",
                      animation: "orbit 8s linear infinite",
                      transform: "translate(-1px, -1px)",
                    }}
                  ></div>

                  {/* Planet 2 - Middle orbit */}
                  <div
                    className="absolute top-1/2 left-1/2 w-3 h-3 bg-blue-400 rounded-full animate-orbit-medium"
                    style={{
                      transformOrigin: "0 0",
                      animation: "orbit 12s linear infinite",
                      transform: "translate(-1.5px, -1.5px)",
                    }}
                  ></div>

                  {/* Planet 3 - Outer orbit with moon */}
                  <div
                    className="absolute top-1/2 left-1/2 w-4 h-4 bg-green-400 rounded-full animate-orbit-slow"
                    style={{
                      transformOrigin: "0 0",
                      animation: "orbit 16s linear infinite",
                      transform: "translate(-2px, -2px)",
                    }}
                  >
                    <div
                      className="absolute w-1.5 h-1.5 bg-gray-300 rounded-full"
                      style={{
                        animation: "orbit 4s linear infinite",
                        transformOrigin: "12px 12px",
                        top: "-0.75px",
                        left: "-0.75px",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Enhanced Search Interface */}
              <div className="w-full max-w-5xl bg-white/10 backdrop-blur-xl rounded-3xl border border-purple-500/30 shadow-2xl p-8 relative overflow-hidden">
                {/* Subtle inner glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-3xl" />

                <div className="relative space-y-6">
                  <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">
                      Cosmic Query Interface
                    </h1>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={currVal}
                          onChange={userInput}
                          placeholder="e.g., How do black holes form? What is dark matter?"
                          className="w-full px-6 py-5 bg-white/15 backdrop-blur-md border border-cyan-400/40 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 text-lg shadow-inner"
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleClick(e)
                          }
                        />
                      </div>
                      <button
                        onClick={handleClick}
                        disabled={(!currVal.trim() && !uploadResponse) || isLoading}
                        className="px-8 py-5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-2xl flex items-center space-x-3 min-w-fit relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                        <BiotechIcon className="relative z-10" />
                        <span className="relative z-10">
                          {isLoading ? "Searching..." : "Explore Cosmos"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Enhanced Image Upload Section */}
                  <div className="w-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-cyan-400/30 shadow-xl overflow-hidden relative">
                    {/* Animated border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-pink-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

                    <div className="relative p-6">
                      {/* Upload Area */}
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          disabled={isImageUploading}
                        />

                        <div
                          className={`
                          relative border-2 border-dashed rounded-xl p-8 transition-all duration-300
                          ${
                            isImageUploading
                              ? "border-purple-400/50 bg-purple-500/10"
                              : "border-cyan-400/40 hover:border-cyan-400/70 hover:bg-cyan-400/5"
                          }
                        `}
                        >
                          <div className="text-center">
                            {isImageUploading ? (
                              <div className="space-y-3">
                                <div className="w-12 h-12 mx-auto relative">
                                  <div className="w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg animate-pulse">
                                      🛸
                                    </span>
                                  </div>
                                </div>
                                <p className="text-purple-300 font-medium">
                                  Analyzing cosmic imagery...
                                </p>
                                <p className="text-sm text-purple-400/80">
                                  Decoding stellar patterns
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div>
                                  <p className="text-white font-medium mb-1">
                                    Upload an image from the cosmos
                                  </p>
                                </div>
                                <div className="flex items-center justify-center space-x-2 mt-4">
                                  <div className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-full border border-cyan-400/30">
                                    <span className="text-cyan-300 text-sm font-medium">
                                      Click to browse
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Image Preview */}
                      {imagePreview && (
                        <div className="mt-6 animate-fade-in">
                          <div className="flex items-center space-x-2 mb-3">
                            <span className="text-sm text-cyan-300 font-medium">
                              Preview:
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-cyan-400/30 to-transparent"></div>
                          </div>
                          <div className="relative group">
                            <img
                              src={imagePreview}
                              alt="Cosmic Preview"
                              className="w-full max-h-64 object-contain rounded-xl border border-cyan-400/50 shadow-lg transition-all duration-300 group-hover:shadow-cyan-400/25"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Enhanced Output Section */}
                  {isOutputVisible && (
                    <div className="bg-white/15 backdrop-blur-md rounded-2xl border border-purple-400/30 p-6 max-h-96 overflow-y-auto animate-fade-in relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-t-2xl" />

                      <div className="prose prose-invert max-w-none">
                        {isLoading ? (
                          <div className="flex flex-col items-center space-y-4 text-cyan-300 py-8">
                            {/* Space-themed loading animation */}
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl animate-pulse">
                                  🛸
                                </span>
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-medium mb-2">
                                Traversing the cosmic web...
                              </p>
                              <p className="text-sm text-cyan-400/80">
                                {
                                  [
                                    "Consulting the stellar archives...",
                                    "Downloading data from distant quasars...",
                                    "Analyzing cosmic background radiation...",
                                    "Decoding messages from the void...",
                                    "Calibrating quantum flux capacitors...",
                                  ][Math.floor(Math.random() * 5)]
                                }
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="text-gray-100 space-y-4 leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: parseMarkdown(searchedContent),
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <AdvancedSearchButton />
            </>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default Home;
