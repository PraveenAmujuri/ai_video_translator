import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Button from "../components/ui/ShinyButton";

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
      className="min-h-screen py-24 px-6 flex flex-col justify-center items-center relative overflow-hidden transition-colors duration-300"
      style={{ background: isDark ? "#000000" : "#f8fafc" }}
    >
      {/* Background radial glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1440px] h-[500px] pointer-events-none z-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 50% 60% at 50% 0%, rgba(249, 115, 22, 0.05) 0%, rgba(249, 115, 22, 0) 100%)"
            : "radial-gradient(ellipse 50% 60% at 50% 0%, rgba(249, 115, 22, 0.03) 0%, rgba(249, 115, 22, 0) 100%)",
        }}
      />

      <div className="w-full max-w-lg z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium mb-8 transition-opacity hover:opacity-80"
          style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[32px] border p-8 md:p-10 backdrop-blur-xl transition-all duration-300"
          style={{
            backgroundColor: isDark ? "rgba(13, 14, 16, 0.8)" : "#ffffff",
            borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.07)",
            boxShadow: isDark
              ? "0 20px 40px -15px rgba(0,0,0,0.5)"
              : "0 20px 40px -15px rgba(0,0,0,0.06)",
          }}
        >
          {status === "success" ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-orange-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-3" style={{ color: isDark ? "#ffffff" : "#08090a" }}>
                Feedback Submitted!
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
                Thank you for helping us improve EchoX. A confirmation email has been sent to your inbox.
              </p>
              <Button onClick={() => setStatus("idle")} className="w-full">
                Submit Another Response
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: isDark ? "#ffffff" : "#08090a" }}>
                  {typeLabel}
                </h1>
                <p className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
                  {isBug
                    ? "Found a bug or run exception? Describe it and we'll fix it."
                    : "Have an idea or workflow expansion? Share your suggestions."}
                </p>
              </div>

              {status === "error" && (
                <div
                  className="p-4 rounded-xl border flex items-start gap-3 text-sm transition-all duration-300"
                  style={{
                    backgroundColor: isDark ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.02)",
                    borderColor: "rgba(239, 68, 68, 0.2)",
                    color: isDark ? "#ef4444" : "#dc2626",
                  }}
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:border-orange-500"
                  style={{
                    backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.02)",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    color: isDark ? "#ffffff" : "#000000",
                  }}
                  disabled={status === "loading"}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:border-orange-500"
                  style={{
                    backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.02)",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    color: isDark ? "#ffffff" : "#000000",
                  }}
                  disabled={status === "loading"}
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                  {isBug ? "Issue Title *" : "Feature Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isBug ? "e.g. Video player crash on load" : "e.g. Cloud export integration"}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:border-orange-500"
                  style={{
                    backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.02)",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    color: isDark ? "#ffffff" : "#000000",
                  }}
                  disabled={status === "loading"}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                  {isBug ? "What Happened? *" : "Describe the Feature *"}
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isBug ? "Describe the issue and what you expected to happen..." : "What goal will this feature accomplish?..."}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:border-orange-500 min-h-[120px] resize-y"
                  style={{
                    backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.02)",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    color: isDark ? "#ffffff" : "#000000",
                  }}
                  disabled={status === "loading"}
                />
              </div>

              {/* Extra details (optional) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                  {isBug ? "Steps to Reproduce / System Info (Optional)" : "Use Cases / Notes (Optional)"}
                </label>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={isBug ? "1. Click Upload\n2. Select file X\n3. Console shows: ..." : "Specify how this would improve your workflow..."}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:border-orange-500 min-h-[100px] resize-y font-mono text-sm"
                  style={{
                    backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.02)",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    color: isDark ? "#ffffff" : "#000000",
                  }}
                  disabled={status === "loading"}
                />
              </div>

              <div className="pt-2">
                <Button disabled={status === "loading"} className="w-full">
                  {status === "loading" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    `Submit ${typeLabel}`
                  )}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
