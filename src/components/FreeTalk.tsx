import React, { useState, useRef, useEffect } from 'react';
import { UserPersona, ChatMessage, Mistake } from '../types';
import { Send, Volume2, Mic, Check, ArrowRight, ThumbsUp, Loader2, Sparkles, Smile } from 'lucide-react';

interface FreeTalkProps {
  persona: UserPersona;
  activeQuestion: string;
  questionsList: string[];
  selectedQuestionIndex: number;
  onChangeQuestion: () => void;
  onSessionFinish: (gainedExp: number, newMistakes: Mistake[]) => void;
  onGoBack: (goToGarden?: boolean) => void;
  autoTts?: boolean;
}

export default function FreeTalkView({ 
  persona, 
  activeQuestion, 
  questionsList, 
  selectedQuestionIndex, 
  onChangeQuestion, 
  onSessionFinish, 
  onGoBack,
  autoTts = true
}: FreeTalkProps) {
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Dynamic sync whenever the active starting question is updated/reset!
  useEffect(() => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'ai',
        text: activeQuestion,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [activeQuestion]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMicSpeaking, setIsMicSpeaking] = useState(false);
  const [micErrorMsg, setMicErrorMsg] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const initialTextRef = useRef('');
  const accumulatedFinalsRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  
  // Record of revealed AI message text IDs
  const [revealedMessages, setRevealedMessages] = useState<Record<string, boolean>>({});

  // Warm up voices on mount and prevent early unprompted autoplay blocks
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
  }, []);
  
  // Keep track of mistakes caught in this session
  const [sessionMistakes, setSessionMistakes] = useState<Mistake[]>([]);
  
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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
        utterance.rate = 0.84;
        utterance.volume = 1;

        let voices = window.speechSynthesis.getVoices();
        const selectVoice = () => {
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
        };

        selectVoice();
        
        // Prevent Garbage Collection cutting off speech mid-sentence
        (window as any)._activeUtterances = (window as any)._activeUtterances || [];
        (window as any)._activeUtterances.push(utterance);
        
        utterance.onend = () => {
          (window as any)._activeUtterances = (window as any)._activeUtterances.filter((u: any) => u !== utterance);
        };
        utterance.onerror = (e) => {
          // Silence 'interrupted' which is an expected consequence of .cancel() or switching tasks
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
      console.error('Speech synthesis error:', e);
    }
  };

  const speakGuide = () => {
    speak(activeQuestion);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMsgText = inputText.trim();
    setInputText('');
    
    // Reset textarea height immediately after sending
    const textarea = document.getElementById('freeTalkInput') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.style.height = 'auto';
    }

    const userTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: userTime
    };

    setMessages(prev => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userMsgText,
          history: messages,
          mbti: persona.mbti,
          goal: persona.goal,
          level: persona.level,
          trauma: persona.trauma,
          question: activeQuestion
        })
      });

      if (!response.ok) {
        throw new Error('서버와 임시 통신이 원활치 않습니다. 인안도 로컬 자율 뇌로 가동됩니다.');
      }

      const data = await response.json();
      const aiTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

      // Convert server feedback corrections to local typed Mistake structure
      const parsedCorrections: Mistake[] = (data.corrections || []).map((c: any, index: number) => ({
        id: `m-${Date.now()}-${index}`,
        before: c.before,
        after: c.after,
        tip: c.tip,
        type: c.type || 'grammar',
        category: c.category,
        timestamp: new Date().toISOString(),
        count: 1
      }));

      // Append mistakes discovered to session collector
      if (parsedCorrections.length > 0) {
        setSessionMistakes(prev => [...prev, ...parsedCorrections]);
      }

      const updatedUserMessage: ChatMessage = {
        ...newUserMessage,
        corrections: parsedCorrections
      };

      const newAiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply,
        timestamp: aiTime
      };

      setMessages(prev => {
        // Swap user message with updated containing corrective feedback
        const filterPrev = prev.filter(m => m.id !== newUserMessage.id);
        return [...filterPrev, updatedUserMessage, newAiMessage];
      });

      // Auto TTS if user has spoken and autoTts setting is enabled
      if (autoTts !== false) {
        speak(data.reply);
      }

    } catch (err: any) {
      console.error(err);
      // Fallback response inside safety if API gets throttled
      const fallbacks = [
        "That is awesome! Tell me more about what you like.",
        "That sounds very interesting. Why do you enjoy that so much?",
        "I totally agree with you! It makes perfect sense.",
        "Wow! Thanks for sharing. How did you learn to do that?"
      ];
      const fallbackReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      const aiTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      
      const newAiMessage: ChatMessage = {
        id: `ai-fb-${Date.now()}`,
        sender: 'ai',
        text: fallbackReply,
        timestamp: aiTime
      };

      setMessages(prev => [...prev, newAiMessage]);
      if (autoTts !== false) {
        speak(fallbackReply);
      }
    } finally {
      setLoading(false);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicErrorMsg("자체 음성 받아쓰기가 차단되었습니다.");
      setIsMicSpeaking(true);
      return;
    }

    initialTextRef.current = inputText;
    accumulatedFinalsRef.current = '';
    setInterimTranscript('');

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      
      rec.onstart = () => {
        setIsMicSpeaking(true);
        setMicErrorMsg(null);
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let currentFinals = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinals += piece + ' ';
          } else {
            interim += piece;
          }
        }
        
        if (currentFinals) {
          accumulatedFinalsRef.current += currentFinals;
        }
        
        const fullFinal = (initialTextRef.current ? initialTextRef.current + ' ' : '') + accumulatedFinalsRef.current;
        setInputText(fullFinal.trim());
        setInterimTranscript(interim.trim());
      };

      rec.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          setMicErrorMsg("마이크 하드웨어 권한이 차단되었습니다. 브라우저 주소창 왼쪽의 자물쇠/설정 아이콘을 눌러 마이크 사용 권한을 허용해 주세요!");
        } else if (event.error === 'no-speech') {
          // In continuous mode, no-speech can fire if quiet, but don't close immediately. 
          // We can just log it or warn.
        } else if (event.error === 'network') {
          setMicErrorMsg("네트워크 지연으로 인해 음성 인식이 일시 해제되었습니다. 연결망을 확인하고 다시 눌러 주세요.");
        } else if (event.error === 'aborted') {
          // Silent abortion can happen when stop() is called, bypass warning
        } else {
          setMicErrorMsg(`마이크 연결 지연 (시스템 오류 정보: ${event.error})`);
        }
      };

      rec.onend = () => {
        setIsMicSpeaking(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      setMicErrorMsg("마이크 연결 실패");
      setIsMicSpeaking(true);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsMicSpeaking(false);
    setMicErrorMsg(null);
    setInterimTranscript('');
  };

  const finishSession = () => {
    // Gives +40 EXP for a comprehensive Speaking Session
    onSessionFinish(40, sessionMistakes);
    setSessionCompleted(true);
  };

  if (sessionCompleted) {
    // Categorize mistakes beautifully
    const categories = {
      tenses: [] as Mistake[],
      prepositions: [] as Mistake[],
      nativeAlt: [] as Mistake[],
      others: [] as Mistake[]
    };

    sessionMistakes.forEach(m => {
      const cat = (() => {
        if (m.category && ['tenses', 'prepositions', 'nativeAlt', 'others'].includes(m.category)) {
          return m.category;
        }
        
        const beforeText = (m.before || '').trim();
        const afterText = (m.after || '').trim();
        const tipText = m.tip || '';
        const typeText = m.type || '';
        const cleanBefore = beforeText.toLowerCase();
        const cleanAfter = afterText.toLowerCase();

        // 1. Korean in before is 100% Native Accent / Nuance choice
        if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(beforeText)) {
          return 'nativeAlt';
        }

        // 2. Prepositions, Articles, and Plurals/Singular Number (-s)
        const hasPrepKeywords = 
          tipText.includes('전치사') || 
          tipText.includes('관사') || 
          tipText.includes('정관사') || 
          tipText.includes('부정관사') ||
          tipText.includes('복수') || 
          tipText.includes('단수') ||
          tipText.includes('알파벳 s') ||
          tipText.includes('뒤에 s') ||
          tipText.includes('preposition') || 
          tipText.includes('article') ||
          tipText.includes('plural');

        const prepWords = ['in', 'on', 'at', 'of', 'for', 'to', 'with', 'by', 'from', 'a', 'an', 'the', 's'];
        const isStrictPrepChange = prepWords.includes(cleanBefore) || prepWords.includes(cleanAfter);

        if (hasPrepKeywords || isStrictPrepChange) {
          return 'prepositions';
        }

        // 3. Verbs, Tenses, Agreements
        const hasTenseKeywords = 
          tipText.includes('시제') || 
          tipText.includes('과거형') || 
          tipText.includes('현재형') || 
          tipText.includes('미래형') || 
          tipText.includes('수일치') || 
          tipText.includes('be동사') || 
          tipText.includes('b동사') || 
          tipText.includes('3인칭') || 
          tipText.includes('동사원형') || 
          tipText.includes('tense') || 
          tipText.includes('verb') ||
          tipText.includes('conjugation') ||
          tipText.includes('conjugate') ||
          /^(am|is|are|was|were|has|have|had|do|does|did|go|going|wants|loves|likes)$/.test(cleanBefore) ||
          /^(am|is|are|was|were|has|have|had|do|does|did)$/.test(cleanAfter);

        const hasGeneralVerbKeywords = tipText.includes('동사') && !tipText.includes('동사 뒤에는');

        if (hasTenseKeywords || hasGeneralVerbKeywords) {
          return 'tenses';
        }

        // 4. Native Nuance & Natural alternatives
        const hasNativeKeywords = 
          tipText.includes('직역') || 
          tipText.includes('어색') || 
          tipText.includes('어투') || 
          tipText.includes('뉘앙스') || 
          tipText.includes('자연스') || 
          tipText.includes('원어민') || 
          tipText.includes('통상') || 
          tipText.includes('native') || 
          tipText.includes('idiom') || 
          tipText.includes('alternative') ||
          typeText === 'vocab';

        if (hasNativeKeywords) {
          return 'nativeAlt';
        }

        return 'others';
      })();

      if (cat === 'tenses') {
        categories.tenses.push(m);
      } else if (cat === 'prepositions') {
        categories.prepositions.push(m);
      } else if (cat === 'nativeAlt') {
        categories.nativeAlt.push(m);
      } else {
        categories.others.push(m);
      }
    });

    return (
      <div className="w-full flex flex-col items-center justify-center text-center px-6 py-12 space-y-6 animate-fadeIn max-h-full overflow-y-auto">
        <div className="w-20 h-20 bg-gradient-to-tr from-orange-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20 animate-bounce">
          <Smile className="w-11 h-11 text-white" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xl font-black text-gray-800">🗣 프리토크 회강 통과!</h4>
          <p className="text-sm text-gray-500 leading-relaxed px-2">
            <b>{persona.nickname}</b>님, 주눅 들지 않고 솔직 담백하게 대화해주셔서 진심으로 고마워요!<br />
            실수들은 성장을 위한 빛나는 비료(Fertilizer)가 됩니다.
          </p>
        </div>

        <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-2xl w-full flex flex-col gap-2.5 text-left">
          <div className="flex justify-between items-center border-b border-orange-100/50 pb-2">
            <span className="text-xs text-orange-600 font-bold">진도 누적 보상</span>
            <span className="font-extrabold text-orange-600 text-sm">물뿌리개 +1, 비료 +1, +40 EXP</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>나눈 이야기 분량</span>
            <span className="font-bold text-gray-750">{messages.filter(m => m.sender === 'user').length}회 티키타카</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>발견된 문법/뉘앙스 오답</span>
            <span className="font-bold text-gray-750">{sessionMistakes.length}개 자동 처방</span>
          </div>
        </div>

        {sessionMistakes.length > 0 && (
          <div className="w-full text-left space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Sparkles className="w-4 h-4 text-orange-500 animate-pulse animate-duration-1000" />
              <span className="text-xs font-extrabold text-slate-800">1:1 안심 정밀 진단 리포트 (카테고리 요약)</span>
            </div>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {/* Category 1: 시제 및 수일치 */}
              {categories.tenses.length > 0 && (
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-rose-100/50 pb-1.5">
                    <span className="text-[11px] font-black text-rose-700 flex items-center gap-1">⏰ 시제 및 수일치 실수 ({categories.tenses.length}개)</span>
                    <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded">동사 형태 처방</span>
                  </div>
                  <div className="space-y-3">
                    {categories.tenses.map((m, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 space-y-1.5 shadow-xs">
                        <div className="text-[10.5px] text-red-500 font-semibold">어색한 표현: <span className="font-extrabold bg-red-50/50 px-1.5 py-0.5 rounded">{m.before}</span></div>
                        <div className="text-[11.5px] text-green-700 font-bold flex items-center gap-1">이렇게 고쳐보세요: <span className="font-extrabold bg-green-50 px-1.5 py-0.5 rounded">{m.after}</span></div>
                        {m.tip && <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200 mt-1 whitespace-pre-wrap">💡 {m.tip}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 2: 전치사 및 관사 튜너 */}
              {categories.prepositions.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-amber-100/50 pb-1.5">
                    <span className="text-[11px] font-black text-amber-700 flex items-center gap-1">🏷 전치사 & 관사 사용 ({categories.prepositions.length}개)</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded">정교함 처방</span>
                  </div>
                  <div className="space-y-3">
                    {categories.prepositions.map((m, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 space-y-1.5 shadow-xs">
                        <div className="text-[10.5px] text-red-500 font-semibold">어색한 표현: <span className="font-extrabold bg-red-50/50 px-1.5 py-0.5 rounded">{m.before}</span></div>
                        <div className="text-[11.5px] text-green-700 font-bold flex items-center gap-1">이렇게 고쳐보세요: <span className="font-extrabold bg-green-50 px-1.5 py-0.5 rounded">{m.after}</span></div>
                        {m.tip && <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200 mt-1 whitespace-pre-wrap">💡 {m.tip}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: 원어민식 자연스러운 뉘앙스 */}
              {categories.nativeAlt.length > 0 && (
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-emerald-100/50 pb-1.5">
                    <span className="text-[11px] font-black text-emerald-800 flex items-center gap-1">🌱 자연스러운 뉘앙스 대비 ({categories.nativeAlt.length}개)</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">표현 의역 처방</span>
                  </div>
                  <div className="space-y-3">
                    {categories.nativeAlt.map((m, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 space-y-1.5 shadow-xs">
                        <div className="text-[10.5px] text-red-500 font-semibold">딱딱한 직역: <span className="font-extrabold bg-red-50/50 px-1.5 py-0.5 rounded">{m.before}</span></div>
                        <div className="text-[11.5px] text-green-700 font-bold flex items-center gap-1">추천 표현: <span className="font-extrabold bg-green-50 px-1.5 py-0.5 rounded">{m.after}</span></div>
                        {m.tip && <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200 mt-1 whitespace-pre-wrap">💡 {m.tip}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 4: 기타 일반 구문 및 구조 문법 */}
              {categories.others.length > 0 && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-indigo-100/50 pb-1.5">
                    <span className="text-[11px] font-black text-indigo-700 flex items-center gap-1">🧩 일반 구문 및 핵심 문법 ({categories.others.length}개)</span>
                    <span className="text-[9px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded">어순/구조 처방</span>
                  </div>
                  <div className="space-y-3">
                    {categories.others.map((m, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 space-y-1.5 shadow-xs">
                        <div className="text-[10.5px] text-red-500 font-semibold">어색한 표현: <span className="font-extrabold bg-red-50/50 px-1.5 py-0.5 rounded">{m.before}</span></div>
                        <div className="text-[11.5px] text-green-700 font-bold flex items-center gap-1">이렇게 고쳐보세요: <span className="font-extrabold bg-green-50 px-1.5 py-0.5 rounded">{m.after}</span></div>
                        {m.tip && <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200 mt-1 whitespace-pre-wrap">💡 {m.tip}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => onGoBack(true)}
          className="w-full bg-orange-500 hover:bg-orange-600 font-bold text-white py-4 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
        >
          정원으로 가꾸러 가기
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col justify-between h-full relative bg-slate-50 rounded-t-3xl border-t border-gray-100 overflow-hidden">
      {/* Free Talk Header - Beautiful responsive layout with question selector */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm z-10 rounded-t-3xl flex-shrink-0">
        <div className="flex items-center gap-2 max-w-[62%]">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center font-bold text-sm text-orange-500 flex-shrink-0">
            🦊
          </div>
          <div className="truncate">
            <div className="font-extrabold text-xs text-slate-800">{persona.goal} 1:1 파트너</div>
            <div className="text-[9px] text-slate-400 flex items-center gap-1">
              <span className="w-1 h-1 bg-green-500 rounded-full"></span>
              <span className="truncate">안심 프리토킹 진행 중</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 items-center flex-shrink-0">
          <button 
            type="button"
            onClick={onChangeQuestion}
            className="flex items-center gap-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[9.5px] px-2 py-1.5 rounded-full border border-amber-200/50 cursor-pointer transition-all active:scale-95"
            title="다른 질문으로 변경"
          >
            🔄 질문변경
          </button>
          
          {messages.length > 2 && (
            <button 
              type="button"
              onClick={finishSession}
              className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[9.5px] px-2.5 py-1.5 rounded-full cursor-pointer transition-all"
            >
              제출
            </button>
          )}
          <button onClick={onGoBack} className="text-[10px] text-slate-400 font-bold px-2 py-1 cursor-pointer">종료</button>
        </div>
      </div>

      {/* Message Stream - Beautiful scrolling card area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 font-sans text-xs min-h-0" ref={chatScrollRef}>
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          
          return (
            <div key={m.id} className="space-y-1.5">
              <div className={`flex items-end gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {/* AI Avatar */}
                {!isUser && (
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold border border-orange-200">
                    🦊
                  </div>
                )}
                
                <div className={`max-w-[78%] p-3.5 rounded-2xl relative shadow-sm ${
                  isUser 
                    ? 'bg-slate-700 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                }`}>
                  {!isUser && !revealedMessages[m.id] ? (
                    <div className="space-y-2.5 py-1 pr-4">
                      <div className="flex items-center gap-1.5 text-[10.5px] text-orange-600 font-extrabold bg-orange-50 px-2 py-1 rounded-lg">
                        <Volume2 className="w-3.5 h-3.5 animate-pulse text-orange-500 animate-bounce" />
                        <span>귀로 먼저 들어보세요! 🎧</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => speak(m.text)}
                          className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg inline-flex items-center gap-1 transition-all text-[9.5px] cursor-pointer shadow-sm active:scale-95 animate-pulse"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>듣기</span>
                        </button>
                        <button 
                          onClick={() => setRevealedMessages(prev => ({ ...prev, [m.id]: true }))}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-extrabold rounded-lg inline-flex items-center transition-all text-[9.5px] cursor-pointer active:scale-95"
                        >
                          <span>👁️ 텍스트 보기</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="leading-relaxed font-semibold text-sm whitespace-pre-wrap pr-4">{m.text}</p>
                      
                      {/* Speaker helper for AI text */}
                      {!isUser && (
                        <button 
                          onClick={() => speak(m.text)}
                          className="absolute right-1.5 bottom-1.5 p-1 bg-stone-50 hover:bg-stone-100 rounded-lg text-slate-400 cursor-pointer"
                          title="발음 다시 듣기"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                <span className="text-[9px] text-slate-400 self-end mb-1 font-mono">{m.timestamp}</span>
              </div>

              {/* Dynamic corrections are saved in the sessionMistakes for the final 1:1 Diagnostic Summary Report */}
            </div>
          );
        })}

        {/* Packing dots indicator */}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs text-orange-500 animate-spin">
              💫
            </div>
            <div className="bg-white border border-slate-100 text-slate-500 p-3 rounded-2xl rounded-tl-none max-w-[65%] flex items-center gap-2 shadow-sm font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
              <span>파트너가 다음 대답을 생각하고 있어요... 💭</span>
            </div>
          </div>
        )}
      </div>

      {/* Mic Animation wave overlay */}
      {isMicSpeaking && (
        <div className="absolute inset-x-0 bottom-0 top-12 bg-slate-950/95 transition-all flex flex-col items-center justify-between z-20 text-white p-6 py-10 text-center animate-fadeIn">
          <div className="space-y-2.5 mt-2">
            <span className="text-4xl animate-pulse block">🎙️</span>
            <h4 className="text-sm font-black text-white">음성 받아쓰기 활성화</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed max-w-[280px] mx-auto">
              발음이나 문법에 대한 주눅 없이, 하고 싶은 말을 편안하게 말해 보세요.
            </p>
          </div>

          {/* Real-time Live Preview Panel */}
          <div className="w-full max-w-[340px] bg-slate-900 border border-slate-800 rounded-3xl p-4.5 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center text-[9.5px] font-black text-orange-400 tracking-wider">
              <span className="flex items-center gap-1.5 pl-0.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                실시간 텍스트 인식 중
              </span>
              <span className="text-slate-500">Continuous Dictation</span>
            </div>
            
            <div className="min-h-[100px] max-h-[150px] overflow-y-auto text-left text-xs leading-relaxed p-4 rounded-xl border border-slate-850 bg-slate-950/50">
              {inputText ? (
                <span className="text-slate-100 font-bold whitespace-pre-wrap">{inputText}</span>
              ) : (
                <span className="text-slate-500 italic">말씀을 시작해 보세요. 음성이 감지되면 여기에 실시간 변환됩니다...</span>
              )}
              {interimTranscript && (
                <span className="text-amber-300 font-extrabold animate-pulse block mt-2">
                  🗣️ {interimTranscript}
                </span>
              )}
            </div>
            
            <p className="text-[9px] text-slate-400 leading-normal font-medium text-left">
              💡 중간에 <b>"어---"</b> 하거나 <b>쉼표를 길게 두시더라도</b> 끊기지 않고 끝까지 안전하게 기다려 줍니다! 자유롭게 편안한 호흡으로 이야기하세요.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 w-full">
            {micErrorMsg ? (
              <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 max-w-[320px] text-left space-y-2 text-amber-200">
                <span className="text-xs font-black block text-amber-400">💡 음성 마이크 안내 ({micErrorMsg})</span>
                <span className="text-[10.5px] text-slate-300 leading-relaxed block font-medium">
                  웹 브라우저의 마이크 승인 상태를 확인해 주세요. 특히 안전한 가상 iFrame 내부에서는 브라우저 보안 규정에 의해 일반 마이크가 비활성화될 수 있습니다.<br /><br />
                  <b>쉽고 간편한 꿀팁:</b><br />
                  1. 스마트폰 가상 키보드 자판에 있는 <b>마이크 단추(기본 받아쓰기)</b>를 사용하시면 훨씬 쾌적하게 한글/영어가 변환됩니다!<br />
                  2. 화면 오른쪽 위에 위치한 <b>'새 창에서 열기'</b> 아이콘을 눌러 풀브라우저 모드로 접속하면 정식 마이크 작동이 매끄럽게 지원됩니다.
                </span>
              </div>
            ) : (
              <div className="flex gap-2 items-center justify-center h-10 select-none">
                <div className="w-1.5 h-6 bg-orange-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-10 bg-orange-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                <div className="w-1.5 h-14 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-8 bg-orange-500 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                <div className="w-1.5 h-4 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={stopSpeechRecognition}
            className="w-full max-w-[200px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-3 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-md shadow-amber-500/20"
          >
            기록 마쳐요 (말하기 완료) ✓
          </button>
        </div>
      )}

      {/* Conversation Input Console - With Auto Expanding Textarea */}
      <div className="bg-white border-t border-slate-100 p-3 flex flex-col gap-2 rounded-b-3xl flex-shrink-0">
        <div className="flex gap-2 items-end">
          <button 
            type="button"
            onClick={startSpeechRecognition}
            className={`p-3.5 rounded-2xl cursor-pointer text-white flex items-center justify-center shadow-md active:scale-90 transition-all mb-0.5 ${
              isMicSpeaking ? 'bg-orange-400 shadow-orange-500/20' : 'bg-slate-700 shadow-slate-700/10'
            }`}
            title="마이크 스피킹"
          >
            <Mic className="w-4.5 h-4.5" />
          </button>
          
          <div className="flex-1 relative flex items-center min-w-0">
            <textarea
              id="freeTalkInput"
              rows={1}
              placeholder="틀린 문장도 백점! 안심하고 한마디 적으세요..."
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                // Dynamically resize height
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(110, e.target.scrollHeight)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                }
              }}
              disabled={loading}
              className="w-full bg-slate-100 border border-transparent focus:border-slate-300 focus:bg-white rounded-2xl px-4 py-3 text-xs outline-none transition-all pr-12 text-slate-800 font-semibold resize-none max-h-[110px] overflow-y-auto pt-3.5 no-scrollbar leading-relaxed"
            />
            <button
              onClick={async () => {
                await handleSendMessage();
                const textarea = document.getElementById('freeTalkInput') as HTMLTextAreaElement | null;
                if (textarea) {
                  textarea.style.height = 'auto';
                }
              }}
              disabled={!inputText.trim() || loading}
              className={`absolute right-1.5 bottom-1.5 p-2 rounded-xl cursor-pointer transition-all ${
                inputText.trim() && !loading ? 'bg-orange-500 text-white hover:opacity-90 active:scale-95' : 'text-slate-300 bg-slate-50'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center px-1 text-[9.5px] text-slate-400">
          <span>💡 2마디 이상 나누면 🌿 저장이 활성화됩니다.</span>
          <button onClick={speakGuide} className="text-orange-500 font-bold hover:underline cursor-pointer">🎧 파트너 오프닝 발음 듣기</button>
        </div>
      </div>
    </div>
  );
}
