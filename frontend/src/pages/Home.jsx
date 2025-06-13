import { useState } from "react";
import BiotechIcon from "@mui/icons-material/Biotech";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdvancedSearchButton from "../components/AdvancedSearchButton";

function Home() {
  const [isOutputVisible, setIsOutputVisible] = useState(false);
  const [currVal, setCurrVal] = useState("");
  const [searchedContent, setSearchedContent] = useState(
    "Please wait, Loading..."
  );
  const [isLoading, setIsLoading] = useState(false);

  const userInput = (e) => {
    setCurrVal(e.target.value);
  };

  const handleClick = async (e) => {
    e.preventDefault();
    if (!currVal.trim()) return;

    setIsOutputVisible(true);
    setIsLoading(true);
    setSearchedContent("Searching the cosmos for answers...");

    try {
      // Make the actual API call to your backend
      const response = await axios.post("http://localhost:8080/search", {
        name: currVal,
      });
      setSearchedContent(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error("API Error:", error);
      setSearchedContent(
        "Sorry, I couldn't reach the cosmos right now. Please check if your backend server is running on http://localhost:8080"
      );
      setIsLoading(false);
    }
  };

  const date = new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      <Header/>
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center space-y-8">
        {/* Animated Space Scene */}
        <div className="relative w-full h-32 flex justify-center items-center mb-4 overflow-visible">
          {/* Pulsing Nebula Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute w-40 h-40 bg-purple-500/10 rounded-full blur-xl animate-pulse"
              style={{
                top: "20%",
                left: "30%",
                animationDuration: "8s",
              }}
            />
            <div
              className="absolute w-32 h-32 bg-cyan-400/10 rounded-full blur-lg animate-pulse"
              style={{
                bottom: "10%",
                right: "25%",
                animationDuration: "6s",
                animationDelay: "1s",
              }}
            />
          </div>

          {/* Twinkling Stars (randomly placed) */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-twinkle"
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                background: i % 2 ? "cyan" : "white",
                borderRadius: "50%",
                top: `${Math.random() * 60}%`,
                left: `${Math.random() * 100}%`,
                opacity: 0.7,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}

          {/* Shooting Star (occasional) */}
          <div
            className="absolute w-1 h-1 bg-white rounded-full opacity-0"
            style={{
              top: "15%",
              left: "5%",
              animation: "shoot 8s linear infinite",
              animationDelay: `${Math.random() * 5}s`,
            }}
          />

          {/* Orbiting Planet System */}
          <div className="relative w-24 h-24 z-10">
            {/* Central Sun */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-yellow-300 rounded-full shadow-lg shadow-yellow-400/50" />
            {/* Orbiting Planet */}
            <div className="absolute top-0 left-0 w-4 h-4 bg-purple-400 rounded-full animate-orbit">
              {/* Moon */}
              <div
                className="absolute top-0 left-0 w-2 h-2 bg-gray-200 rounded-full animate-orbit"
                style={{
                  animationDuration: "4s",
                  transformOrigin: "10px 10px",
                }}
              />
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl bg-white/10 backdrop-blur-lg rounded-2xl border border-purple-500/20 shadow-2xl p-8">
          <div className="space-y-6">
            {/* Input Form */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={currVal}
                    onChange={userInput}
                    placeholder="e.g. What is Space Station?"
                    className="w-full px-6 py-4 bg-white/20 backdrop-blur-sm border border-cyan-400/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 text-lg"
                    onKeyPress={(e) => e.key === "Enter" && handleClick(e)}
                  />
                </div>
                <button
                  onClick={handleClick}
                  disabled={!currVal.trim() || isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg flex items-center space-x-2 min-w-fit"
                >
                  <BiotechIcon />
                  <span>
                    {isLoading ? "Searching..." : "Start Conversation"}
                  </span>
                </button>
              </div>
            </div>

            {/* Output Section */}
            {isOutputVisible && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl border border-purple-400/20 p-6 max-h-96 overflow-y-auto animate-fade-in">
                <div className="prose prose-invert max-w-none">
                  {isLoading ? (
                    <div className="flex items-center space-x-3 text-cyan-300">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                      <span>Searching the cosmos for answers...</span>
                    </div>
                  ) : (
                    <div className="text-gray-100 space-y-4">
                      {searchedContent.split("\n").map((paragraph, index) => {
                        if (paragraph.startsWith("## ")) {
                          return (
                            <h2
                              key={index}
                              className="text-2xl font-bold text-yellow-400 mt-6 mb-3"
                            >
                              {paragraph.replace("## ", "")}
                            </h2>
                          );
                        } else if (paragraph.startsWith("---")) {
                          return (
                            <hr
                              key={index}
                              className="border-purple-400/30 my-4"
                            />
                          );
                        } else if (paragraph.startsWith("- ")) {
                          return (
                            <ul
                              key={index}
                              className="list-disc pl-5 space-y-1"
                            >
                              {paragraph
                                .split("\n")
                                .filter((p) => p.startsWith("- "))
                                .map((item, i) => (
                                  <li key={i} className="text-cyan-100">
                                    {item.replace("- ", "")}
                                  </li>
                                ))}
                            </ul>
                          );
                        } else if (paragraph.trim() === "") {
                          return <br key={index} />;
                        } else {
                          return (
                            <p key={index} className="leading-relaxed">
                              {paragraph}
                            </p>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <AdvancedSearchButton/>
        
      </main>

      <Footer/>
      
    </div>
  );
}

export default Home;
