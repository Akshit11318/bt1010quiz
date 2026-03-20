import React, { useState, useEffect } from 'react';
import {
  Play, Bookmark, BookmarkCheck, ChevronRight, Home,
  Download, RotateCcw, CheckCircle2, XCircle, FileText, AlertCircle, BookOpen, Loader2,
  Sun, Moon, LogOut
} from 'lucide-react';

const BUILD_ID = import.meta.env.VITE_BUILD_ID || 'local';

const QUIZ_MODULES = [
  { id: '01', title: 'Chapter 1: Biology & Inquiry', file: '01-mcqs.tex', color: 'bg-emerald-500' },
  { id: '02', title: 'Chapter 2: Chemistry of Life', file: '02-mcqs.tex', color: 'bg-teal-500' },
  { id: '03', title: 'Chapter 3: Water and Life', file: '03-mcqs.tex', color: 'bg-cyan-500' },
  { id: '04', title: 'Chapter 4: Carbon Diversity', file: '04-mcqs.tex', color: 'bg-sky-500' },
  { id: '05', title: 'Chapter 5: Macromolecules', file: '05-mcqs.tex', color: 'bg-blue-500' },
  { id: 'all', title: 'Comprehensive Exam (All)', file: 'all.tex', color: 'bg-indigo-600' },
];

const Q2_MODULES = [
  { id: '06', title: 'Chapter 6: A Tour of the Cell', file: '06-mcqs.tex', color: 'bg-rose-500' },
  { id: '08', title: 'Chapter 8: Introduction to Metabolism', file: '08-mcqs.tex', color: 'bg-fuchsia-500' },
  { id: '12', title: 'Chapter 12: The Cell Cycle', file: '12-mcqs.tex', color: 'bg-blue-500' },
  { id: '13', title: 'Chapter 13: Meiosis & Sexual Life Cycles', file: '13-mcqs.tex', color: 'bg-cyan-500' },
  { id: '14', title: 'Chapter 14: Mendel & Gene Idea', file: '14-mcqs.tex', color: 'bg-teal-500' },
];

