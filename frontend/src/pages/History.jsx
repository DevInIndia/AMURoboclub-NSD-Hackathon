import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
const History = () => {
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
          <h1>History</h1>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default History;
