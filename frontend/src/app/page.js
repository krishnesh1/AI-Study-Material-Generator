"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  ClipboardPaste, 
  ArrowRight, 
  CheckCircle2, 
  CircleDashed, 
  FileText, 
  BrainCircuit, 
  Image as ImageIcon, 
  Copy, 
  Download, 
  Video, 
  AlignLeft,
  RefreshCw
} from "lucide-react";

const PROCESSING_STEPS = [
  "Fetching Transcript & Subtitles",
  "AI Concept Mapping & Synthesis",
  "Generating High-Yield Notes & Quiz",
  "Finalizing Study Material"
];

export default function Home() {
  const [inputMode, setInputMode] = useState("url"); // "url" | "text"
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("notes");
  const [quizState, setQuizState] = useState({});
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState("English");
  const [copied, setCopied] = useState(false);

  const handlePasteUrl = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setUrl(clipboardText);
    } catch (err) {
      console.error("Failed to read clipboard", err);
    }
  };

  const handlePasteText = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
    } catch (err) {
      console.error("Failed to read clipboard", err);
    }
  };

  const processVideo = async () => {
    if (inputMode === "url" && !url.trim()) return;
    if (inputMode === "text" && !text.trim()) return;

    setIsProcessing(true);
    setResult(null);
    setError(null);
    setCurrentStep(0);
    setProgressMsg("Starting AI synthesis...");

    try {
      setCurrentStep(1);
      const payload = {
        language: language,
        ...(inputMode === "url" ? { url: url.trim() } : { text: text.trim() })
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/process-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.statusText}`);
      }
      
      setCurrentStep(2);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        let parts = buffer.split('\n\n');
        buffer = parts.pop(); 
        
        for (const part of parts) {
          if (part.startsWith('data: ')) {
            try {
              const data = JSON.parse(part.substring(6));
              if (data.status === "progress") {
                if (data.message) setProgressMsg(data.message);
                setCurrentStep(2);
              } else if (data.status === "completed") {
                setCurrentStep(3);
                setResult(data);
                setQuizState({});
              } else if (data.status === "error") {
                setError(data.message);
                setResult(null);
                return;
              }
            } catch (e) {
              console.error("Error parsing stream chunk", e, part);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to process request.");
      setResult(null);
    } finally {
      setCurrentStep(4);
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const handleQuizAnswer = (qId, option) => {
    setQuizState(prev => ({
      ...prev,
      [qId]: option
    }));
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = `# ${result.title}\n\n## Summary\n${result.summary}\n\n## Key Takeaways\n${(result.key_points || []).map(p => `- ${p}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-blue-500/30">
      {/* Hero Section */}
      <section className="relative pt-20 pb-12 px-4 md:pt-28 overflow-hidden flex flex-col items-center text-center print:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 font-medium text-sm mb-6 border border-blue-500/20 shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          Fast AI Study Companion
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-900 to-gray-700 dark:from-white dark:via-blue-200 dark:to-gray-300"
        >
          Turn any YouTube video into <br className="hidden md:block"/>
          <span className="text-blue-500">Study Notes & Interactive Quizzes</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-[var(--muted-foreground)] max-w-2xl mb-8"
        >
          Paste any YouTube link or text. Our multimodal AI will instantly generate structured summaries, exam key takeaways, visual insights, and a 5-question comprehension quiz in seconds.
        </motion.p>

        {/* Mode Selector Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex p-1 bg-[var(--muted)]/60 rounded-xl border border-[var(--border)] mb-4"
        >
          <button
            onClick={() => setInputMode("url")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${inputMode === "url" ? "bg-[var(--card)] text-blue-600 dark:text-blue-400 shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          >
            <Video className="w-4 h-4" />
            YouTube URL
          </button>
          <button
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${inputMode === "text" ? "bg-[var(--card)] text-blue-600 dark:text-blue-400 shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          >
            <AlignLeft className="w-4 h-4" />
            Paste Notes / Transcript
          </button>
        </motion.div>

        {/* Input Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-2xl relative flex flex-col gap-3"
        >
          {inputMode === "url" ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 group">
                <input 
                  type="text" 
                  placeholder="Paste YouTube video or playlist URL..." 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && processVideo()}
                  className="w-full pl-6 pr-12 py-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm text-lg placeholder:text-gray-400"
                />
                <button 
                  onClick={handlePasteUrl}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 bg-transparent border-none cursor-pointer"
                  title="Paste from clipboard"
                >
                  <ClipboardPaste className="w-5 h-5" />
                </button>
              </div>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-4 py-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm text-base cursor-pointer"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Hindi">Hindi</option>
                <option value="Nepali">Nepali</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="Portuguese">Portuguese</option>
              </select>
              <button 
                onClick={processVideo}
                disabled={isProcessing || !url.trim()}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
              >
                {isProcessing ? "Processing..." : "Generate"}
                {!isProcessing && <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <textarea 
                  rows={6}
                  placeholder="Paste lecture transcript, article, notes, or topic text here..." 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm text-base placeholder:text-gray-400 resize-y"
                />
                <button 
                  onClick={handlePasteText}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1.5 bg-[var(--card)] rounded-lg border border-[var(--border)] cursor-pointer"
                  title="Paste from clipboard"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center gap-2">
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:border-blue-500 outline-none text-sm cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Nepali">Nepali</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                  <option value="Portuguese">Portuguese</option>
                </select>
                <button 
                  onClick={processVideo}
                  disabled={isProcessing || !text.trim()}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
                >
                  {isProcessing ? "Processing..." : "Generate Study Notes"}
                  {!isProcessing && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {inputMode === "url" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex flex-wrap gap-2 justify-center"
          >
            <span className="text-sm text-[var(--muted-foreground)] mr-2 self-center">Try sample:</span>
            {[
              { label: "Data Structures & Lists", url: "https://www.youtube.com/watch?v=RQ8IgK8z1y8" },
              { label: "Next.js Tutorial", url: "https://www.youtube.com/watch?v=yQhPWGzQZYQ" }
            ].map((sample, i) => (
              <button 
                key={i}
                onClick={() => setUrl(sample.url)}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--muted)] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors border border-[var(--border)] cursor-pointer"
              >
                {sample.label}
              </button>
            ))}
          </motion.div>
        )}
      </section>

      {/* Processing State */}
      <AnimatePresence>
        {isProcessing && (
          <motion.section 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-3xl mx-auto px-4 py-8"
          >
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                Synthesizing Study Material
              </h3>
              {progressMsg && (
                <p className="text-sm text-[var(--muted-foreground)] mb-6">{progressMsg}</p>
              )}
              <div className="space-y-4">
                {PROCESSING_STEPS.map((step, index) => {
                  const isCompleted = index < currentStep;
                  const isCurrent = index === currentStep;
                  
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`transition-colors duration-300 ${isCompleted ? 'text-green-500' : isCurrent ? 'text-blue-500' : 'text-gray-400'}`}>
                        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : isCurrent ? <CircleDashed className="w-6 h-6 animate-spin" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-700" />}
                      </div>
                      <span className={`text-base transition-colors duration-300 ${isCompleted || isCurrent ? 'text-[var(--foreground)] font-medium' : 'text-[var(--muted-foreground)]'}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && !isProcessing && (
          <motion.section 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-3xl mx-auto px-4 py-6"
          >
            <div className="bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Processing Notice</h3>
                <p className="text-sm leading-relaxed">{error}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setInputMode("text"); setError(null); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all cursor-pointer"
                >
                  Switch to Direct Text / Notes Tab
                </button>
                <button
                  onClick={() => processVideo()}
                  className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] text-sm font-medium rounded-xl hover:bg-[var(--muted)] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Results Dashboard */}
      <AnimatePresence>
        {result && !isProcessing && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto px-4 pb-24"
          >
            <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden print:border-none print:shadow-none">
              
              {/* Header */}
              <div className="p-6 border-b border-[var(--border)] bg-[var(--muted)]/30 print:border-none print:bg-transparent print:p-0 print:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">{result.title}</h2>
                <div className="flex items-center gap-2 print:hidden">
                  <button onClick={handleCopy} className="p-2 text-sm flex items-center gap-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors cursor-pointer">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} 
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button onClick={handleDownload} className="p-2 text-sm flex items-center gap-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors cursor-pointer">
                    <Download className="w-4 h-4" /> Print / PDF
                  </button>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-[var(--border)] overflow-x-auto no-scrollbar print:hidden">
                {[
                  { id: "notes", label: "Study Notes", icon: FileText },
                  { id: "quiz", label: `Interactive Quiz (${result.quiz?.length || 5})`, icon: BrainCircuit },
                  { id: "visuals", label: "Key Visuals", icon: ImageIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors relative whitespace-nowrap cursor-pointer ${activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 md:p-8 min-h-[400px]">
                
                {/* Notes Tab */}
                {activeTab === "notes" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    <div className="prose dark:prose-invert max-w-none">
                      <h3 className="text-xl font-semibold mb-3 text-blue-600 dark:text-blue-400">Core Summary</h3>
                      <div className="text-base md:text-lg leading-relaxed text-[var(--foreground)] whitespace-pre-line space-y-4">
                        {result.summary}
                      </div>
                      
                      <div className="my-8 border-t border-[var(--border)]" />
                      
                      <h3 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">Key Takeaways</h3>
                      <ul className="space-y-3">
                        {(result.key_points || []).map((point, idx) => (
                          <li key={idx} className="flex gap-3 text-base md:text-lg">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}

                {/* Quiz Tab */}
                {activeTab === "quiz" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    <div className="grid gap-6">
                      {(result.quiz || []).map((q, idx) => {
                        const selectedAnswer = quizState[q.id];
                        const isCorrect = selectedAnswer === q.correct_answer;
                        const hasAnswered = !!selectedAnswer;

                        return (
                          <div key={q.id || idx} className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20">
                            <h4 className="text-lg font-medium mb-4 flex gap-3">
                              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                              </span>
                              {q.question}
                            </h4>
                            
                            <div className="space-y-3 pl-11">
                              {(q.options || []).map((opt, oIdx) => {
                                let btnClass = "w-full text-left p-4 rounded-xl border transition-all cursor-pointer ";
                                if (hasAnswered) {
                                  if (opt === q.correct_answer) {
                                    btnClass += "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400 font-medium";
                                  } else if (opt === selectedAnswer) {
                                    btnClass += "bg-red-500/10 border-red-500 text-red-700 dark:text-red-400";
                                  } else {
                                    btnClass += "border-[var(--border)] opacity-50";
                                  }
                                } else {
                                  btnClass += "border-[var(--border)] hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10";
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => !hasAnswered && handleQuizAnswer(q.id, opt)}
                                    disabled={hasAnswered}
                                    className={btnClass}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <AnimatePresence>
                              {hasAnswered && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className={`mt-4 pl-11 p-4 rounded-xl ${isCorrect ? 'bg-green-500/10 text-green-800 dark:text-green-300' : 'bg-red-500/10 text-red-800 dark:text-red-300'}`}
                                >
                                  <p className="font-semibold mb-1">{isCorrect ? 'Correct!' : 'Incorrect.'}</p>
                                  <p className="text-sm opacity-90">{q.explanation}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Visuals Tab */}
                {activeTab === "visuals" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(result.visual_insights || []).map((visual, idx) => (
                        <div key={idx} className="group rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--card)] hover:shadow-md transition-all">
                          <div className="aspect-video bg-[var(--muted)] flex items-center justify-center relative overflow-hidden">
                            {visual.image_url ? (
                              <img src={visual.image_url} alt="Keyframe" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-[var(--muted-foreground)]">
                                <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                                <span className="text-sm">Video Frame at {visual.timestamp}</span>
                              </div>
                            )}
                            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-xs font-mono">
                              {visual.timestamp}
                            </div>
                          </div>
                          <div className="p-4">
                            <p className="text-sm text-[var(--foreground)]">{visual.description}</p>
                          </div>
                        </div>
                      ))}
                      {(!result.visual_insights || result.visual_insights.length === 0) && (
                        <div className="col-span-full py-12 text-center text-[var(--muted-foreground)]">
                          No visual insights extracted for this video.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