export default function App() {
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAns, setSelectedAns] = useState(null);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [gameState, setGameState] = useState('START'); // START, PLAYING, RESULTS
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuizTitle, setActiveQuizTitle] = useState("");
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('biomaster-tab') || 'Q2');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('biomaster-theme');
    return saved || 'light';
  });

  useEffect(() => {
    localStorage.setItem('biomaster-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('biomaster-tab', activeTab);
  }, [activeTab]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const endQuiz = () => {
    setGameState('RESULTS');
  };

  // Parse LaTeX content into Question Objects
  const parseLatex = (text) => {
    const parsedQuestions = [];
    const blocks = text.split(/\\item\s+\\textbf\{/);
    const findMatchingBrace = (input, startIndex = 0) => {
      let depth = 1;
      for (let i = startIndex; i < input.length; i++) {
        const char = input[i];
        const prev = input[i - 1];
        if (char === '{' && prev !== '\\') depth += 1;
        if (char === '}' && prev !== '\\') depth -= 1;
        if (depth === 0) return i;
      }
      return -1;
    };

    for (let i = 1; i < blocks.length; i++) {
      try {
        let block = blocks[i];

        // 1. Extract Question
        let qEnd = findMatchingBrace(block, 0);
        if (qEnd === -1) continue;
        let rawQ = block.substring(0, qEnd).trim();

        // 2. Extract Options
        let enumStart = block.indexOf('\\begin{enumerate}');
        let enumEnd = block.indexOf('\\end{enumerate}');
        if (enumStart === -1 || enumEnd === -1) continue;

        let optsText = block.substring(enumStart, enumEnd);
        let optMatches = optsText.match(/\\item\s+(.+)/g);
        let opts = optMatches ? optMatches.map(o => o.replace(/\\item\s+/, '').trim()) : [];

        // 3. Extract Answer
        let ansMatch = block.match(/\\textbf\{Answer:\}\s*([A-E])/);
        let ans = ansMatch ? ansMatch[1].charCodeAt(0) - 65 : 0;

        // 4. Extract Explanation
        let expMatch = block.match(/\\textbf\{Explanation:\}\s*(.*)/s);
        let exp = expMatch ? expMatch[1].trim() : "";

        // Cleanup LaTeX noise for clean display
        const cleanLatex = (str) => {
          const escaped = str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          return escaped
            .replace(/\\textbf\{(.*?)\}/g, '$1')
            .replace(/\\textit\{(.*?)\}/g, '$1')
            .replace(/\\\\\s*/g, ' ')
            .replace(/\\end\{enumerate\}.*/s, '')
            .replace(/\$([^$]+)\$/g, '$1')
            .replace(/\\underline\{\\hspace\{[^}]+\}\}/g, '_____')
            .replace(/(?:\\_){2,}/g, '_____')
            .replace(/\\rightarrow/g, '→')
            .replace(/\\rightleftharpoons/g, '⇌')
            .replace(/\\circ\\text\{C\}/g, '°C')
            .replace(/\\delta/g, 'δ')
            .replace(/\\mu/g, 'μ')
            .replace(/([A-Za-z0-9)\]])_\{([^}]+)\}/g, '$1<sub>$2</sub>')
            .replace(/([A-Za-z0-9)\]])_([A-Za-z0-9+-])/g, '$1<sub>$2</sub>')
            .replace(/([A-Za-z0-9)\]])\^\{([^}]+)\}/g, '$1<sup>$2</sup>')
            .replace(/([A-Za-z0-9)\]])\^([A-Za-z0-9+-])/g, '$1<sup>$2</sup>')
            .trim();
        };

        if (opts.length > 0) {
          parsedQuestions.push({
            q: cleanLatex(rawQ),
            opts: opts.map(cleanLatex),
            ans: ans,
            exp: cleanLatex(exp)
          });
        }
      } catch (e) {
        console.warn("Skipped a malformed question block", e);
      }
    }
    return parsedQuestions;
  };

  const loadQuiz = async (module) => {
    setIsLoading(true);
    setError("");

    try {
      // Fetch the file from the public/src directory (Vite serves public files from root)
      const response = await fetch(`/src/${module.file}`);

      if (!response.ok) {
        throw new Error(`Could not load ${module.file}. Please ensure the file exists in the public/src folder.`);
      }

      const text = await response.text();
      const scrapedQuestions = parseLatex(text);

      if (scrapedQuestions.length > 0) {
        // Shuffle the questions for variety
        const shuffled = scrapedQuestions.sort(() => 0.5 - Math.random());
        setQuestions(shuffled);
        setActiveQuizTitle(module.title);

        // Reset game state and start playing immediately
        setScore(0);
        setCurrentQ(0);
        setSelectedAns(null);
        setBookmarks(new Set());
        setGameState('PLAYING');
      } else {
        setError(`No valid MCQs found in ${module.file}. Please check the file formatting.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetToStart = () => {
    setQuestions([]);
    setActiveQuizTitle("");
    setActiveTab('Q2'); // Reset to Q2 when returning to start
    setGameState('START');
  };

  const handleAnswer = (index) => {
    if (selectedAns !== null) return; // Prevent changing answer
    setSelectedAns(index);
    if (index === questions[currentQ].ans) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAns(null);
    } else {
      setGameState('RESULTS');
    }
  };

  const toggleBookmark = () => {
    const newBookmarks = new Set(bookmarks);
    if (newBookmarks.has(currentQ)) {
      newBookmarks.delete(currentQ);
    } else {
      newBookmarks.add(currentQ);
    }
    setBookmarks(newBookmarks);
  };

  const exportBookmarks = () => {
    if (bookmarks.size === 0) return;
    let content = `BioMaster - Saved Notes (${activeQuizTitle})\n`;
    content += "=========================================\n\n";

    Array.from(bookmarks).sort((a, b) => a - b).forEach((index) => {
      const q = questions[index];
      content += `Q: ${q.q}\n`;
      content += `Answer: ${q.opts[q.ans]}\n`;
      content += `Explanation: ${q.exp}\n`;
      content += "-----------------------------------------\n\n";
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BioMaster_Saved_Notes_${activeQuizTitle.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Screens ---

  if (gameState === 'START') {
    return (
      <div className={`relative flex flex-col h-[calc(100dvh-1rem)] mt-2 max-w-lg mx-auto ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} rounded-2xl overflow-hidden font-sans`}>
        {/* Header with Theme Toggle */}
        <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b px-4 sm:px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <h1 className={`text-xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>BT1010</h1>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-600'} shadow-sm border ${theme === 'dark' ? 'border-slate-600' : 'border-slate-200'} hover:scale-105 transition-transform`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Tabs */}
        <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex gap-2 px-4 sm:px-6 py-3`}>
          {['Q1', 'Q2', 'ENDSEM'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab
                ? 'bg-blue-600 text-white shadow-md'
                : theme === 'dark'
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 flex flex-col items-center">
          {/* Q1 Tab - All Quiz Modules */}
          {activeTab === 'Q1' && (
            <>
              <div className="text-center mb-8 w-full">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2`}>Quizzes</h2>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-sm`}>
                  Select a chapter to begin your quiz.
                </p>
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-2 text-red-600 bg-red-50 p-4 rounded-2xl w-full text-sm font-medium border border-red-100">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="w-full space-y-3">
                {QUIZ_MODULES.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => loadQuiz(module)}
                    disabled={isLoading}
                    className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-slate-100 hover:border-blue-300'} p-4 rounded-2xl shadow-sm border hover:shadow-md transition-all flex items-center gap-4 text-left active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${module.color}`}>
                      {isLoading ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <FileText className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-[15px]`}>{module.title}</h3>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} font-medium font-mono mt-0.5`}>{module.file}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Q2 Tab */}
          {activeTab === 'Q2' && (
            <>
              <div className="text-center mb-6 w-full">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2`}>Q2 Chapters (06-14)</h2>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-sm`}>
                  Start chapter-wise quiz practice.
                </p>
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-2 text-red-600 bg-red-50 p-4 rounded-2xl w-full text-sm font-medium border border-red-100">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="w-full space-y-3">
                {Q2_MODULES.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => loadQuiz(module)}
                    disabled={isLoading}
                    className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-slate-100 hover:border-blue-300'} p-4 rounded-2xl shadow-sm border hover:shadow-md transition-all flex items-center gap-4 text-left active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${module.color}`}>
                      {isLoading ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <FileText className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-[15px]`}>{module.title}</h3>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} font-medium font-mono mt-0.5`}>{module.file}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ENDSEM Tab - Coming Soon */}
          {activeTab === 'ENDSEM' && (
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <FileText className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
              </div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2`}>ENDSEM</h3>
              <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-sm`}>
                Coming soon...
              </p>
            </div>
          )}
        </div>
        <p className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
          (c) akshit 2026 | {BUILD_ID}
        </p>
      </div>
    );
  }

  if (gameState === 'RESULTS') {
    return (
      <div className={`relative flex flex-col h-[calc(100dvh-1rem)] mt-2 max-w-lg mx-auto ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} rounded-2xl overflow-hidden font-sans`}>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-12 pb-16 flex flex-col items-center">
          <button
            onClick={toggleTheme}
            className={`absolute top-4 right-4 sm:right-6 p-2.5 rounded-xl ${theme === 'dark' ? 'bg-slate-800 text-yellow-400' : 'bg-white text-slate-600'} shadow-sm border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} hover:scale-105 transition-transform`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} mb-2`}>Quiz Completed!</h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mb-8 font-medium text-center`}>{activeQuizTitle}</p>

          <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-500"
                strokeWidth="3"
                strokeDasharray={`${(score / questions.length) * 100}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-slate-800">{score}</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">out of {questions.length}</span>
            </div>
          </div>

          <div className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-5 rounded-3xl shadow-sm border mb-6`}>
            <div className="flex items-center gap-3 mb-1">
              <BookmarkCheck className="text-blue-500 w-6 h-6" />
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} text-lg`}>Saved Questions</h3>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mb-4`}>You bookmarked {bookmarks.size} important questions for review.</p>

            <button
              onClick={exportBookmarks}
              disabled={bookmarks.size === 0}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${bookmarks.size > 0
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
            >
              <Download size={18} />
              Export to Text File
            </button>
          </div>

          <button
            onClick={() => {
              setScore(0);
              setCurrentQ(0);
              setSelectedAns(null);
              setBookmarks(new Set());
              setGameState('PLAYING');
            }}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mb-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <RotateCcw size={18} />
            Play Again
          </button>

          <button
            onClick={resetToStart}
            className={`w-full ${theme === 'dark' ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-700 border-slate-200'} border font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`}
          >
            <Home size={18} />
            Select Different Chapter
          </button>
        </div>
        <p className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
          (c) akshit 2026 | {BUILD_ID}
        </p>
      </div>
    );
  }

  // PLAYING STATE
  const q = questions[currentQ];
  const isAnswered = selectedAns !== null;
  const progressPercent = ((currentQ + 1) / questions.length) * 100;

  return (
    <div className={`relative flex flex-col h-[calc(100dvh-1rem)] mt-2 max-w-lg mx-auto ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} rounded-2xl overflow-hidden font-sans`}>

      {/* Top Header */}
      <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} pt-4 pb-4 px-4 sm:px-6 border-b shadow-sm z-10`}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col flex-1">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-1 line-clamp-1">
              {activeQuizTitle}
            </span>
            <span className={`text-[16px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              Question {currentQ + 1} of {questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-600'} hover:scale-105 transition-all duration-200`}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0">
              Score: {score}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className={`w-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} rounded-full h-2.5 overflow-hidden`}>
          <div
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth">
        <h2
          className={`text-[19px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} leading-8 mb-4`}
          dangerouslySetInnerHTML={{ __html: q.q }}
        />
        {!isAnswered && (
          <p className={`text-xs mb-4 font-normal ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Tap an option to reveal answer and explanation.
          </p>
        )}

        <div className="space-y-3">
          {q.opts.map((opt, i) => {
            // Determine styles based on selection state
            let btnStyle = theme === 'dark'
              ? "bg-slate-800 border-slate-600 text-slate-200 hover:border-blue-400 hover:shadow-lg hover:scale-[1.01]"
              : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:shadow-lg hover:scale-[1.01]";
            let icon = null;

            if (isAnswered) {
              if (i === q.ans) {
                // Correct answer gets highlighted green
                btnStyle = theme === 'dark'
                  ? "bg-green-900/40 border-green-500 text-green-100 ring-1 ring-green-500 shadow-sm"
                  : "bg-green-50 border-green-500 text-green-900 ring-1 ring-green-500 shadow-sm";
                icon = <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto flex-shrink-0" />;
              } else if (i === selectedAns) {
                // Selected wrong answer gets highlighted red
                btnStyle = theme === 'dark'
                  ? "bg-red-900/40 border-red-500 text-red-100 ring-1 ring-red-500 shadow-sm"
                  : "bg-red-50 border-red-500 text-red-900 ring-1 ring-red-500 shadow-sm";
                icon = <XCircle className="w-5 h-5 text-red-600 ml-auto flex-shrink-0" />;
              } else {
                // Other unselected wrong answers fade out slightly
                btnStyle = theme === 'dark'
                  ? "bg-slate-800 border-slate-700 text-slate-500 opacity-60"
                  : "bg-white border-slate-200 text-slate-400 opacity-60";
              }
            }

            return (
              <button
                key={i}
                disabled={isAnswered}
                onClick={() => handleAnswer(i)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 flex items-start gap-3 shadow-sm ${btnStyle}`}
              >
                <div className={`flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full text-sm font-semibold ${isAnswered && i === q.ans ? "bg-green-200 text-green-800" :
                  isAnswered && i === selectedAns ? "bg-red-200 text-red-800" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span
                  className="font-medium text-[16px] leading-6 flex-1 pt-1"
                  dangerouslySetInnerHTML={{ __html: opt }}
                />
                {icon}
              </button>
            );
          })}
        </div>

        {/* Explanation Box */}
        {isAnswered && (
          <div className={`mt-6 ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50/80 border-blue-100'} border rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'} mb-3`}>Explanation</h4>
            <p
              className={`text-[15px] font-serif ${theme === 'dark' ? 'text-blue-200' : 'text-blue-900/80'} leading-7`}
              dangerouslySetInnerHTML={{ __html: q.exp }}
            />
          </div>
        )}

        {/* Spacer for bottom bar */}
        <div className="h-32"></div>
      </div>

      {/* Bottom Bar */}
      <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-t p-5 flex gap-3 pb-safe absolute bottom-5 w-full max-w-lg shadow-lg`}>
        <button
          onClick={toggleBookmark}
          className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 border-2 ${bookmarks.has(currentQ)
            ? 'bg-yellow-50 border-yellow-400 text-yellow-500 shadow-md scale-105'
            : theme === 'dark'
              ? 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300 hover:scale-105'
              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:scale-105'
            }`}
        >
          <Bookmark className={`w-6 h-6 ${bookmarks.has(currentQ) ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={endQuiz}
          className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 border-2 ${theme === 'dark'
            ? 'bg-slate-700 border-slate-600 text-red-400 hover:bg-red-900/30 hover:border-red-600 hover:scale-105'
            : 'bg-white border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-300 hover:scale-105'
            }`}
          title="End Quiz"
        >
          <LogOut className="w-5 h-5" />
        </button>

        <button
          onClick={nextQuestion}
          disabled={!isAnswered}
          className={`flex-1 h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 ${isAnswered
            ? 'bg-slate-900 text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
            : theme === 'dark'
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
        >
          {currentQ === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          {isAnswered && <ChevronRight size={20} />}
        </button>
      </div>
      <p className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
        (c) akshit 2026 | {BUILD_ID}
      </p>

    </div>
  );
}
