import React, { useState, useEffect } from 'react';
import {
  Play, Bookmark, BookmarkCheck, ChevronRight, Home,
  Download, RotateCcw, CheckCircle2, XCircle, FileText, AlertCircle, BookOpen, Loader2,
  LogOut
} from 'lucide-react';
import { ThemeToggle } from '@/components/quiz/ThemeToggle';
import { QuizModuleCard } from '@/components/quiz/QuizModuleCard';
import { OptionButton } from '@/components/quiz/OptionButton';
import { ProgressBar } from '@/components/quiz/ProgressBar';
import { ExplanationBox } from '@/components/quiz/ExplanationBox';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    return saved || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('biomaster-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('biomaster-tab', activeTab);
  }, [activeTab]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle keyboard shortcuts in PLAYING state
      if (gameState !== 'PLAYING') return;

      // Ignore if user is typing in an input field or has modifier keys pressed
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const currentQuestion = questions[currentQ];
      if (!currentQuestion) return;

      // Number keys 1-5 for selecting options (when not answered)
      if (!selectedAns && e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key) - 1;
        if (index < currentQuestion.opts.length) {
          e.preventDefault();
          handleAnswer(index);
        }
      }

      // Enter or Space for next question (when answered)
      if (selectedAns !== null && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        nextQuestion();
      }

      // B for bookmark
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleBookmark();
      }

      // T for theme toggle
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, questions, currentQ, selectedAns]);

  // Focus management - focus first option when question loads
  useEffect(() => {
    if (gameState === 'PLAYING' && selectedAns === null) {
      const firstOption = document.querySelector('[data-option-index="0"]');
      if (firstOption) {
        firstOption.focus();
      }
    }
  }, [currentQ, gameState, selectedAns]);

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
            .replace(/\\emph\{(.*?)\}/g, '$1')
            .replace(/\\texttt\{(.*?)\}/g, '$1')
            .replace(/\\textsf\{(.*?)\}/g, '$1')
            .replace(/\\mathrm\{(.*?)\}/g, '$1')
            .replace(/\\mathbf\{(.*?)\}/g, '$1')
            .replace(/\\\\\s*/g, ' ')
            .replace(/\\end\{enumerate\}.*/s, '')
            .replace(/\$([^$]+)\$/g, '$1')
            .replace(/\\\((.*?)\\\)/g, '$1')
            .replace(/\\\[(.*?)\\\]/g, '$1')
            .replace(/\\underline\{\\hspace\{[^}]+\}\}/g, '_____')
            .replace(/(?:\\_){2,}/g, '_____')
            .replace(/\\left/g, '')
            .replace(/\\right/g, '')
            .replace(/\\times/g, 'X')
            .replace(/\\cdot/g, '·')
            .replace(/\\rightarrow/g, '→')
            .replace(/\\leftarrow/g, '←')
            .replace(/\\leftrightarrow/g, '↔')
            .replace(/\\rightleftharpoons/g, '⇌')
            .replace(/\\leq/g, '≤')
            .replace(/\\geq/g, '≥')
            .replace(/\\neq/g, '≠')
            .replace(/\\approx/g, '≈')
            .replace(/\\pm/g, '±')
            .replace(/\\infty/g, '∞')
            .replace(/\\circ\\text\{C\}/g, '°C')
            .replace(/\\circ/g, '°')
            .replace(/\\alpha/g, 'α')
            .replace(/\\beta/g, 'β')
            .replace(/\\gamma/g, 'γ')
            .replace(/\\delta/g, 'δ')
            .replace(/\\theta/g, 'θ')
            .replace(/\\lambda/g, 'λ')
            .replace(/\\pi/g, 'π')
            .replace(/\\sigma/g, 'σ')
            .replace(/\\omega/g, 'ω')
            .replace(/\\mu/g, 'μ')
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
            .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
            .replace(/\\%/g, '%')
            .replace(/\\#/g, '#')
            .replace(/\\\{/g, '{')
            .replace(/\\\}/g, '}')
            .replace(/([A-Za-z0-9)\]])_\{([^}]+)\}/g, '$1<sub>$2</sub>')
            .replace(/([A-Za-z0-9)\]])_([A-Za-z0-9+-])/g, '$1<sub>$2</sub>')
            .replace(/([A-Za-z0-9)\]])\^\{([^}]+)\}/g, '$1<sup>$2</sup>')
            .replace(/([A-Za-z0-9)\]])\^([A-Za-z0-9+-])/g, '$1<sup>$2</sup>')
            .replace(/\\,/g, ' ')
            .replace(/\\;/g, ' ')
            .replace(/\\!/g, '')
            .replace(/\s{2,}/g, ' ')
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
      <AppShell>
        {/* Header with Theme Toggle */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 sm:px-8 lg:px-12 py-3.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">BT1010</h1>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 sm:px-8 lg:px-12 py-2.5 sm:py-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="Q1">Q1</TabsTrigger>
              <TabsTrigger value="Q2">Q2</TabsTrigger>
              <TabsTrigger value="ENDSEM">ENDSEM</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-12 py-5 sm:py-6 lg:py-7 flex flex-col items-center">
          {/* Q1 Tab - All Quiz Modules */}
          {activeTab === 'Q1' && (
            <>
              <div className="text-center mb-8 w-full">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Quizzes</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Select a chapter to begin your quiz.
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 w-full">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="w-full max-w-3xl space-y-2.5 sm:space-y-3">
                {QUIZ_MODULES.map((module) => (
                  <QuizModuleCard
                    key={module.id}
                    module={module}
                    onLoadQuiz={loadQuiz}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            </>
          )}

          {/* Q2 Tab */}
          {activeTab === 'Q2' && (
            <>
              <div className="text-center mb-6 w-full">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Q2 Chapters (06-14)</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Start chapter-wise quiz practice.
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 w-full">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="w-full max-w-3xl space-y-2.5 sm:space-y-3">
                {Q2_MODULES.map((module) => (
                  <QuizModuleCard
                    key={module.id}
                    module={module}
                    onLoadQuiz={loadQuiz}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            </>
          )}

          {/* ENDSEM Tab - Coming Soon */}
          {activeTab === 'ENDSEM' && (
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 bg-slate-100 dark:bg-slate-800">
                <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ENDSEM</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Coming soon...
              </p>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  if (gameState === 'RESULTS') {
    return (
      <AppShell>
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-10 pb-16 flex flex-col items-center">
          <div className="absolute top-4 right-4 sm:right-6">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Quiz Completed!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium text-center">{activeQuizTitle}</p>

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

          <Card className="w-full mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-1">
                <BookmarkCheck className="text-blue-500 w-6 h-6" />
                <h3 className="font-semibold text-slate-800 dark:text-white text-lg">Saved Questions</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">You bookmarked {bookmarks.size} important questions for review.</p>

              <Button
                onClick={exportBookmarks}
                disabled={bookmarks.size === 0}
                variant={bookmarks.size > 0 ? "default" : "secondary"}
                className="w-full"
                aria-label="Export bookmarked questions to text file"
              >
                <Download size={18} className="mr-2" />
                Export to Text File
              </Button>
            </CardContent>
          </Card>

          <Button
            onClick={() => {
              setScore(0);
              setCurrentQ(0);
              setSelectedAns(null);
              setBookmarks(new Set());
              setGameState('PLAYING');
            }}
            className="w-full mb-3"
            size="lg"
            aria-label="Play quiz again"
          >
            <RotateCcw size={18} className="mr-2" />
            Play Again
          </Button>

          <Button
            onClick={resetToStart}
            variant="outline"
            className="w-full"
            size="lg"
            aria-label="Return to chapter selection"
          >
            <Home size={18} className="mr-2" />
            Select Different Chapter
          </Button>
        </div>
      </AppShell>
    );
  }

  // PLAYING STATE
  const q = questions[currentQ];
  const isAnswered = selectedAns !== null;

  return (
    <AppShell>
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 pt-3.5 pb-3.5 sm:pt-4 sm:pb-4 px-6 sm:px-8 lg:px-12 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col flex-1">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-1 line-clamp-1">
              {activeQuizTitle}
            </span>
            <span className="text-[16px] font-semibold text-slate-800 dark:text-white">
              Question {currentQ + 1} of {questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} className="w-10 h-10" />
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-base font-bold px-3 py-1.5 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
              {score}
            </Badge>
          </div>
        </div>
        <ProgressBar current={currentQ} total={questions.length} />
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-12 py-4 sm:py-5 lg:py-6 scroll-smooth">
        <h2
          className="text-[19px] font-semibold text-slate-800 dark:text-white leading-8 mb-4 break-words"
          dangerouslySetInnerHTML={{ __html: q.q }}
        />
        {!isAnswered && (
          <p className="text-xs mb-4 font-normal text-slate-500 dark:text-slate-400">
            Tap an option to reveal answer and explanation.
          </p>
        )}

        <div className="space-y-5 sm:space-y-6">
          {q.opts.map((opt, i) => (
            <OptionButton
              key={i}
              option={opt}
              index={i}
              isCorrect={i === q.ans}
              isSelected={i === selectedAns}
              isAnswered={isAnswered}
              onSelect={handleAnswer}
            />
          ))}
        </div>

        {isAnswered && <ExplanationBox explanation={q.exp} />}

        {/* Spacer for bottom bar */}
        <div className="h-28 sm:h-32"></div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 sm:px-8 lg:px-12 py-3.5 sm:py-4 flex gap-2.5 sm:gap-3 pb-safe absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-0.75rem)] sm:w-[calc(100%-1.5rem)] lg:w-[calc(100%-2rem)] max-w-4xl shadow-lg rounded-2xl">
        <Button
          onClick={toggleBookmark}
          variant="outline"
          size="icon"
          aria-label={bookmarks.has(currentQ) ? "Remove bookmark" : "Add bookmark"}
          aria-pressed={bookmarks.has(currentQ)}
          className={`h-14 w-14 rounded-2xl flex-shrink-0 min-w-[56px] min-h-[56px] ${bookmarks.has(currentQ)
            ? 'bg-yellow-50 border-yellow-400 text-yellow-500 hover:bg-yellow-100 shadow-md scale-105'
            : ''
            }`}
        >
          <Bookmark className={`w-6 h-6 ${bookmarks.has(currentQ) ? 'fill-current' : ''}`} aria-hidden="true" />
        </Button>

        <Button
          onClick={endQuiz}
          variant="outline"
          size="icon"
          aria-label="End quiz"
          className="h-14 w-14 rounded-2xl flex-shrink-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-600 min-w-[56px] min-h-[56px]"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
        </Button>

        <Button
          onClick={nextQuestion}
          disabled={!isAnswered}
          size="lg"
          aria-label={currentQ === questions.length - 1 ? 'Finish quiz' : 'Next question'}
          className="flex-1 h-14 rounded-2xl min-h-[56px]"
        >
          {currentQ === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          {isAnswered && <ChevronRight size={20} className="ml-2" aria-hidden="true" />}
        </Button>
      </div>
    </AppShell>
  );
}
