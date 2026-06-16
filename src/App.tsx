import React, { useState, useEffect } from 'react';
import { UserPersona, StudyWord, StudyPhrasal, StudyFiller, StudyExpr, Mistake, GOAL_STARTER_QUESTIONS } from './types';
import Onboarding from './components/Onboarding';
import StudyWordView from './components/StudyWord';
import StudyPhrasalView from './components/StudyPhrasal';
import StudyFillerView from './components/StudyFiller';
import StudyExprView from './components/StudyExpr';
import FreeTalkView from './components/FreeTalk';
import GrowthGarden from './components/GrowthGarden';
import HistoryReview from './components/HistoryReview';
import { Sparkles, Calendar, BookOpen, Volume2, Settings, Compass, HelpCircle, Activity } from 'lucide-react';

const CHEER_POOL: Record<string, { en: string; ko: string; emoji: string }[]> = {
  NF: [
    { en: "Every spelling error is a seed of fluent courage.", ko: "틀린 철자도 유창함으로 가는 용기의 씨앗이에요 🌱", emoji: "🌸" },
    { en: "Your unique voice deserves to be heard beautifully.", ko: "당신의 특별한 성향의 목소리는 충분히 들릴 가치가 있어요 💜", emoji: "✨" },
    { en: "Progress, not absolute perfection.", ko: "완벽하기보단 내딛는 감정이 훨씬 중요합니다.", emoji: "🌿" }
  ],
  NT: [
    { en: "Mistakes are just necessary raw data points for correction.", ko: "실수는 성장에 꼭 필요한 로 데이터 수집 과정일 뿐이에요.", emoji: "📈" },
    { en: "Consistency mathematically beats temporary intensity.", ko: "매일의 꾸준함이 누적되면 실력이 수학적으로 급상승합니다.", emoji: "🎯" },
    { en: "Your vocabulary range grows with every review.", ko: "안도 분석을 마주할 때마다 데이터베이스가 넓어집니다 📊", emoji: "⚡" }
  ],
  SJ: [
    { en: "Daily habits construct undeniable fluency.", ko: "매일의 작은 루틴이 부정할 수 없는 숙련을 만듭니다.", emoji: "🗓️" },
    { en: "Step by step, you are reaching your destination.", ko: "한 발짝씩 차근차근, 목적지에 조용히 가까워지고 있어요 👣", emoji: "👣" },
    { en: "Small systemic wins compound incredibly fast.", ko: "축적된 소박한 교정이 엄청난 가중치가 되어 돌아옵니다.", emoji: "🏆" }
  ],
  SP: [
    { en: "Do not wait for absolute readiness, speak now!", ko: "완벽한 타이밍을 기다리지 마세요. 일상의 감을 믿고 던져봐요!", emoji: "🔥" },
    { en: "Flexible intuition is your secret weapon.", ko: "당신의 유연한 즉흥력이 영어를 한결 재미있게 만듭니다.", emoji: "🎸" },
    { en: "Enjoy the rhythm and tone of conversational words.", ko: "단어의 리듬과 분위기 그대로를 장난스럽게 만끽해 보세요 🤪", emoji: "🌟" }
  ]
};

