"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ClipboardPaste, ArrowRight, CheckCircle2, CircleDashed, FileText, BrainCircuit, Image as ImageIcon, Copy, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";

const MOCK_DATA = {
  title: "Understanding React Server Components",
  summary: "This video introduces React Server Components, explaining how they work to improve performance by rendering components on the server and sending only the serialized UI to the client. It covers the differences between Client and Server components and when to use each.",
  key_points: [
    "Server Components run exclusively on the server, resulting in zero bundle size for those components.",
    "Client Components are interactive and render on the client side.",
    "You can interleave Server and Client components in a Next.js application.",
    "Fetching data in Server Components is simpler and more direct.",
  ],
  visual_insights: [
    { timestamp: "02:15", description: "Architecture diagram showing server rendering vs client rendering." },
    { timestamp: "08:30", description: "Code snippet demonstrating fetching data inside a Server Component." },
    { timestamp: "12:45", description: "Comparison table of features between Server and Client components." }
  ],
  quiz: [
    {
      id: 1,
      question: "What is the primary benefit of React Server Components?",
      options: ["Increased interactivity", "Zero bundle size for server components", "Better CSS styling", "Faster local development"],
      correct_answer: "Zero bundle size for server components",
      explanation: "Server components are never sent to the client as JS, meaning they add zero bytes to the client-side JavaScript bundle."
    },
    {
      id: 2,
      question: "Can Server Components have state using useState?",
      options: ["Yes, always", "Only if they are inside a Client Component", "No, they cannot have state", "Yes, but it is deprecated"],
      correct_answer: "No, they cannot have state",
      explanation: "Server components run on the server and cannot handle client-side interactivity like state or effects."
    }
  ]
};

