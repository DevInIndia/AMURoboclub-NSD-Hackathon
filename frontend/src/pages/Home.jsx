import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CloseIcon from "@mui/icons-material/Close";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import PublicIcon from "@mui/icons-material/Public";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useAuth } from "../context/AuthContext";
import { useApi, errorMessage } from "../lib/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StarField from "../components/StarField";
import Spinner from "../components/Spinner";
import AdvancedSearchButton from "../components/AdvancedSearchButton";

const parseMarkdown = (markdown) => DOMPurify.sanitize(marked.parse(markdown || ""));

const SUGGESTIONS = [
  "How do black holes form?",
  "What is dark matter?",
  "Why does Mars look red?",
];

function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const api = useApi();
  const fileInputRef = useRef(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isAnswering, setIsAnswering] = useState(false);

  const [pendingImage, setPendingImage] = useState(null); // { preview, description }
  const [isUploading, setIsUploading] = useState(false);

  const handleAsk = async (e) => {
    e?.preventDefault();
    if (isAnswering) return;
    if (!question.trim() && !pendingImage) return;

    setIsAnswering(true);
    setError(null);
    setNotice(null);
    setAnswer(null);

    try {
      if (pendingImage) {
        // An analysed image is waiting: that description is the answer. This
        // is the one case the browser still archives itself, because the
        // description was generated before the user decided to ask about it.
        const prompt = question.trim() || "Describe this image of the night sky";
        const response = pendingImage.description;

        // Consume it so the next question is answered as a fresh text query.
        setPendingImage(null);
        setQuestion("");
        setAnswer(response);

        try {
          await api.savePrompt({ text: prompt, response });
        } catch (saveError) {
          console.error("Could not save to archive:", saveError);
          setNotice("This answer could not be saved to your archive.");
        }
      } else {
        // The backend answers and archives in one call.
        const { answer: response, archiveError } = await api.ask(question);
        setAnswer(response);
        if (archiveError) setNotice(archiveError);
      }
    } catch (err) {
      console.error("Question failed:", err);
      setError(
        errorMessage(err, "The observatory is unreachable. Please try again.")
      );
    } finally {
      setIsAnswering(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const data = await api.analyseImage(file);
      setPendingImage({
        preview: URL.createObjectURL(file),
        description: data.geminiResponse,
      });
    } catch (err) {
      console.error("Upload failed:", err);
      setError(errorMessage(err, "That image could not be analysed."));
    } finally {
      setIsUploading(false);
      // Clear the picker so choosing the same file again still fires onChange.
      e.target.value = "";
    }
  };

  const clearImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarField count={70} />

      <div className="relative flex min-h-screen flex-col">
        <Header />

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
          {authLoading ? (
            <div className="flex justify-center py-24">
              <Spinner size={44} />
            </div>
          ) : !isAuthenticated ? (
            <section className="nm-surface mx-auto max-w-2xl space-y-7 p-10 text-center animate-fade-in">
              <span className="nm-flat-space-base-md mx-auto grid h-24 w-24 place-items-center rounded-full text-accent">
                <PublicIcon style={{ fontSize: 44 }} />
              </span>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold text-slate-100">
                  Welcome to Celestial Chatbot
                </h1>
                <p className="leading-relaxed text-slate-400">
                  Ask questions about space exploration, celestial phenomena and
                  the mysteries of the universe. Show it a photograph of the sky,
                  or hand it a star&apos;s measurements and have a trained model
                  identify what kind of star it is.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="nm-button-accent flex items-center gap-2"
                >
                  <RocketLaunchIcon fontSize="small" />
                  <span>Sign in</span>
                </Link>
                <Link to="/signup" className="nm-button">
                  Create an account
                </Link>
              </div>
            </section>
          ) : (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-semibold text-slate-100">
                  Cosmic query interface
                </h1>
                <p className="text-sm text-slate-500">
                  Ask a question, or upload an image of the night sky.
                </p>
              </div>

              <form onSubmit={handleAsk} className="nm-surface space-y-6 p-7">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="How do black holes form?"
                    // Mirrors the server's cap so the limit is felt while
                    // typing rather than as a rejection after submitting.
                    maxLength={500}
                    className="nm-input flex-1"
                    aria-label="Your question about space"
                  />
                  <button
                    type="submit"
                    disabled={(!question.trim() && !pendingImage) || isAnswering}
                    className="nm-button-accent flex items-center justify-center gap-2 sm:w-44"
                  >
                    {isAnswering ? (
                      <Spinner size={18} />
                    ) : (
                      <SearchIcon fontSize="small" />
                    )}
                    <span>{isAnswering ? "Searching" : "Explore"}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuestion(suggestion)}
                      className="nm-flat-space-base-sm rounded-full px-4 py-2 text-xs text-slate-400 transition-all duration-200 hover:text-accent active:nm-inset-space-base-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <div className="nm-divider" />

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="nm-well flex w-full flex-col items-center gap-3 px-6 py-8 text-center transition-all duration-200 hover:text-accent"
                  >
                    {isUploading ? (
                      <>
                        <Spinner size={28} />
                        <span className="text-sm text-slate-400">
                          Analysing cosmic imagery
                        </span>
                      </>
                    ) : (
                      <>
                        <ImageOutlinedIcon />
                        <span className="text-sm text-slate-400">
                          Upload an image from the cosmos
                        </span>
                        <span className="text-xs text-slate-600">
                          JPG or PNG, up to 5 MB
                        </span>
                      </>
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {pendingImage && (
                    <div className="nm-card space-y-3 p-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-widest text-slate-500">
                          Ready to describe
                        </span>
                        <button
                          type="button"
                          onClick={clearImage}
                          className="nm-icon-button h-8 w-8"
                          aria-label="Remove image"
                        >
                          <CloseIcon style={{ fontSize: 16 }} />
                        </button>
                      </div>
                      <img
                        src={pendingImage.preview}
                        alt="Upload preview"
                        className="max-h-64 w-full rounded-xl object-contain"
                      />
                      <p className="text-xs text-slate-500">
                        Press Explore to see what it is.
                      </p>
                    </div>
                  )}
                </div>
              </form>

              {error && (
                <div className="nm-well p-6 text-sm text-rose-300 animate-fade-in">
                  {error}
                </div>
              )}

              {notice && (
                <div className="nm-well p-6 text-sm text-amber-300 animate-fade-in">
                  {notice}
                </div>
              )}

              {(isAnswering || answer) && (
                <section className="nm-surface p-7 animate-fade-in">
                  {isAnswering ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <Spinner size={40} />
                      <p className="text-sm text-slate-400">
                        Traversing the cosmic web
                      </p>
                    </div>
                  ) : (
                    <div
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(answer) }}
                    />
                  )}
                </section>
              )}

              <div className="flex justify-center pt-2">
                <AdvancedSearchButton />
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default Home;