export default function App() {
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'growth' | 'setting'>('home');
  const [activeView, setActiveView] = useState<'dashboard' | 'study-word' | 'study-phrasal' | 'study-filler' | 'study-expr' | 'free-talk'>('dashboard');
  const [uiStyle, setUiStyle] = useState<'cozy' | 'toss'>(() => {
    const cached = localStorage.getItem('uiStyle');
    return (cached as 'cozy' | 'toss') || 'cozy';
  });

  // Garden assets inventory
  const [gardenWater, setGardenWater] = useState<number>(5);
  const [gardenFertilizer, setGardenFertilizer] = useState<number>(5);

  // TTS & Daily Notification Environment Settings
  const [autoTts, setAutoTts] = useState<boolean>(() => {
    const cached = localStorage.getItem('autoTts');
    return cached !== 'false';
  });
  const [dailyNotification, setDailyNotification] = useState<boolean>(() => {
    const cached = localStorage.getItem('dailyNotification');
    return cached !== 'false';
  });

  // Hidden expressions / Words forgot (Korean-centered: unknown expressions list)
  const [unknownExpressions, setUnknownExpressions] = useState<{ id: string; en: string; ko: string; dateAdded: string }[]>([]);

  // Safety confirmation dialog state bypass window.confirm sandbox limit in iframe
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  // Gemini API Key Connection status tracking state
  const [geminiStatus, setGeminiStatus] = useState<{ active: boolean; keyLength?: number; prefix?: string; suffix?: string; envExists?: boolean } | null>(null);
  const [geminiStatusLoading, setGeminiStatusLoading] = useState<boolean>(false);

  // Daily dynamic lessons loaded from server or fallback
  const [dailyLesson, setDailyLesson] = useState<{
    word: StudyWord | null;
    phrasal: StudyPhrasal | null;
    filler: StudyFiller | null;
    expr: StudyExpr | null;
    freeTalkQuestion?: string;
  }>({ word: null, phrasal: null, filler: null, expr: null, freeTalkQuestion: undefined });

  const [loadingLesson, setLoadingLesson] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [trackedMistakes, setTrackedMistakes] = useState<Mistake[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(() => {
    const cached = localStorage.getItem('selectedQuestionIndex');
    return cached ? parseInt(cached, 10) : 0;
  });

  const changeQuestionIndex = () => {
    setSelectedQuestionIndex(prev => {
      const defaultLen = GOAL_STARTER_QUESTIONS[persona?.goal || '일상']?.length || 3;
      const len = defaultLen + (dailyLesson?.freeTalkQuestion ? 1 : 0);
      const next = (prev + 1) % len;
      localStorage.setItem('selectedQuestionIndex', next.toString());
      return next;
    });
  };

  // Sound play
  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      setTimeout(() => {
        const cleanText = text
          .replace(/\p{Extended_Pictographic}/gu, '')
          .replace(/\p{Emoji_Presentation}/gu, '')
          .replace(/\p{Emoji}/gu, '')
          .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // strip surrogate pairs
          .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '')
          .replace(/\*\*|__/g, '') // strip markdown bold
          .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        utterance.rate = 0.82;
        utterance.volume = 1;

        let voices = window.speechSynthesis.getVoices();
        // Chrome iframe sandbox: remote/network voices (like "Google ...") fail silently or hang.
        // Prioritizing localService === true voices using the OS native speech engine.
        let localEnVoices = voices.filter(v => v.lang.startsWith('en') && v.localService === true);
        let candidateVoices = localEnVoices.length > 0 ? localEnVoices : voices.filter(v => v.lang.startsWith('en'));

        let enVoice = candidateVoices.find(v => v.name.includes('Natural')) ||
                      candidateVoices.find(v => v.name.includes('Samantha')) ||
                      candidateVoices.find(v => v.name.includes('David')) ||
                      candidateVoices.find(v => v.name.includes('Microsoft')) ||
                      candidateVoices.find(v => v.name.includes('Google')) ||
                      candidateVoices[0];
        if (enVoice) {
          utterance.voice = enVoice;
        }

        (window as any)._activeUtterances = (window as any)._activeUtterances || [];
        (window as any)._activeUtterances.push(utterance);

        utterance.onend = () => {
          (window as any)._activeUtterances = (window as any)._activeUtterances.filter((u: any) => u !== utterance);
        };
        utterance.onerror = (e) => {
          if (e.error !== 'interrupted') {
            console.error('Speech utterance error:', e);
          }
          (window as any)._activeUtterances = (window as any)._activeUtterances.filter((u: any) => u !== utterance);
          window.speechSynthesis.resume();
        };

        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.resume();

        // Periodically resume speaking in background to bypass 15-second cutoff bug
        const resumeInterval = setInterval(() => {
          if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.resume();
          } else {
            clearInterval(resumeInterval);
          }
        }, 2000);
      }, 150);
    } catch (e) {
      console.error(e);
    }
  };

  // Preload speech synthesis voices on page load for Chrome
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }, []);

  // Add asset side effects to secure persistence
  useEffect(() => {
    localStorage.setItem('gardenWater', gardenWater.toString());
  }, [gardenWater]);

  useEffect(() => {
    localStorage.setItem('gardenFertilizer', gardenFertilizer.toString());
  }, [gardenFertilizer]);

  useEffect(() => {
    localStorage.setItem('unknownExpressions', JSON.stringify(unknownExpressions));
  }, [unknownExpressions]);

  useEffect(() => {
    localStorage.setItem('autoTts', autoTts.toString());
  }, [autoTts]);

  useEffect(() => {
    localStorage.setItem('dailyNotification', dailyNotification.toString());
  }, [dailyNotification]);

  useEffect(() => {
    localStorage.setItem('uiStyle', uiStyle);
  }, [uiStyle]);

  useEffect(() => {
    if (activeTab === 'setting') {
      setGeminiStatusLoading(true);
      fetch('/api/gemini/status')
        .then(res => {
          if (!res.ok) throw new Error('Status route failed');
          return res.json();
        })
        .then(data => {
          setGeminiStatus(data);
        })
        .catch(err => {
          console.error('Error fetching Gemini status:', err);
          setGeminiStatus({ active: false, envExists: false });
        })
        .finally(() => {
          setGeminiStatusLoading(false);
        });
    }
  }, [activeTab]);

  // Integrated Reward claim handler
  const handleRewardEarned = (waterGained: number, fertGained: number, expGained: number) => {
    setGardenWater(prev => prev + waterGained);
    setGardenFertilizer(prev => prev + fertGained);
    handleLessonSessionFinish(expGained);
  };

  // Bookmark toggler
  const toggleBookmarkUnknown = (en: string, ko: string) => {
    const exists = unknownExpressions.find(item => item.en.toLowerCase() === en.toLowerCase());
    if (exists) {
      setUnknownExpressions(prev => prev.filter(item => item.en.toLowerCase() !== en.toLowerCase()));
    } else {
      const newItem = {
        id: 'unexp-' + Date.now() + Math.random().toString(36).substr(2, 4),
        en,
        ko,
        dateAdded: new Date().toISOString().slice(0, 10)
      };
      setUnknownExpressions(prev => [newItem, ...prev]);
    }
  };

  // Load state from local storage
  useEffect(() => {
    const rawPersona = localStorage.getItem('userPersona');
    if (rawPersona) {
      try {
        const u = JSON.parse(rawPersona);
        setPersona(u);
      } catch (e) {
        console.error('Persona parse error', e);
      }
    }

    // Sessions and Streak
    const rawDates = localStorage.getItem('freeTalkDates');
    if (rawDates) {
      try {
        const dates: string[] = JSON.parse(rawDates);
        setTotalSessions(dates.length);
        
        // Calculate streak
        const sorted = [...new Set(dates)].sort().reverse();
        const todayStr = new Date().toISOString().slice(0, 10);
        let streak = 0;
        let cursor = new Date(todayStr);
        for (let i = 0; i < 365; i++) {
          const checkD = cursor.toISOString().slice(0, 10);
          if (sorted.includes(checkD)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
          } else {
            break;
          }
        }
        setStreakDays(streak);
      } catch (e) {
        console.error(e);
      }
    }

    // Mistakes
    const rawMistakes = localStorage.getItem('freeTalkMistakes');
    if (rawMistakes) {
      try {
        setTrackedMistakes(JSON.parse(rawMistakes));
      } catch (e) {
        console.error(e);
      }
    }

    // Garden Inventory (Water & Fertilizer)
    const w = localStorage.getItem('gardenWater');
    if (w) setGardenWater(parseInt(w, 10));
    const f = localStorage.getItem('gardenFertilizer');
    if (f) setGardenFertilizer(parseInt(f, 10));

    // Unknown expressions / words forgot
    const rawUnknown = localStorage.getItem('unknownExpressions');
    if (rawUnknown) {
      try {
        setUnknownExpressions(JSON.parse(rawUnknown));
      } catch (e) {}
    }
  }, []);

  // Fetch or trigger background lesson preloader when persona is set!
  useEffect(() => {
    if (!persona) return;

    const fetchCustomLessons = async () => {
      setLoadingLesson(true);
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const cachedLearning = localStorage.getItem(`daily_learning_${todayStr}`);
        
        if (cachedLearning) {
          try {
            const data = JSON.parse(cachedLearning);
            setDailyLesson(data);
            setLoadingLesson(false);
            return;
          } catch (e) {
            localStorage.removeItem(`daily_learning_${todayStr}`);
          }
        }

        const localMistakesRaw = localStorage.getItem('freeTalkMistakes');
        let localMistakes = [];
        if (localMistakesRaw) {
          try {
            localMistakes = JSON.parse(localMistakesRaw);
          } catch (e) {}
        }

        // Try to fetch custom daily decks from server-side Gemini!
        const response = await fetch('/api/gemini/generate-learning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mbti: persona.mbti,
            goal: persona.goal,
            level: persona.level,
            trauma: persona.trauma,
            recentMistakes: localMistakes.slice(0, 5),
            currentDateSeed: todayStr // Guarantee freshness per date
          })
        });

        if (response.ok) {
          const data = await response.json();
          const constructedLesson = {
            word: {
              id: 'word-live',
              en: data.word.en,
              ko: data.word.ko,
              definition: data.word.definition,
              sentenceEn: data.word.sentenceEn,
              sentenceKo: data.word.sentenceKo,
              levelText: data.word.levelText || '맞춤'
            },
            phrasal: {
              id: 'phrasal-live',
              en: data.phrasal.en,
              ko: data.phrasal.ko,
              definition: data.phrasal.definition,
              sentenceEn: data.phrasal.sentenceEn,
              sentenceKo: data.phrasal.sentenceKo,
              context: data.phrasal.context
            },
            filler: {
              id: 'filler-live',
              en: data.filler.en,
              ko: data.filler.ko,
              usage: data.filler.usage,
              sentenceEn: data.filler.sentenceEn,
              sentenceKo: data.filler.sentenceKo
            },
            expr: {
              id: 'expr-live',
              en: data.expr.en,
              ko: data.expr.ko,
              situation: data.expr.situation,
              alternative: data.expr.alternative
            },
            freeTalkQuestion: data.freeTalkQuestion
          };

          setDailyLesson(constructedLesson);
          localStorage.setItem(`daily_learning_${todayStr}`, JSON.stringify(constructedLesson));
        }
      } catch (err) {
        console.warn("Could not prefetch custom lessons, falling back to cached files safely", err);
      } finally {
        setLoadingLesson(false);
      }
    };

    fetchCustomLessons();
  }, [persona]);

  const handleOnboardingComplete = (newPersona: UserPersona) => {
    localStorage.setItem('userPersona', JSON.stringify(newPersona));
    setPersona(newPersona);
    setActiveTab('home');
    setActiveView('dashboard');

    // Create default setup Dates registry
    const defaultDates = [new Date().toISOString().slice(0, 10)];
    localStorage.setItem('freeTalkDates', JSON.stringify(defaultDates));
    setTotalSessions(1);
    setStreakDays(1);
  };

  const handleLessonSessionFinish = (expGained: number) => {
    // Increment progress
    const updatedSessions = totalSessions + 1;
    setTotalSessions(updatedSessions);
    
    const today = new Date().toISOString().slice(0, 10);
    const rawDates = localStorage.getItem('freeTalkDates');
    let datesList: string[] = [];
    if (rawDates) {
      try { datesList = JSON.parse(rawDates); } catch(e){}
    }
    datesList.push(today);
    localStorage.setItem('freeTalkDates', JSON.stringify(datesList));

    // Recalculate streak
    const sorted = [...new Set(datesList)].sort().reverse();
    let streak = 0;
    let cursor = new Date(today);
    for (let i = 0; i < 365; i++) {
      const checkD = cursor.toISOString().slice(0, 10);
      if (sorted.includes(checkD)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    setStreakDays(streak);
  };

  const handleFreeTalkFinish = (gainedExp: number, newMistakes: Mistake[]) => {
    // Award 1 watercan and 1 fertilizer to actual garden inventory
    setGardenWater(prev => prev + 1);
    setGardenFertilizer(prev => prev + 1);

    handleLessonSessionFinish(gainedExp);

    if (newMistakes.length > 0) {
      const updatedMistakes = [...newMistakes, ...trackedMistakes];
      localStorage.setItem('freeTalkMistakes', JSON.stringify(updatedMistakes));
      setTrackedMistakes(updatedMistakes);
    }

    // Move to the next random starter question for tomorrow/next session
    changeQuestionIndex();
  };

  const clearAllMistakes = () => {
    localStorage.removeItem('freeTalkMistakes');
    setTrackedMistakes([]);
  };

  const handleResetApp = () => {
    setShowResetModal(true);
  };

  // MBTI based dynamic cheer picker
  const getDailyCheer = () => {
    if (!persona) return { en: "Breathe in, speak out.", ko: "틀려도 괜찮아요, 시작이 반입니다! 🌱", emoji: "💪" };
    const subGroup = persona.mbtiGroup === 'default' ? 'NF' : persona.mbtiGroup;
    const pool = CHEER_POOL[subGroup] || CHEER_POOL.NF;
    const idx = new Date().getDate() % pool.length;
    return pool[idx];
  };

  const dailyCheer = getDailyCheer();

  // Navigation
  const handleTabChange = (target: 'home' | 'history' | 'growth' | 'setting') => {
    setActiveTab(target);
    setActiveView('dashboard');
  };

  const currentLevelLabel = () => {
    if (!persona) return '씨앗';
    return ['기초 (씨앗)', '초급 (새싹)', '중급 (줄기)', '중상급 (꽃)', '상급 (열매)'][persona.level - 1] || '새싹';
  };

  // Main UI routing
  if (!persona) {
    return (
      <div className="h-[100dvh] md:h-screen md:min-h-screen bg-stone-100 flex items-center justify-center font-sans tracking-tight antialiased p-0 md:p-4">
        <div className="w-full max-w-[390px] h-[100dvh] md:h-[850px] bg-white border border-gray-100 md:rounded-[40px] shadow-2xl flex flex-col justify-between overflow-y-auto relative no-scrollbar">
          <Onboarding onComplete={handleOnboardingComplete} />
        </div>
      </div>
    );
  }

  const questionsList = [
    ...(dailyLesson?.freeTalkQuestion ? [dailyLesson.freeTalkQuestion] : []),
    ...(GOAL_STARTER_QUESTIONS[persona.goal] || GOAL_STARTER_QUESTIONS['일상'])
  ];
  const activeQuestion = questionsList[selectedQuestionIndex % questionsList.length];

  return (
    <div className="h-[100dvh] md:h-screen md:min-h-screen bg-stone-100 flex items-center justify-center font-sans tracking-tight antialiased p-0 md:p-4">
      {/* Smartphone frame container */}
      <div className="w-full max-w-[390px] h-[100dvh] md:h-[850px] bg-white border border-gray-100 md:rounded-[40px] shadow-2xl flex flex-col justify-between relative overflow-hidden">
        
        {/* Scrollable View Area */}
        <div className={
          activeView === 'dashboard' 
            ? "flex-1 overflow-y-auto no-scrollbar pb-24 h-full" 
            : activeView === 'free-talk'
            ? "flex-1 h-full min-h-0 relative flex flex-col overflow-hidden"
            : "flex-1 h-full min-h-0 relative flex flex-col overflow-y-auto no-scrollbar"
        }>
          
          {/* Main Top Header -- Only rendered in Home/Gardening Dashboard views */}
          {activeView === 'dashboard' && (
            uiStyle === 'toss' ? (
              <div className="px-5 pt-5 pb-3 flex justify-between items-center bg-white border-b border-gray-100/50">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-[#191f28] tracking-tight">toss</span>
                  <div className="w-[1px] h-3 bg-gray-200"></div>
                  <span className="text-xs font-bold text-[#3182f6]">자없프 beta 🚀</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-extrabold bg-[#f2f4f6] px-2 py-0.5 rounded-lg">LV.{persona.level}</span>
                  <div className="bg-[#e8f3ff] text-[#3182f6] font-black text-[10px] px-2.5 py-1 rounded-full flex items-center gap-0.5 shadow-sm">
                    <span>🔥 {streakDays}일째</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 pt-6 pb-2.5 flex justify-between items-center bg-white border-b border-gray-50/50">
                <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">자없프</h1>
                  <p className="text-[10px] text-orange-500 font-extrabold mt-0.5 tracking-wider uppercase">
                    {persona.goal} 회복 모드 • {currentLevelLabel()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-orange-100 text-orange-600 font-black text-xs px-3 py-1.5 rounded-full shadow-inner animate-pulse">
                  <span>🔥 {streakDays}일째</span>
                </div>
              </div>
            )
          )}

          {/* Core Views Routing */}
          {activeView === 'dashboard' && (
            <div className="animate-fadeIn">
              
              {/* Home Tab */}
              {activeTab === 'home' && (
                uiStyle === 'toss' ? (
                  /* ----------------- TOSS IN-APP BETA STYLE MODE ----------------- */
                  <div className="bg-[#f2f4f6] min-h-full pb-6 px-4 pt-4 space-y-3.5 animate-fadeIn">
                    
                    {/* Style switcher banner */}
                    <div className="bg-white rounded-[24px] p-4 flex justify-between items-center border border-white shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">📱</span>
                        <div>
                          <h4 className="text-[12px] font-bold text-[#191f28]">토스 인앱 베타 탑재 완료</h4>
                          <p className="text-[10px] text-[#4e5968] font-medium">깔끔하고 군더더기 없는 금융 앱 감성</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setUiStyle('cozy')}
                        className="bg-[#f2f4f6] text-[#4e5968] hover:bg-gray-200 font-extrabold text-[9.5px] px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                        id="cozy-switcher-btn"
                      >
                        가든 밭 가기
                      </button>
                    </div>

                    {/* Banner Card - Toss primary blue call-to-action */}
                    <div className="bg-white rounded-[24px] p-5 border border-white shadow-xs flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="inline-block bg-[#e8f3ff] text-[#3182f6] text-[10px] font-black px-2.5 py-0.5 rounded-md">
                            🎯 데일리 프리토킹 미션
                          </span>
                          <h3 className="text-[16.5px] font-black text-[#191f28] leading-tight mt-1">
                            자신감 채워주는 3분 회화
                          </h3>
                        </div>
                        <span className="text-2xl animate-pulse">🗣️</span>
                      </div>
                      
                      <div className="bg-[#f2f4f6]/80 p-3.5 rounded-2xl mt-4 border border-transparent">
                        <p className="text-[11px] text-[#4e5968] leading-relaxed font-semibold">
                          <span className="text-[#3182f6] font-extrabold">오늘의 퀘스트 질문 •</span> "{activeQuestion.length > 55 ? `${activeQuestion.slice(0, 52)}...` : activeQuestion}"
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveView('free-talk')}
                        className="w-full bg-[#3182f6] hover:bg-[#1bb2f6] text-white rounded-2xl py-3.5 mt-4 text-xs font-black transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-[#3182f6]/10 flex items-center justify-center gap-1.5"
                        id="toss-freetalk-start"
                      >
                        <span>회화 바로 시작하기</span>
                        <span className="text-[9.5px] opacity-80">(물&비료 획득)</span>
                      </button>
                    </div>

                    {/* Financial parody Garden Bank account balance */}
                    <div className="bg-white rounded-[24px] p-5 border border-white shadow-xs space-y-3.5">
                      <div className="flex justify-between items-center pb-2 border-b border-[#f2f4f6]">
                        <span className="text-[10.5px] font-extrabold text-[#8b95a1] uppercase tracking-wider">🌱 내 가든 성장 통장 잔액</span>
                        <button 
                          onClick={() => setActiveTab('growth')}
                          className="text-[11px] text-[#3182f6] font-extrabold hover:underline"
                        >
                          송금/조회
                        </button>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <div>
                          <div className="text-[11.5px] font-bold text-[#4e5968] flex items-center gap-1">물조리개 보관량 <span className="text-[9px] text-[#8b95a1] font-mono">Water_Balance</span></div>
                          <div className="text-[17px] font-black text-[#191f28] mt-0.5">{gardenWater}L <span className="text-xs text-gray-400 font-bold">보유 중</span></div>
                        </div>
                        <span className="text-xl">💧</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-t border-gray-50 pt-3">
                        <div>
                          <div className="text-[11.5px] font-bold text-[#4e5968] flex items-center gap-1">성장 촉진 비료 <span className="text-[9px] text-[#8b95a1] font-mono">Nutrient_Stock</span></div>
                          <div className="text-[17px] font-black text-[#191f28] mt-0.5">{gardenFertilizer}포대</div>
                        </div>
                        <span className="text-xl">💩</span>
                      </div>
                    </div>

                    {/* Toss style segmented study feed items list */}
                    <div className="bg-white rounded-[24px] p-5 border border-white shadow-xs space-y-4">
                      <div>
                        <h4 className="text-[11px] font-extrabold text-[#8b95a1] uppercase tracking-wider">오늘의 성격맞춤 데일리 미션</h4>
                        <p className="text-[9.5px] text-[#6b7684] mt-0.5">학습 완료 시 물리 정원에 영양분이 공급됩니다.</p>
                      </div>
                      
                      <div className="space-y-2.5">
                        {/* Word */}
                        <div 
                          onClick={() => setActiveView('study-word')}
                          className="flex justify-between items-center p-3 bg-[#f8f9fa] rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100"
                          id="toss-word-card"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-3xs">📖</span>
                            <div>
                              <div className="text-xs font-bold text-[#191f28]">오늘의 단어 (Word Study)</div>
                              <div className="text-[10px] font-medium text-[#4e5968] mt-0.5">{dailyLesson.word ? dailyLesson.word.en : '선택형 단어'}</div>
                            </div>
                          </div>
                          <span className="text-[#8b95a1] text-[10px] font-semibold">학습하기 &gt;</span>
                        </div>

                        {/* Phrasal */}
                        <div 
                          onClick={() => setActiveView('study-phrasal')}
                          className="flex justify-between items-center p-3 bg-[#f8f9fa] rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100"
                          id="toss-phrasal-card"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-3xs">🔗</span>
                            <div>
                              <div className="text-xs font-bold text-[#191f28]">구동사 공부 (Phrasal Verbs)</div>
                              <div className="text-[10px] font-medium text-[#4e5968] mt-0.5">{dailyLesson.phrasal ? dailyLesson.phrasal.en : '상황별 리스트'}</div>
                            </div>
                          </div>
                          <span className="text-[#8b95a1] text-[10px] font-semibold">학습하기 &gt;</span>
                        </div>

                        {/* Filler */}
                        <div 
                          onClick={() => setActiveView('study-filler')}
                          className="flex justify-between items-center p-3 bg-[#f8f9fa] rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100"
                          id="toss-filler-card"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-3xs">💬</span>
                            <div>
                              <div className="text-xs font-bold text-[#191f28]">필러 표현 (Filler Words)</div>
                              <div className="text-[10px] font-medium text-[#4e5968] mt-0.5">{dailyLesson.filler ? dailyLesson.filler.en : '대화 연결 단어'}</div>
                            </div>
                          </div>
                          <span className="text-[#8b95a1] text-[10px] font-semibold">학습하기 &gt;</span>
                        </div>

                        {/* Recommended Expressions */}
                        <div 
                          onClick={() => setActiveView('study-expr')}
                          className="flex justify-between items-center p-3 bg-[#f8f9fa] rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100"
                          id="toss-expr-card"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-3xs">💡</span>
                            <div>
                              <div className="text-xs font-bold text-[#191f28]">원어민 추천 표현 (Expressions)</div>
                              <div className="text-[10px] font-medium text-[#4e5968] mt-0.5">{dailyLesson.expr ? dailyLesson.expr.en : '뉘앙스 교정'}</div>
                            </div>
                          </div>
                          <span className="text-[#8b95a1] text-[10px] font-semibold">학습하기 &gt;</span>
                        </div>
                      </div>
                    </div>

                    {/* Integrated mistake analysis & wordbook widgets in modern Toss Card */}
                    <div className="grid grid-cols-1 gap-3.5">
                      
                      {/* Mistakes preview in Toss card style */}
                      <div className="bg-white rounded-[24px] p-5 border border-white shadow-xs space-y-4">
                        <div>
                          <h4 className="text-[11px] font-extrabold text-[#8b95a1] uppercase tracking-wider">📉 실시간 오답 금고</h4>
                          <p className="text-[9.5px] text-[#6b7684] mt-0.5">프리토킹 중 오인식된 문장이 안전하게 분석 및 기록되었습니다.</p>
                        </div>
                        {trackedMistakes.length === 0 ? (
                          <div className="text-center py-5 text-xs text-gray-400 font-bold bg-[#f2f4f6]/50 rounded-2xl">
                            대기 중인 오답이 없습니다. 👍
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {trackedMistakes.slice(0, 2).map((m) => (
                              <div key={m.id} className="p-3 bg-[#f8f9fa] rounded-2xl border border-gray-100">
                                <div className="text-[11px] font-bold text-rose-500 line-through leading-relaxed">{m.before}</div>
                                <div className="text-[11px] font-bold text-[#3182f6] leading-relaxed mt-0.5">→ {m.after}</div>
                                {m.tip && <p className="text-[9.5px] text-gray-400 mt-1 leading-normal">{m.tip}</p>}
                              </div>
                            ))}
                            <button 
                              onClick={() => setActiveTab('history')}
                              className="w-full text-center text-xs text-[#3182f6] font-bold py-2 hover:bg-slate-50 rounded-xl transition-all"
                            >
                              오답해설 금고 열어보기 ({trackedMistakes.length}개)
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Manual Expression Book in Toss Style info */}
                      <div className="bg-white rounded-[24px] p-5 border border-white shadow-xs space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-[11px] font-extrabold text-[#8b95a1] uppercase tracking-wider">📓 특별 기여 단어장</h4>
                            <p className="text-[9.5px] text-[#6b7684] mt-0.5">기억하고픈 구문 리스트</p>
                          </div>
                          <span className="text-[9.5px] bg-[#e8f3ff] text-[#3182f6] font-extrabold px-2 py-0.5 rounded-lg">
                            누적 {unknownExpressions.length}개
                          </span>
                        </div>

                        {/* Simple Fast Inline Form */}
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            const enInput = (e.target as any).enExpression.value.trim();
                            const koInput = (e.target as any).koMeaning.value.trim();
                            if (!enInput || !koInput) return;
                            toggleBookmarkUnknown(enInput, koInput);
                            (e.target as any).reset();
                          }}
                          className="bg-[#f2f4f6] p-3 rounded-2xl space-y-2"
                        >
                          <div className="text-[9.5px] text-[#4e5968] font-bold">✏️ 기어 구문 간편 등록</div>
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              name="enExpression"
                              type="text" 
                              required
                              placeholder="영어 단어" 
                              className="bg-white rounded-xl px-2.5 py-1.5 text-[11px] font-bold outline-none focus:ring-1 focus:ring-[#3182f6] text-slate-800"
                            />
                            <input 
                              name="koMeaning"
                              type="text" 
                              required
                              placeholder="한국어 표현" 
                              className="bg-white rounded-xl px-2.5 py-1.5 text-[11px] font-bold outline-none focus:ring-1 focus:ring-[#3182f6] text-slate-800"
                            />
                          </div>
                          <button 
                            type="submit"
                            className="w-full bg-[#3182f6] text-white rounded-xl py-1.5 text-[9.5px] font-black hover:bg-[#1b64da] transition-all"
                          >
                            단어 추가 +
                          </button>
                        </form>

                        {unknownExpressions.length > 0 && (
                          <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar divide-y divide-slate-50">
                            {unknownExpressions.slice(0, 3).map((item) => (
                              <div key={item.id} className="flex justify-between items-center py-2 first:pt-0">
                                <div>
                                  <div className="text-xs font-bold text-[#191f28] flex items-center gap-1">
                                    <span>{item.en}</span>
                                    <button onClick={() => speak(item.en)} className="cursor-pointer text-[10.5px]">📣</button>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-semibold">{item.ko}</div>
                                </div>
                                <button
                                  onClick={() => setUnknownExpressions(prev => prev.filter(x => x.id !== item.id))}
                                  className="text-[9px] text-[#3182f6] bg-[#e8f3ff] font-extrabold px-2.5 py-1 rounded-lg transition-all hover:bg-blue-105"
                                >
                                  외움 ✓
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ----------------- CLASSIC COZY GARDEN THEME MODE ----------------- */
                  <div className="px-5 py-4 space-y-5">
                    
                    {/* Style switcher banner */}
                    <div className="bg-gradient-to-r from-[#3182f6] to-teal-500 text-white rounded-3xl p-4.5 flex justify-between items-center shadow-lg animate-fadeIn">
                      <div className="space-y-1">
                        <span className="inline-block bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">NEW STYLE BETA</span>
                        <h4 className="text-xs font-extrabold leading-tight">토스 인앱(Toss) 스타일 베타 출시!</h4>
                        <p className="text-[10px] text-white/90 font-medium">군더더기 없는 금융 앱 감성 자없프 코칭</p>
                      </div>
                      <button
                        onClick={() => setUiStyle('toss')}
                        className="bg-white text-[#3182f6] hover:bg-slate-50 font-black text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                        id="toss-switcher-btn"
                      >
                        체험하기 →
                      </button>
                    </div>

                    {/* Free Talk Banner Link - Main-most top feature! */}
                    <button
                      onClick={() => setActiveView('free-talk')}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-5 relative overflow-hidden text-left shadow-lg cursor-pointer transition-all active:scale-[0.98] group"
                    >
                      <div className="absolute right-[-10px] bottom-[-15px] text-7xl opacity-20 select-none transition-transform group-hover:scale-110 group-hover:rotate-6">
                        🗣️
                      </div>
                      <span className="text-[9.5px] bg-white/20 text-white px-2.5 py-1 rounded-md font-extrabold uppercase tracking-widest">Today's Free Talk</span>
                      <h3 className="text-lg font-black mt-2 leading-tight">오늘의 프리토크 하기</h3>
                      <p className="text-xs text-white/90 mt-1.5 leading-relaxed font-sans max-w-[85%] font-medium">
                        "오늘의 질문: {activeQuestion.length > 45 ? `${activeQuestion.slice(0, 42)}...` : activeQuestion}"
                      </p>
                      <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-orange-600 bg-white px-3 py-1.5 rounded-xl shadow-xs">
                        <span>🎤 바로 시작하기</span>
                      </div>
                    </button>

                    {/* Character Widget Card */}
                    <div className="bg-emerald-50/55 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl border border-emerald-100 flex items-center justify-center text-3xl shadow-sm animate-bounce [animation-duration:3s]">
                          {['🌰', '🌱', '🌿', '🌸', '🌺', '🍎', '🌳', '🌲', '🏔️'][Math.min(Math.floor(totalSessions / 5), 8)]}
                        </div>
                        <div>
                          <span className="text-[9.5px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Level Progress</span>
                          <h4 className="text-sm font-black text-slate-800 mt-1">성공과 전진의 밭</h4>
                          <p className="text-[10.5px] text-slate-400 mt-0.5 font-medium">누적 회복도 세션: {totalSessions}회 가량 수확</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('growth')}
                        className="text-xs text-emerald-600 font-extrabold hover:underline"
                      >
                        나의 정원 가기
                      </button>
                    </div>

                    {/* Today's study modules quadrant */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">오늘의 학습 모듈</h4>
                      <div className="grid grid-cols-2 gap-3">
                        
                        {/* Word Card */}
                        <button
                          onClick={() => setActiveView('study-word')}
                          className="bg-white hover:bg-orange-50/10 border hover:border-orange-200 border-gray-100 rounded-2xl p-4 text-left transition-all cursor-pointer shadow-xs relative"
                        >
                          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 mb-2 font-bold text-base">📖</div>
                          <h4 className="text-xs font-black text-slate-800">오늘의 단어</h4>
                          <p className="text-[9.5px] text-slate-400 mt-1 leading-normal font-medium">
                            {dailyLesson.word ? `"${dailyLesson.word.en}"` : '레벨별 맞춤 단어'}
                          </p>
                        </button>

                        {/* Phrasal Card */}
                        <button
                          onClick={() => setActiveView('study-phrasal')}
                          className="bg-white hover:bg-teal-50/10 border hover:border-teal-200 border-gray-100 rounded-2xl p-4 text-left transition-all cursor-pointer shadow-xs relative"
                        >
                          <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 mb-2 font-bold text-base">🔗</div>
                          <h4 className="text-xs font-black text-slate-800">구동사 공부</h4>
                          <p className="text-[9.5px] text-slate-400 mt-1 leading-normal font-medium">
                            {dailyLesson.phrasal ? `"${dailyLesson.phrasal.en}"` : '상황별 결합 구동사'}
                          </p>
                        </button>

                        {/* Filler Word Card */}
                        <button
                          onClick={() => setActiveView('study-filler')}
                          className="bg-white hover:bg-red-50/10 border hover:border-red-200 border-gray-100 rounded-2xl p-4 text-left transition-all cursor-pointer shadow-xs relative"
                        >
                          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500 mb-2 font-bold text-base">💬</div>
                          <h4 className="text-xs font-black text-slate-800">Filler Word</h4>
                          <p className="text-[9.5px] text-slate-400 mt-1 leading-normal font-medium">
                            {dailyLesson.filler ? `"${dailyLesson.filler.en}"` : '대화 지연 유도 필러'}
                          </p>
                        </button>

                        {/* Suggested Expressions Card */}
                        <button
                          onClick={() => setActiveView('study-expr')}
                          className="bg-white hover:bg-amber-50/10 border hover:border-amber-200 border-gray-100 rounded-2xl p-4 text-left transition-all cursor-pointer shadow-xs relative"
                        >
                          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 mb-2 font-bold text-base">💡</div>
                          <h4 className="text-xs font-black text-slate-800">추천 표현</h4>
                          <p className="text-[9.5px] text-slate-400 mt-1 leading-normal font-medium">
                            {dailyLesson.expr ? `"${dailyLesson.expr.en}"` : '네이티브 세련 대조 표현'}
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Dual-column separated sections: Grammar vs Unknown Expressions */}
                    <div className="space-y-4">
                      
                      {/* WIDGET 1: Grammar Mistake Preview */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">📉 문법 오답 정밀 진단</h4>
                        <div className="bg-white border border-gray-100 rounded-3xl p-4 space-y-3 shadow-xs">
                          {trackedMistakes.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400 font-medium">
                              아직 제기된 문법 오답이 없습니다.<br />다정한 프리토킹 코칭에서 실수 극복을 시작해 봐요! 🥰
                            </div>
                          ) : (
                            <div className="space-y-3 divide-y divide-slate-100">
                              {trackedMistakes.slice(0, 3).map((m, idx) => (
                                <div key={m.id} className="pt-2.5 first:pt-0 flex items-start gap-2.5">
                                  <span className="w-5 h-5 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center font-black text-[10px] flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1">
                                    <div className="text-xs font-bold text-rose-500 line-through leading-relaxed">{m.before}</div>
                                    <div className="text-xs font-bold text-green-600 leading-relaxed mt-0.5">→ {m.after}</div>
                                    {m.tip && <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{m.tip}</p>}
                                  </div>
                                </div>
                              ))}
                              <div className="pt-2.5 text-center">
                                <button 
                                  onClick={() => setActiveTab('history')}
                                  className="text-[10.5px] text-orange-500 font-extrabold hover:underline"
                                >
                                  교정 해설 오답노트 전체 보기
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* WIDGET 2: Word Expressions (Unknown expressions with Korean translations) */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center pl-1">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">📓 단어·표현 (내가 기억할 표현들)</h4>
                          <span className="text-[9px] bg-amber-50 text-amber-600 font-bold px-1.5 py-0.5 rounded">
                            누적 {unknownExpressions.length}개
                          </span>
                        </div>
                        
                        <div className="bg-white border border-gray-100 rounded-3xl p-4.5 space-y-4 shadow-xs">
                          
                          {/* Inline creation form for custom forgotten expressions */}
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              const enInput = (e.target as any).enExpression.value.trim();
                              const koInput = (e.target as any).koMeaning.value.trim();
                              if (!enInput || !koInput) return;
                              toggleBookmarkUnknown(enInput, koInput);
                              (e.target as any).reset();
                            }}
                            className="bg-slate-50 p-3 rounded-2xl space-y-2 border border-slate-100"
                          >
                            <div className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                              <span>✏️ 기억하고 싶은 표현 수동 등록하기</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                name="enExpression"
                                type="text" 
                                required
                                placeholder="영어 단어/문장" 
                                className="bg-white border border-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-amber-400 font-sans"
                              />
                              <input 
                                name="koMeaning"
                                type="text" 
                                required
                                placeholder="한국어 뜻" 
                                className="bg-white border border-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-amber-400 font-sans"
                              />
                            </div>
                            <button 
                              type="submit"
                              className="w-full bg-slate-800 text-white rounded-xl py-1.5 text-[10px] font-black hover:bg-slate-700 active:scale-98 transition-all"
                            >
                              단어장에 추가하기 +
                            </button>
                          </form>

                          {/* List display */}
                          {unknownExpressions.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400 leading-normal">
                              어려웠던 오늘의 단어나 잊기 쉬운 구구절 회화, <br />
                              수동 등록한 한글 뜻 단어들이 여기에 모입니다! 🌟
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar divide-y divide-slate-50">
                              {unknownExpressions.map((item) => (
                                <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2.5">
                                  <div className="flex-1">
                                    <div className="text-xs font-extrabold text-slate-800 font-sans flex items-center gap-1">
                                      <span>{item.en}</span>
                                      <button 
                                        onClick={() => speak(item.en)}
                                        className="text-slate-300 hover:text-slate-400 p-0.5 cursor-pointer"
                                        title="들려주세요"
                                      >
                                        📣
                                      </button>
                                    </div>
                                    <div className="text-[11px] text-stone-500 font-semibold mt-0.5">뜻: {item.ko}</div>
                                  </div>
                                  <button
                                    onClick={() => setUnknownExpressions(prev => prev.filter(x => x.id !== item.id))}
                                    className="text-[10px] text-slate-300 hover:text-red-400 font-extrabold px-2 py-1 rounded-lg border border-slate-100 hover:border-red-100 hover:bg-red-50 transition-all select-none"
                                  >
                                    외움 ✓
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                  </div>
                )
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <HistoryReview mistakes={trackedMistakes} onClearMistakes={clearAllMistakes} />
              )}

              {/* Growth Tab */}
              {activeTab === 'growth' && (
                <GrowthGarden 
                  persona={persona} 
                  totalSessions={totalSessions} 
                  gardenWater={gardenWater}
                  setGardenWater={setGardenWater}
                  gardenFertilizer={gardenFertilizer}
                  setGardenFertilizer={setGardenFertilizer}
                />
              )}

              {/* Setting Tab */}
              {activeTab === 'setting' && (
                <div className="px-5 py-5 space-y-5">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="font-extrabold text-gray-800 text-base">⚙️ 환경 및 프로필 설정</h3>
                    <p className="text-[11px] text-gray-400 font-medium font-sans">데일리 스피킹 환경 및 나의 정원 성장 조건 가꾸기</p>
                  </div>

                  {/* 1. 스피킹 환경 설정 */}
                  <div className="space-y-2">
                    <h4 className="text-[11.5px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">스피킹 환경 설정</h4>
                    <div className="bg-white border border-gray-100 rounded-3xl p-4.5 space-y-4 shadow-sm">
                      
                      {/* Engine display */}
                      <div className="flex justify-between items-center text-xs font-bold font-sans">
                        <span className="text-slate-600">마이크 음성인식 엔진(STT)</span>
                        <span className="text-slate-400 font-extrabold bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 text-[10px]">웹 내장 (기본)</span>
                      </div>

                      {/* Auto play TTS Toggle */}
                      <div className="flex justify-between items-center text-xs font-bold font-sans">
                        <span className="text-slate-650">AI 답변 자동 재생 (TTS)</span>
                        <button
                          type="button"
                          onClick={() => setAutoTts(!autoTts)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            autoTts ? 'bg-orange-505 bg-orange-500' : 'bg-stone-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              autoTts ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Daily Notification Toggle */}
                      <div className="flex justify-between items-center text-xs font-bold font-sans">
                        <span className="text-slate-650">데일리 알림 받기</span>
                        <button
                          type="button"
                          onClick={() => setDailyNotification(!dailyNotification)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dailyNotification ? 'bg-orange-505 bg-orange-500' : 'bg-stone-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              dailyNotification ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Speaking Layout Theme Toggle Option */}
                      <div className="flex justify-between items-center text-xs font-bold font-sans">
                        <span className="text-[#3182f6]">토스 인앱 스타일 (자없프)</span>
                        <button
                          type="button"
                          onClick={() => setUiStyle(uiStyle === 'toss' ? 'cozy' : 'toss')}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            uiStyle === 'toss' ? 'bg-[#3182f6]' : 'bg-stone-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              uiStyle === 'toss' ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Gemini API Status Indicator */}
                      <div className="flex justify-between items-center text-xs font-bold font-sans border-t border-gray-100 pt-3">
                        <span className="text-slate-650">Gemini AI 연결 상태 (서버)</span>
                        <div className="flex items-center gap-1.5 font-sans">
                          {geminiStatusLoading ? (
                            <span className="text-[10px] text-gray-400">조회 중...</span>
                          ) : geminiStatus?.active ? (
                            <span className="text-[10.5px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg font-extrabold flex items-center gap-1">
                              ● 연결됨 ({geminiStatus.prefix}...{geminiStatus.suffix})
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg font-extrabold">
                              ● 오프라인 (기본 백업 작동)
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 2. 고객 지원 */}
                  <div className="space-y-2">
                    <h4 className="text-[11.5px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">고객 지원</h4>
                    <div className="bg-white border border-gray-100 rounded-3xl p-4.5 space-y-3.5 shadow-sm">
                      
                      {/* Terms link */}
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600 transition-colors pointer-events-none font-sans">
                        <span>서비스 이용 약관</span>
                        <span className="text-gray-300 font-mono text-[11px]">→</span>
                      </div>

                      {/* Version display */}
                      <div className="flex justify-between items-center text-xs font-bold font-sans">
                        <span className="text-slate-600">버전 정보</span>
                        <span className="text-teal-600 font-extrabold bg-teal-50 px-2.5 py-0.5 rounded-lg text-[10px]">v1.5.0 (최신버전)</span>
                      </div>

                    </div>
                  </div>

                  {/* 3. 나의 학습 프로필 */}
                  <div className="space-y-2">
                    <h4 className="text-[11.5px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">성격 기제 및 학습 프로필</h4>
                    <div className="bg-white border border-gray-100 rounded-3xl p-4.5 space-y-3.5 shadow-sm">
                      <div className="flex justify-between items-center text-xs font-bold font-sans">
                        <span className="text-gray-500 font-medium">닉네임</span>
                        <span className="text-gray-800 font-extrabold">{persona.nickname}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold font-sans">
                        <span className="text-gray-500 font-medium">영어 학습 목표</span>
                        <span className="text-orange-500 font-black">{persona.goal} 회화</span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold font-sans">
                        <span className="text-gray-500 font-medium">성격 기제 (MBTI)</span>
                        <span className="text-slate-700 uppercase tracking-wide text-[10px] bg-stone-100 px-2 py-0.5 rounded-lg font-mono font-black">{persona.mbti} ({persona.mbtiGroup} 피드백)</span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold font-sans">
                        <span className="text-gray-500 font-medium">데일리 시간 목표</span>
                        <span className="text-slate-705 text-slate-750 font-extrabold">{persona.time}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold font-sans">
                        <span className="text-gray-500 font-medium">나의 스피킹 단계</span>
                        <span className="text-teal-600 font-black text-xs">LV.{persona.level}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleResetApp}
                    className="w-full bg-red-50 text-red-550 border border-red-100/60 font-black py-4 rounded-2xl hover:bg-slate-100/10 hover:text-red-600 transition-all text-xs cursor-pointer shadow-sm active:scale-98 font-sans"
                  >
                    🌱 닉네임 및 내 성향 다시 설정하기
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Sub-view Overlays: Learning and chat sessions */}
          {activeView === 'study-word' && (
            <StudyWordView 
              persona={persona} 
              customWord={dailyLesson.word} 
              onRewardEarned={handleRewardEarned}
              onBookmarkToggle={toggleBookmarkUnknown}
              unknownExpressions={unknownExpressions}
              onGoBack={() => setActiveView('dashboard')} 
            />
          )}

          {activeView === 'study-phrasal' && (
            <StudyPhrasalView 
              persona={persona} 
              customPhrasal={dailyLesson.phrasal} 
              onRewardEarned={handleRewardEarned}
              onBookmarkToggle={toggleBookmarkUnknown}
              unknownExpressions={unknownExpressions}
              onGoBack={() => setActiveView('dashboard')} 
            />
          )}

          {activeView === 'study-filler' && (
            <StudyFillerView 
              persona={persona} 
              customFiller={dailyLesson.filler} 
              onCompleteSession={handleLessonSessionFinish} 
              onGoBack={() => setActiveView('dashboard')} 
            />
          )}

          {activeView === 'study-expr' && (
            <StudyExprView 
              persona={persona} 
              customExpr={dailyLesson.expr} 
              onRewardEarned={handleRewardEarned}
              onBookmarkToggle={toggleBookmarkUnknown}
              unknownExpressions={unknownExpressions}
              onGoBack={() => setActiveView('dashboard')} 
            />
          )}

          {activeView === 'free-talk' && (
            <FreeTalkView 
              persona={persona} 
              activeQuestion={activeQuestion}
              questionsList={questionsList}
              selectedQuestionIndex={selectedQuestionIndex}
              onChangeQuestion={changeQuestionIndex}
              onSessionFinish={handleFreeTalkFinish} 
              autoTts={autoTts}
              onGoBack={(goToGarden) => {
                setActiveView('dashboard');
                if (goToGarden) {
                  setActiveTab('growth');
                }
              }} 
            />
          )}

        </div>

        {/* Global sticky Bottom Navigation bar */}
        {activeView === 'dashboard' && (
          <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-2.5 flex justify-around items-center z-30 select-none shadow-md">
            
            {/* Tab: Home */}
            <button
              onClick={() => handleTabChange('home')}
              className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                activeTab === 'home' ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <span className="text-xl">🏠</span>
              <span className="text-[9.5px] font-black">홈</span>
              {activeTab === 'home' && <span className="w-1 h-1 bg-orange-500 rounded-full mt-0.5 animate-pulse"></span>}
            </button>

            {/* Tab: History */}
            <button
              onClick={() => handleTabChange('history')}
              className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                activeTab === 'history' ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <span className="text-xl">📜</span>
              <span className="text-[9.5px] font-black">기록</span>
              {activeTab === 'history' && <span className="w-1 h-1 bg-orange-500 rounded-full mt-0.5 animate-pulse"></span>}
            </button>

            {/* Tab: Growth */}
            <button
              onClick={() => handleTabChange('growth')}
              className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                activeTab === 'growth' ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <span className="text-xl">📈</span>
              <span className="text-[9.5px] font-black">성장</span>
              {activeTab === 'growth' && <span className="w-1 h-1 bg-orange-500 rounded-full mt-0.5 animate-pulse"></span>}
            </button>

            {/* Tab: Settings */}
            <button
              onClick={() => handleTabChange('setting')}
              className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                activeTab === 'setting' ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <span className="text-xl">⚙️</span>
              <span className="text-[9.5px] font-black">설정</span>
              {activeTab === 'setting' && <span className="w-1 h-1 bg-orange-500 rounded-full mt-0.5 animate-pulse"></span>}
            </button>
          </div>
        )}

        {showResetModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-5 animate-fadeIn">
            <div className="bg-white rounded-[32px] p-6 w-full max-w-[320px] space-y-4 text-center border border-rose-100 shadow-2xl">
              <span className="text-4xl animate-bounce inline-block">💥</span>
              <h3 className="text-base font-black text-rose-600 leading-snug">농장 가꾸기 기록을<br />정말로 전부 파괴할까요?</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                이 작업은 즉시 실행되며 되돌릴 수 없습니다. 정원에 심긴 여러 개의 아기 화분, 누적 세션, 오답 정보, 그리고 12단계 심층 맞춤 성향 설정 카드가 영구 소거됩니다. 처음부터 새 정원을 개설하게 됩니다.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                >
                  아니오, 보존
                </button>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    localStorage.clear();
                    // Clean memory states
                    setPersona(null);
                    setTotalSessions(0);
                    setStreakDays(0);
                    setTrackedMistakes([]);
                    setGardenWater(5);
                    setGardenFertilizer(5);
                    setUnknownExpressions([]);
                    setDailyLesson({ word: null, phrasal: null, filler: null, expr: null });
                    setActiveTab('home');
                    setActiveView('dashboard');
                    // Fully refresh to reinitialize all components and avoid side-effect writing back to storage
                    window.location.reload();
                  }}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-md shadow-rose-500/25"
                >
                  네, 파괴/초기화
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
