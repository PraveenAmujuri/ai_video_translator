import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import PixelBlast from "../components/ui/PixelBlast";

export default function FeedbackPage({ type }) {
  const { isDark } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [extra, setExtra] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState("");

  const isBug = type === "bug";
  const typeLabel = isBug ? "Issue Report" : "Feature Request";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !title.trim() || !description.trim()) {
      setStatus("error");
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          name: name.trim(),
          email: email.trim(),
          title: title.trim(),
          description: description.trim(),
          extra: extra.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit feedback.");
      }

      setStatus("success");
      setName("");
      setEmail("");
      setTitle("");
      setDescription("");
      setExtra("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-80px)] w-full flex flex-col md:flex-row relative transition-colors duration-300 pt-24 pb-12 overflow-x-hidden"
      style={{ background: isDark ? "#000000" : "#f8fafc" }}
    >
      {/* LEFT COLUMN - PixelBlast Interactive Canvas Card */}
      <div className="absolute inset-0 md:relative w-full md:w-[45%] lg:w-[50%] p-4 flex flex-col justify-stretch z-0 pointer-events-none md:pointer-events-auto">
        <div
          className="relative flex-1 min-h-screen md:min-h-0 rounded-[24px] overflow-hidden transition-all duration-300"
          style={{
            backgroundColor: isDark ? "#000000" : "#ffffff",
          }}
        >
          {/* Halftone Canvas */}
          <PixelBlast
            color={isDark ? "#f97316" : "#ea580c"}
            pixelSize={3}
            patternScale={2}
            patternDensity={1}
            transparent={true}
            liquid={false}
            edgeFade={0.5}
          />
        </div>
      </div>

      {/* RIGHT COLUMN - Centered Form Column */}
      <div className="flex-grow w-full flex flex-col justify-center items-center p-4 md:p-6 lg:p-8 z-10 pointer-events-auto">
        <div className="w-full max-w-[420px] flex flex-col p-5 sm:p-7 rounded-[28px] border border-neutral-200/40 dark:border-neutral-800/40 bg-white/80 dark:bg-black/60 backdrop-blur-md shadow-xl md:border-none md:bg-transparent md:backdrop-blur-none md:shadow-none md:p-0">
          {/* Back button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium mb-5 transition-opacity hover:opacity-80"
            style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>

          {status === "success" ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-9 h-9 text-orange-500" />
                <h2 className="text-xl font-bold tracking-tight" style={{ color: isDark ? "#ffffff" : "#08090a" }}>
                  Thank you!
                </h2>
              </div>
              <p className="text-xs leading-relaxed mb-6" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
                We received your {typeLabel.toLowerCase()} and sent a confirmation email to your inbox. Your feedback helps us build a better translation experience.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="w-full py-2.5 px-4 rounded-xl text-white font-semibold transition-all duration-200 text-xs shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  boxShadow: "0 4px 20px -2px rgba(249, 115, 22, 0.4)",
                }}
              >
                Submit another response
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight leading-tight mb-1.5" style={{ color: isDark ? "#ffffff" : "#08090a" }}>
                  {isBug ? "Report an issue" : "Request a feature"}
                </h1>
                <p className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)" }}>
                  {isBug
                    ? "Found a run exception or playback bug? Let us know."
                    : "Have an expansion idea for EchoX? Detail it below."}
                </p>
              </div>

              {status === "error" && (
                <div
                  className="p-3.5 mb-4 rounded-xl border flex items-start gap-3 text-xs transition-all duration-300"
                  style={{
                    backgroundColor: isDark ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.02)",
                    borderColor: "rgba(239, 68, 68, 0.15)",
                    color: isDark ? "#ef4444" : "#dc2626",
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name & Email side-by-side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.48)" }}>
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border transition-all duration-200 focus:outline-none focus:border-orange-500 text-xs"
                      style={{
                        backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)",
                        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
                        color: isDark ? "#ffffff" : "#000000",
                      }}
                      disabled={status === "loading"}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.48)" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border transition-all duration-200 focus:outline-none focus:border-orange-500 text-xs"
                      style={{
                        backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)",
                        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
                        color: isDark ? "#ffffff" : "#000000",
                      }}
                      disabled={status === "loading"}
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.48)" }}>
                    {isBug ? "Issue Title" : "Feature Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isBug ? "e.g. Export panel crash on 4K renders" : "e.g. YouTube translation history"}
                    className="w-full px-3 py-2 rounded-xl border transition-all duration-200 focus:outline-none focus:border-orange-500 text-xs placeholder:text-neutral-500"
                    style={{
                      backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)",
                      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
                      color: isDark ? "#ffffff" : "#000000",
                    }}
                    disabled={status === "loading"}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.48)" }}>
                    {isBug ? "Description" : "Details"}
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isBug ? "Provide a summary of the exception behavior..." : "Describe the functionality and what you want to accomplish..."}
                    className="w-full px-3 py-2 rounded-xl border transition-all duration-200 focus:outline-none focus:border-orange-500 min-h-[70px] max-h-[120px] resize-y text-xs placeholder:text-neutral-500"
                    style={{
                      backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)",
                      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
                      color: isDark ? "#ffffff" : "#000000",
                    }}
                    disabled={status === "loading"}
                  />
                </div>

                {/* Extra details (optional) */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.48)" }}>
                    {isBug ? "Steps to Reproduce (Optional)" : "Use Cases (Optional)"}
                  </label>
                  <textarea
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    placeholder={isBug ? "1. Click Upload...\n2. Run pipeline...\n3. Inspect logs..." : "How this addition helps your specific workflows..."}
                    className="w-full px-3 py-2 rounded-xl border transition-all duration-200 focus:outline-none focus:border-orange-500 min-h-[60px] max-h-[100px] resize-y text-xs placeholder:text-neutral-500 font-mono"
                    style={{
                      backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)",
                      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
                      color: isDark ? "#ffffff" : "#000000",
                    }}
                    disabled={status === "loading"}
                  />
                </div>

                <div className="pt-1.5">
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-all duration-300 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border relative overflow-hidden group shadow-sm hover:scale-[1.01] active:scale-[0.99] ${
                      isDark
                        ? "text-zinc-300 hover:text-white border-orange-500/20 hover:border-orange-500 bg-white/[0.02] hover:bg-orange-500/[0.08] hover:shadow-[0_0_20px_-3px_rgba(249,115,22,0.3)]"
                        : "text-zinc-700 hover:text-orange-600 border-orange-600/20 hover:border-orange-600 bg-black/[0.02] hover:bg-orange-600/[0.04] hover:shadow-[0_0_20px_-3px_rgba(234,88,12,0.15)]"
                    }`}
                  >
                    {/* Shimmer reflection sweep */}
                    <span className="absolute inset-y-0 -left-[150%] w-[50%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] transition-all duration-700 group-hover:left-[150%] ease-in-out pointer-events-none" />

                    {status === "loading" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