const PROCESSING_STEPS = [
  "Fetching Transcript",
  "Scanning Keyframes & Visuals",
  "AI Synthesis & Chunking",
  "Finalizing Notes & Quiz"
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("notes");
  const [quizState, setQuizState] = useState({});
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState("English");

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      console.error("Failed to read clipboard", err);
    }
  };

  const processVideo = async () => {
    if (!url) return;
    setIsProcessing(true);
    setResult(null);
    setError(null);
    setCurrentStep(0);

    // Simulate progress steps
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= 3) {
          clearInterval(stepInterval);
          return 3;
        }
        return prev + 1;
      });
    }, 2000);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, language: language }),
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to process video: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to process video.");
      setResult(null);
    } finally {
      clearInterval(stepInterval);
      setCurrentStep(4);
      setTimeout(() => setIsProcessing(false), 1000);
    }
  };

  const handleQuizAnswer = (qId, option) => {
    setQuizState(prev => ({
      ...prev,
      [qId]: option
    }));
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = `# ${result.title}\n\n## Summary\n${result.summary}\n\n## Key Takeaways\n${result.key_points.map(p => `- ${p}`).join('\n')}`;
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
      <section className="relative pt-24 pb-16 px-4 md:pt-32 overflow-hidden flex flex-col items-center text-center print:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-500 font-medium text-sm mb-6 border border-blue-500/20 shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          AI-Powered Learning Companion
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400"
        >
          Turn any YouTube video into <br className="hidden md:block"/>
          <span className="text-blue-500">Study Notes & Quizzes</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-[var(--muted-foreground)] max-w-2xl mb-10"
        >
          Paste a link and our multimodal AI will instantly generate comprehensive notes, extract key visual frames, and create interactive quizzes to test your knowledge.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-2xl relative flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1 group">
            <input 
              type="text" 
              placeholder="Paste YouTube URL here..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-6 pr-12 py-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm text-lg placeholder:text-gray-400"
            />
            <button 
              onClick={handlePaste}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 bg-transparent border-none cursor-pointer"
              title="Paste from clipboard"
            >
              <ClipboardPaste className="w-5 h-5" />
            </button>
          </div>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-4 py-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm text-lg cursor-pointer"
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
            disabled={isProcessing || !url}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98]"
          >
            {isProcessing ? "Processing..." : "Generate"}
            {!isProcessing && <ArrowRight className="w-5 h-5" />}
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-wrap gap-2 justify-center"
        >
          <span className="text-sm text-[var(--muted-foreground)] mr-2 self-center">Try these:</span>
          {["https://youtu.be/T-hmkz7oGhw", "https://youtu.be/8m1f3i_fK_A"].map((sampleUrl, i) => (
            <button 
              key={i}
              onClick={() => setUrl(sampleUrl)}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--muted)] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors border border-[var(--border)] cursor-pointer"
            >
              Video {i + 1}
            </button>
          ))}
        </motion.div>
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
            <div className="glass-card rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                AI is analyzing your video...
              </h3>
              <div className="space-y-4">
                {PROCESSING_STEPS.map((step, index) => {
                  const isCompleted = index < currentStep;
                  const isCurrent = index === currentStep;
                  
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`transition-colors duration-500 ${isCompleted ? 'text-green-500' : isCurrent ? 'text-blue-500' : 'text-gray-400'}`}>
                        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : isCurrent ? <CircleDashed className="w-6 h-6 animate-spin" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-700" />}
                      </div>
                      <span className={`text-lg transition-colors duration-500 ${isCompleted || isCurrent ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
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
            className="max-w-3xl mx-auto px-4 py-8"
          >
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Error Processing Video</h3>
              <p>{error}</p>
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
              <div className="p-6 border-b border-[var(--border)] bg-[var(--muted)]/30 print:border-none print:bg-transparent print:p-0 print:mb-6">
                <h2 className="text-2xl font-bold">{result.title}</h2>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-[var(--border)] overflow-x-auto no-scrollbar print:hidden">
                {[
                  { id: "notes", label: "Study Notes", icon: FileText },
                  { id: "quiz", label: "Interactive Quiz", icon: BrainCircuit },
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
                    <div className="flex justify-end gap-2 mb-4 print:hidden">
                      <button onClick={handleCopy} className="p-2 text-sm flex items-center gap-2 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors cursor-pointer">
                        {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} 
                        {copied ? "Copied!" : "Copy"}
                      </button>
                      <button onClick={handleDownload} className="p-2 text-sm flex items-center gap-2 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors cursor-pointer">
                        <Download className="w-4 h-4" /> PDF
                      </button>
                    </div>

                    <div className="prose dark:prose-invert max-w-none">
                      <h3 className="text-xl font-semibold mb-3 text-blue-600 dark:text-blue-400">Summary</h3>
                      <p className="text-lg leading-relaxed text-[var(--foreground)]">{result.summary}</p>
                      
                      <div className="my-8 border-t border-[var(--border)]" />
                      
                      <h3 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">Key Takeaways</h3>
                      <ul className="space-y-3">
                        {result.key_points?.map((point, idx) => (
                          <li key={idx} className="flex gap-3 text-lg">
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
                      {result.quiz?.map((q, idx) => {
                        const selectedAnswer = quizState[q.id];
                        const isCorrect = selectedAnswer === q.correct_answer;
                        const hasAnswered = !!selectedAnswer;

                        return (
                          <div key={q.id} className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20">
                            <h4 className="text-lg font-medium mb-4 flex gap-3">
                              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                              </span>
                              {q.question}
                            </h4>
                            
                            <div className="space-y-3 pl-11">
                              {q.options.map((opt, oIdx) => {
                                let btnClass = "w-full text-left p-4 rounded-xl border transition-all cursor-pointer ";
                                if (hasAnswered) {
                                  if (opt === q.correct_answer) {
                                    btnClass += "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400";
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
                      {result.visual_insights?.map((visual, idx) => (
                        <div key={idx} className="group rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--card)] hover:shadow-md transition-all">
                          <div className="aspect-video bg-[var(--muted)] flex items-center justify-center relative overflow-hidden">
                            {visual.image_url && !visual.image_url.includes('Placeholder') ? (
                               <img src={visual.image_url} alt="Keyframe" className="w-full h-full object-cover" />
                            ) : (
                               <div className="flex flex-col items-center justify-center text-[var(--muted-foreground)]">
                                 <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                                 <span className="text-sm">Video Frame at {visual.timestamp}</span>
                               </div>
                            )}
                            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-mono">
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
