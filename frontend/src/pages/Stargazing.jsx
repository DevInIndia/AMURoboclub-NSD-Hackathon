import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Stargazing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col text-white relative overflow-hidden">
      {/* Stars in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-twinkle"
            style={{
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              background: "white",
              borderRadius: "50%",
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.3,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <Header />

      <main className="flex-1 z-10 flex flex-col items-center justify-center text-center px-6 py-16 space-y-10">
        <div className="max-w-4xl bg-white/10 backdrop-blur-md p-10 rounded-3xl border border-purple-500/20 shadow-2xl">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Stargazing Guide 🌠
          </h1>
          <p className="text-lg text-gray-200 mb-6 leading-relaxed">
            Stargazing is the ancient act of looking up and connecting with the cosmos.
            Whether you're using a telescope or just your eyes, the night sky holds endless
            wonder. Discover constellations, track planets, and witness celestial events
            like meteor showers and lunar eclipses.
          </p>
          <p className="text-gray-300">
            Tip: Find a dark, clear spot away from city lights, let your eyes adjust,
            and simply look up — the universe has stories to tell. 🌌
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Stargazing;
