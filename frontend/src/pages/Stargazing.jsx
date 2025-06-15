import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Stargazing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col text-white relative overflow-hidden">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-twinkle"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              background:
                i % 3 === 0 ? "#00ffff" : i % 3 === 1 ? "#ffffff" : "#ff69b4",
              borderRadius: "50%",
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.3,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
        <div
          className="absolute w-96 h-96 bg-purple-500/3 rounded-full blur-3xl animate-pulse"
          style={{ top: "20%", left: "10%", animationDuration: "8s" }}
        />
        <div
          className="absolute w-80 h-80 bg-cyan-400/3 rounded-full blur-3xl animate-pulse"
          style={{
            bottom: "10%",
            right: "20%",
            animationDuration: "10s",
            animationDelay: "3s",
          }}
        />
      </div>

      <Header />

      <main className="flex-1 z-10 flex flex-col items-center justify-center text-center px-6 py-16 space-y-10">
        <div className="max-w-4xl bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl p-10 rounded-3xl border border-purple-500/30 shadow-2xl space-y-6 text-gray-200 text-left relative overflow-hidden">
          
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-3xl"></div>

          <div className="relative">
            <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
              Stargazing Guide
            </h1>

            <p className="text-gray-100 leading-relaxed mb-6">
              Welcome to your personal gateway to the cosmos! This platform
              isn't just another stargazing tool — it's your AI-powered cosmic
              guide designed to make the night sky more accessible, interactive,
              and insightful.
            </p>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-xl border border-cyan-400/20">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm">🤖</span>
                </div>
                <div>
                  <strong className="text-cyan-300">
                    AI-Powered Cosmic Q&A:
                  </strong>
                  <span className="text-gray-200 ml-2">
                    Ask questions about space, stars, black holes, or celestial
                    events — the AI responds in real-time with friendly and
                    informative answers.
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-xl border border-purple-400/20">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm">📸</span>
                </div>
                <div>
                  <strong className="text-purple-300">
                    Smart Image Uploads:
                  </strong>
                  <span className="text-gray-200 ml-2">
                    Upload images of the night sky and get insights on what
                    celestial object you've captured.
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-xl border border-green-400/20">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm">🎓</span>
                </div>
                <div>
                  <strong className="text-green-300">Beginner-Friendly:</strong>
                  <span className="text-gray-200 ml-2">
                    No background in astronomy needed. Just bring your
                    curiosity.
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-white/10 to-white/5 rounded-xl border border-yellow-400/20">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm">🔗</span>
                  </div>
                  <div>
                    <strong className="text-yellow-300">
                      Educational Integration:
                    </strong>
                    <span className="text-gray-200 ml-2">
                      We reference and encourage exploration through trusted
                      public science platforms:
                    </span>
                  </div>
                </div>
                <div className="ml-11 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      name: "NASA Night Sky Network",
                      href: "https://nightsky.jpl.nasa.gov/",
                      icon: "🚀",
                    },
                    {
                      name: "ISRO Space Research",
                      href: "https://www.isro.gov.in/",
                      icon: "🛰️",
                    },
                    {
                      name: "Heavens-Above Tracker",
                      href: "https://heavens-above.com/",
                      icon: "📡",
                    },
                    {
                      name: "TimeAndDate Astronomy Guide",
                      href: "https://www.timeanddate.com/astronomy/",
                      icon: "🗓️",
                    },
                  ].map((item, idx) => (
                    <a
                      key={idx}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center space-x-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-cyan-400/20 hover:border-cyan-300 transition-all duration-300 shadow-sm"
                    >
                      <div className="text-xl">{item.icon}</div>
                      <span className="text-sm text-cyan-300 group-hover:text-white font-medium transition">
                        {item.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-400/30">
              <p className="text-gray-100">
                🌌 <strong className="text-indigo-300">Pro Tip:</strong> For the
                best stargazing experience, find a dark place away from city
                lights, give your eyes 20–30 minutes to adjust, and let the
                night sky speak. Whether you're tracking planets or marveling at
                the Milky Way, our tools and AI will guide you.
              </p>
            </div>
          </div>
        </div>

        <section className="max-w-4xl w-full text-left space-y-8 text-gray-200">
          <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
            ✨ Stargazing Tools
          </h2>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-cyan-400/30 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm">🛰️</span>
              </div>
              <h3 className="text-xl font-semibold text-cyan-300">
                Live ISS Tracker
              </h3>
            </div>
            <iframe
              src="https://maps.esri.com/MOH/iss/"
              width="100%"
              height="400"
              title="ISS Live Tracker"
              className="rounded-xl border border-cyan-400/20 shadow-lg"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-purple-500/30 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-sm">🗺️</span>
              </div>
              <h3 className="text-xl font-semibold text-purple-300">
                Interactive Star Map
              </h3>
            </div>
            <iframe
              src="https://stellarium-web.org/"
              width="100%"
              height="500"
              title="Stellarium Sky Map"
              className="rounded-xl border border-purple-400/20 shadow-lg"
            />
          </div>

          <div className="text-center bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-pink-400/30 shadow-xl">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">🌟</span>
            </div>
            <p className="text-lg mb-4 text-gray-100">
              Want to catch the next meteor shower or lunar eclipse?
            </p>
            <a
              href="https://www.timeanddate.com/astronomy/sights-to-see.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <span>View Upcoming Celestial Events</span>
              <span>→</span>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Stargazing;
