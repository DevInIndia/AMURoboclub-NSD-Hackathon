import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

const History = () => {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPrompts = async () => {
      if (!user) return;
      const q = query(
        collection(db, "users", user.uid, "prompts"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPrompts(data);
    };
    fetchPrompts();
  }, [user]);

  const parseMarkdown = (markdown) => {
    const rawHtml = marked.parse(markdown);
    return DOMPurify.sanitize(rawHtml);
  };

  const toggleExpanded = (id) => {
  setExpandedIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
};

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.response.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col text-white relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-twinkle"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              background:
                i % 3 === 0 ? "#60a5fa" : i % 3 === 1 ? "#a78bfa" : "white",
              borderRadius: "50%",
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.2,
              animationDelay: `${Math.random() * 8}s`,
              boxShadow: "0 0 6px currentColor",
            }}
          />
        ))}
      </div>

      <Header />

      <main className="flex-1 z-10 flex flex-col items-center px-6 py-16 space-y-10">
        <div className="max-w-7xl w-full">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-4">
              🔭 Cosmic Knowledge Archive
            </h1>

            <div className="max-w-md mx-auto relative">
              <input
                type="text"
                placeholder="Search through your cosmic queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-purple-400/30 rounded-2xl px-6 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>

          {filteredPrompts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🌌</div>
              <p className="text-gray-400 text-xl mb-2">
                {searchTerm
                  ? "No matches found in the cosmic archive"
                  : "No cosmic entries yet"}
              </p>
              <p className="text-gray-500">
                {searchTerm
                  ? "Try a different search term"
                  : "Start exploring the universe of knowledge!"}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredPrompts.map((prompt) => {
                const isExpanded = expandedIds.includes(prompt.id);
                const responsePreview =
                  prompt.response.slice(0, 180) +
                  (prompt.response.length > 180 ? "..." : "");

                return (
                  <div
                    key={prompt.id}
                    className={`group relative bg-gradient-to-br from-white/12 to-white/5 backdrop-blur-lg border border-purple-400/20 rounded-2xl shadow-xl hover:shadow-purple-400/30 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-cyan-400/40 overflow-hidden flex flex-col ${
                      isExpanded 
                        ? "min-h-[600px] max-h-[800px]" 
                        : "h-[480px]"
                    }`}
                  >
                    <div className="p-5 border-b border-white/10 flex-shrink-0 bg-gradient-to-r from-white/5 to-transparent">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-cyan-300 font-bold text-base leading-tight mb-3 line-clamp-2 group-hover:text-cyan-200 transition-colors min-h-[2.5rem]">
                            {prompt.text}
                          </h3>
                          <div className="flex items-center text-gray-400 text-xs space-x-3">
                            <span className="flex items-center space-x-1">
                              <span>📅</span>
                              <span>{formatDate(prompt.createdAt)}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex space-x-2 ml-3 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleExpanded(prompt.id);
                            }}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110 text-sm"
                            title={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? "📤" : "📥"}
                          </button> 
                        </div>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col min-h-0">
                      <div
                        className={`relative flex-1 transition-all duration-500 ${
                          isExpanded
                            ? "overflow-y-auto scrollbar-hide"
                            : "overflow-hidden"
                        }`}
                      >
                        <div
                          className="text-gray-100 prose prose-invert prose-sm max-w-none leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: parseMarkdown(
                              isExpanded ? prompt.response : responsePreview
                            ),
                          }}
                        />

                        {!isExpanded && prompt.response.length > 180 && (
                          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent pointer-events-none" />
                        )}
                      </div>

                      {prompt.response.length > 180 && (
                        <div className="mt-4 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleExpanded(prompt.id);
                            }}
                            className="w-full py-2.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-400/30 rounded-xl text-cyan-300 hover:text-cyan-200 transition-all duration-300 text-sm font-medium backdrop-blur-sm hover:backdrop-blur-md"
                          >
                            {isExpanded ? "Show Less ▲" : "Show More ▼"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/10 via-purple-400/10 to-pink-400/10 animate-pulse" />
                    </div>

                   
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Scrollbar Hiding */
        .scrollbar-hide {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* Internet Explorer 10+ */
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none; /* WebKit */
        }

        /* Prose Styling */
        .prose h1,
        .prose h2,
        .prose h3 {
          color: #67e8f9;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-size: 1rem;
          line-height: 1.4;
        }

        .prose h1 {
          font-size: 1.1rem;
        }

        .prose h2 {
          font-size: 1.05rem;
        }

        .prose p {
          margin-bottom: 0.75rem;
          line-height: 1.6;
          color: #e2e8f0;
        }

        .prose ul,
        .prose ol {
          margin-left: 1rem;
          margin-bottom: 0.75rem;
          padding-left: 0.5rem;
        }

        .prose li {
          margin-bottom: 0.25rem;
          line-height: 1.5;
        }

        .prose code {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 0.15rem 0.3rem;
          border-radius: 0.25rem;
          font-size: 0.8rem;
          color: #fbbf24;
        }

        .prose pre {
          background-color: rgba(0, 0, 0, 0.4);
          padding: 0.75rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 0.75rem 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .prose pre code {
          background: none;
          padding: 0;
          color: #e2e8f0;
        }

        .prose blockquote {
          border-left: 3px solid #67e8f9;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #cbd5e1;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.75rem 1rem;
          border-radius: 0.25rem;
        }

        .prose strong {
          color: #f1f5f9;
          font-weight: 600;
        }

        .prose em {
          color: #cbd5e1;
        }

        .prose a {
          color: #67e8f9;
          text-decoration: underline;
          text-decoration-color: rgba(103, 232, 249, 0.5);
        }

        .prose a:hover {
          text-decoration-color: #67e8f9;
        }

        /* Animation */
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }

        /* Grid Auto-fit for responsive layout */
        @media (min-width: 768px) {
          .grid.gap-6.md\\:grid-cols-2.xl\\:grid-cols-3 {
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          }
        }
      `}</style>
    </div>
  );
};

export default History;