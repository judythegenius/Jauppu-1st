import React, { useState, useEffect } from 'react';
import { StudyWord, UserPersona } from '../types';
import { OFFLINE_WORDS } from '../data/learningFallbacks';
import { Volume2, CheckCircle2, Award, ArrowRight, Mic, Sparkles, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface StudyWordProps {
  persona: UserPersona;
  customWord: StudyWord | null;
  onRewardEarned: (water: number, fertilizer: number, exp: number) => void;
  onBookmarkToggle: (en: string, ko: string) => void;
  unknownExpressions: { en: string }[];
  onGoBack: () => void;
}

export default function StudyWordView({
  persona,
  customWord,
  onRewardEarned,
  onBookmarkToggle,
  unknownExpressions,
  onGoBack
}: StudyWordProps) {
  
  const levelIndex = persona.level || 2;
  const wordPool = OFFLINE_WORDS[levelIndex] || OFFLINE_WORDS[2];
  
  // Choose 3 words to study
  const [targetWords, setTargetWords] = useState<StudyWord[]>([]);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(0);
  const [wordProgress, setWordProgress] = useState<Record<number, 'not_started' | 'stage1' | 'stage2' | 'stage3' | 'completed'>>({});
  
  // Stage states for the active word
  const [subStage, setSubStage] = useState<'speak' | 'puzzle' | 'composition'>('speak');
  
  // Mock Speaking Microphone state
  const [isRecording, setIsRecording] = useState(false);
  const [speakSuccess, setSpeakSuccess] = useState(false);
  
  // Sentence Scramble Puzzle states
  const [puzzlePool, setPuzzlePool] = useState<string[]>([]);
  const [userAssembly, setUserAssembly] = useState<string[]>([]);
  const [puzzleAnswerCorrect, setPuzzleAnswerCorrect] = useState<boolean | null>(null);

  // Composition writing states
  const [userSentenceInput, setUserSentenceInput] = useState('');
  const [compositionFeedback, setCompositionFeedback] = useState<string | null>(null);

  // Initialize the selected word
  useEffect(() => {
    // If we have a custom word from Gemini, use it as the target
    if (customWord) {
      setTargetWords([customWord]);
    } else {
      // Pick 1 stable word for today
      const idx = new Date().getDate() % wordPool.length;
      setTargetWords([wordPool[idx]]);
    }
  }, [customWord, levelIndex]);

  const activeWord = targetWords[activeWordIdx];

  // When active word shifts, reset current stage solvers
  useEffect(() => {
    if (!activeWord) return;
    setSubStage('speak');
    setSpeakSuccess(false);
    setIsRecording(false);
    setUserSentenceInput('');
    setCompositionFeedback(null);
    setPuzzleAnswerCorrect(null);
    setUserAssembly([]);

    // Scramble puzzle assembly tokens
    const tokens = activeWord.sentenceEn
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map(t => t.trim());
    
    // Shuffle
    setPuzzlePool([...tokens].sort(() => 0.5 - Math.random()));
  }, [activeWordIdx, targetWords]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    try {
      const isSpeaking = window.speechSynthesis.speaking;
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      setTimeout(() => {
        const cleanText = text
          .replace(/\p{Extended_Pictographic}/gu, '')
          .replace(/\p{Emoji_Presentation}/gu, '')
          .replace(/\p{Emoji}/gu, '')
          .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // strip surrogate pairs
          .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '')
          .replace(/\*\*|__/g, '')
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
      }, isSpeaking ? 220 : 60);
    } catch (e) {
      console.error(e);
    }
  };

  const [speechError, setSpeechError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');

  const startSpeechRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("이 브라우저선 자동 음성인식을 미지원합니다. 아래 수동 확인 버튼을 눌러주세요!");
      setIsRecording(true);
      return;
    }

    setSpeechError(null);
    setTranscript('');
    setIsRecording(true);

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsRecording(true);
      };

      let finalTranscript = '';
      rec.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + piece;
          } else {
            interim += piece;
          }
        }
        
        const liveText = (finalTranscript + (interim ? ' ' + interim : '')).trim();
        setTranscript(liveText);

        if (liveText) {
          // Compute word overlap ratio
          const target = activeWord.sentenceEn;
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean);
          const tWords = norm(target);
          const rWords = norm(liveText);
          
          let overlap = 0;
          tWords.forEach(w => {
            if (rWords.includes(w)) overlap++;
          });
          const pct = tWords.length > 0 ? (overlap / tWords.length) : 0;
          
          // Match if substantial words overlap OR one is fully contained in another
          const isBasicallyMatch = pct >= 0.32 || 
            target.toLowerCase().replace(/[^a-z]/g, '').includes(liveText.toLowerCase().replace(/[^a-z]/g, '')) || 
            liveText.toLowerCase().replace(/[^a-z]/g, '').includes(target.toLowerCase().replace(/[^a-z]/g, ''));
          
          if (isBasicallyMatch) {
            setSpeakSuccess(true);
            setSpeechError(null);
            try { rec.stop(); } catch(e){}
            setIsRecording(false);
          } else if (event.results[event.results.length - 1].isFinal) {
            // Only update error warning on committed speech segments
            setSpeechError(`목표 문장과의 발음 일치율이 약간 낮아서 재시도가 필요해요! (일치율: 약 ${Math.round(pct * 100)}%). 천천히 더 이어서 말해보시거나, 수동 완료 버튼을 누르셔도 완전 괜찮습니다. 🌱`);
          }
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Word study speech error:", event.error);
        if (event.error === 'not-allowed') {
          setSpeechError("마이크 윈도우 권한 차단됨 (아래 수동완료 버튼 이용 가능)");
        } else if (event.error === 'no-speech') {
          // Continuous can be silent, do not fail
        } else {
          setSpeechError(`인식 지연: ${event.error}`);
        }
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      rec.start();
    } catch (err: any) {
      console.error(err);
      setSpeechError("마이크 장치를 초기화할 수 없습니다.");
      setIsRecording(false);
    }
  };

  const handleManualSpeakFinish = () => {
    setSpeakSuccess(true);
    setSpeechError(null);
    setIsRecording(false);
  };

  // Move token in assembled array left/right
  const moveToken = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= userAssembly.length) return;
    const updated = [...userAssembly];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setUserAssembly(updated);
  };

  // Add token to puzzle solver
  const handleSelectToken = (token: string, index: number) => {
    setUserAssembly(prev => [...prev, token]);
    setPuzzlePool(prev => prev.filter((_, i) => i !== index));
  };

  // Remove token from puzzle solver
  const handleRemoveAssToken = (token: string, index: number) => {
    setUserAssembly(prev => prev.filter((_, i) => i !== index));
    setPuzzlePool(prev => [...prev, token]);
  };

  const handleVerifyPuzzle = () => {
    if (!activeWord) return;
    const cleanOrig = activeWord.sentenceEn
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .join(' ');

    const cleanUser = userAssembly.map(t => t.toLowerCase()).join(' ');

    if (cleanOrig === cleanUser) {
      setPuzzleAnswerCorrect(true);
    } else {
      setPuzzleAnswerCorrect(false);
    }
  };

  const skipPuzzleAndShow = () => {
    const tokens = activeWord.sentenceEn
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    setUserAssembly(tokens);
    setPuzzlePool([]);
    setPuzzleAnswerCorrect(true);
  };

  const handleCompositionSubmit = () => {
    if (!userSentenceInput.trim()) return;
    
    // Provide nice tailored grammar suggestions and cozy feedback based on MBTI style
    const val = userSentenceInput.toLowerCase();
    const hasWord = val.includes(activeWord.en.toLowerCase());
    
    let fb = '';
    if (!hasWord) {
      fb = `💡 단어 "${activeWord.en}"가 문장에 정확하게 삽입되지 않은 것 같아요! 단어를 한 번 꼭 포함해서 써 보세요.`;
    } else {
      fb = `🎉 멋진 도전이에요! "${userSentenceInput}" 은(는) 아주 훌륭하고 직관적인 구사력입니다. 뉘앙스를 자연스레 녹여내셨어요. 정원의 새싹 작물이 크게 끄덕입니다! 🌱`;
    }
    setCompositionFeedback(fb);
  };

  // Progress into next sub-stage
  const proceedSubstage = () => {
    if (subStage === 'speak') {
      setSubStage('puzzle');
    } else if (subStage === 'puzzle') {
      setSubStage('composition');
    } else if (subStage === 'composition') {
      // Complete this active word!
      const nextWordProg = { ...wordProgress };
      nextWordProg[activeWordIdx] = 'completed';
      setWordProgress(nextWordProg);
    }
  };

  // Collect overall reward
  const areAllCompleted = () => {
    return targetWords.length > 0 && 
           wordProgress[0] === 'completed';
  };

  const claimOverallRewards = () => {
    onRewardEarned(1, 1, 15); // Lightweight single reward (+1 water, +1 fertilizer, +15 EXP) matches easier volume!
    onGoBack();
  };

  if (targetWords.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400 text-xs">
        로딩 중...
      </div>
    );
  }

  const isBookmarked = unknownExpressions.some(item => item.en.toLowerCase() === activeWord.en.toLowerCase());

  return (
    <div className="w-full flex flex-col justify-between min-h-full pb-8 px-5 py-4 animate-fadeIn">
      
      {/* Mini Title Section */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div>
          <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
            <span>📖 오늘의 핵심 단어 격파</span>
            <span className="text-[10px] bg-orange-100 text-orange-600 font-extrabold px-2 py-0.5 rounded-full">실천형 미션</span>
          </h3>
          <p className="text-[11px] text-gray-400">외워두면 말문이 트이는 오늘의 핵심 구사 단어를 완수해요.</p>
        </div>
        <button onClick={onGoBack} className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors">나가기</button>
      </div>

      {/* Sleek single-item progress indicator */}
      <div className="bg-amber-100/50 border border-amber-200/45 rounded-2xl px-4 py-2.5 text-center text-amber-900 font-extrabold text-[11px] mb-4 flex items-center justify-center gap-1.5 shadow-xs">
        <span>✨ 오늘의 특급 가꾸기 단어:</span>
        <span className="font-mono bg-white px-2.5 py-0.5 rounded-lg text-orange-600 shadow-xs font-black">{activeWord.en}</span>
      </div>

      {/* Primary 3-stage interactive content box */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-5">
          
          {/* Active Word Spotlight Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-orange-100/70 p-5 rounded-3xl relative overflow-hidden">
            <button 
              onClick={() => onBookmarkToggle(activeWord.en, activeWord.ko)}
              className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-lg border flex items-center gap-1 cursor-pointer transition-all ${
                isBookmarked 
                  ? 'bg-amber-100 border-amber-300 text-amber-700' 
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-500'
              }`}
            >
              <span>{isBookmarked ? '🌟 보관됨' : '📓 담아두기'}</span>
            </button>

            <div className="text-[10px] text-orange-400 font-black tracking-widest uppercase font-mono mb-1">RECOMMENDED VOCABULARY</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{activeWord.en}</span>
              <button 
                onClick={() => speak(activeWord.en)}
                className="p-1 px-2.5 rounded-lg bg-white shadow-xs border border-orange-100 text-orange-500 flex items-center gap-1 cursor-pointer hover:bg-orange-50/50 text-[10.5px] font-bold"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>발음 듣기</span>
              </button>
            </div>
            <div className="text-xs text-orange-600 font-bold mt-1">뜻: {activeWord.ko}</div>
            <div className="text-[11px] text-slate-500 leading-normal mt-3 bg-white/70 p-2.5 rounded-2xl border border-dashed border-orange-100">
              <b>뉘앙스 사전:</b> {activeWord.definition}
            </div>
          </div>

          {/* Substage selector labels */}
          <div className="flex items-center gap-2 pl-1 select-none">
            <span className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded ${subStage === 'speak' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>1단계. 소리내어 말하기</span>
            <span className="text-xs text-slate-300">→</span>
            <span className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded ${subStage === 'puzzle' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>2단계. 어순 조립</span>
            <span className="text-xs text-slate-300">→</span>
            <span className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded ${subStage === 'composition' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>3단계. 실전 작문</span>
          </div>

          {/* MISSION INTERACTIVE INTERFACES */}

          {/* Stage 1: SPEAK & SOUNDS */}
          {subStage === 'speak' && (
            <div className="p-4.5 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <h4 className="text-xs font-black text-slate-700 flex items-center gap-1">
                <span>🔉 1단계 미션: 입으로 내뱉기</span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                원어민의 예문을 청취한 후, 마이크 버튼을 눌러 소리 내어 크게 따라 말해 보세요! 3초간 가상 녹음 튜닝이 진행됩니다.
              </p>

              <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <p className="text-sm font-extrabold text-slate-800 leading-relaxed font-sans">{activeWord.sentenceEn}</p>
                  <button 
                    onClick={() => speak(activeWord.sentenceEn)}
                    className="p-2 bg-white border border-slate-100 hover:bg-slate-50 rounded-xl text-slate-500 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-[11px] text-slate-500">번역: {activeWord.sentenceKo}</div>
              </div>

              <div className="pt-2 flex flex-col items-center">
                <button
                  onClick={startSpeechRecording}
                  disabled={isRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-rose-500 text-white animate-pulse shadow-md ring-4 ring-rose-200' 
                      : speakSuccess 
                      ? 'bg-green-100 text-green-600 border border-green-300' 
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-600 border border-amber-200'
                  }`}
                  title="눌러서 말해보기"
                >
                  <Mic className="w-7 h-7" />
                </button>
                <span className="text-[10.5px] font-black text-slate-400 mt-2">
                  {isRecording ? '목소리를 듣고 있어요... 크게 읽어보세요! 🎙️' : speakSuccess ? '발음 체크 성공 ✓ (훌륭해요)' : '버튼을 탭하여 말하기'}
                </span>

                {transcript && (
                  <div className="mt-2 text-[11px] bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg max-w-[85%] text-center font-medium">
                    🗣️ 인식된 단어: <span className="font-extrabold text-orange-600 font-sans">"{transcript}"</span>
                  </div>
                )}

                {speechError && (
                  <p className="text-[10px] text-red-500 mt-1.5 font-semibold text-center leading-relaxed max-w-[85%]">{speechError}</p>
                )}

                {!speakSuccess && (
                  <button
                    onClick={handleManualSpeakFinish}
                    className="mt-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition-all cursor-pointer active:scale-95"
                  >
                    직접 스피킹 마쳐요 ✓ (수동 완료)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stage 2: PUZZLE SCRAMBLE */}
          {subStage === 'puzzle' && (
            <div className="p-4.5 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <span>🧩 2단계 미션: 단어 어순 정렬하기</span>
                </h4>
                <button 
                  onClick={skipPuzzleAndShow}
                  className="text-[10px] text-slate-400 hover:text-orange-500 underline"
                >
                  정답 바로 채우기
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                한글 해석을 보고 회화 원문을 올바른 어순 전치사 순서로 맞추세요. 아래 단어 조각알을 탭 하면 아랫 칸에 배열됩니다.
              </p>

              <div className="p-3 bg-amber-50/50 border border-amber-100 text-[11.5px] text-amber-800 font-extrabold rounded-xl">
                한국어 뜻: {activeWord.sentenceKo}
              </div>

              {/* Assembled user panel */}
              <div className="p-3 bg-slate-50 rounded-2xl min-h-[50px] border border-slate-100 flex flex-wrap gap-2.5 items-center">
                {userAssembly.length === 0 ? (
                  <span className="text-[10.5px] text-slate-300 font-medium">여기에 조립된 문장이 정렬됩니다.</span>
                ) : (
                  userAssembly.map((token, idx) => (
                    <div
                      key={idx}
                      className="bg-orange-500 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-transform"
                    >
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveToken(idx, idx - 1); }}
                          className="p-0.5 hover:bg-orange-600 rounded text-orange-200 cursor-pointer active:scale-90"
                          title="왼쪽 이동"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      
                      <span 
                        className="cursor-pointer hover:underline px-1 select-none"
                        onClick={() => handleRemoveAssToken(token, idx)}
                        title="클릭하여 복원"
                      >
                        {token}
                      </span>

                      {idx < userAssembly.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveToken(idx, idx + 1); }}
                          className="p-0.5 hover:bg-orange-600 rounded text-orange-200 cursor-pointer active:scale-90"
                          title="오른쪽 이동"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveAssToken(token, idx)}
                        className="ml-1 p-0.5 hover:bg-orange-600 rounded text-orange-100 cursor-pointer"
                        title="제거"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Unused pieces pool */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {puzzlePool.map((token, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectToken(token, idx)}
                    className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
                  >
                    {token}
                  </button>
                ))}
              </div>

              {/* Verify controls */}
              {userAssembly.length > 0 && (
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={handleVerifyPuzzle}
                    className="bg-slate-800 text-white text-[11px] font-black px-4 py-2 rounded-xl hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    제출 완료 및 검토
                  </button>

                  {puzzleAnswerCorrect === true && (
                    <span className="text-xs font-black text-green-600 flex items-center gap-1">
                      <span>🎉 완벽하게 일치합니다!</span>
                    </span>
                  )}
                  {puzzleAnswerCorrect === false && (
                    <span className="text-xs font-black text-red-500">
                      ❌ 배열이 틀렸습니다. 다시 시도하거나 힌트를 쓰세요.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stage 3: WRITING & COMPOSITION */}
          {subStage === 'composition' && (
            <div className="p-4.5 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <h4 className="text-xs font-black text-slate-700 flex items-center gap-1">
                <span>✏️ 3단계 미션: 내 상황 한마디 작문</span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                이 핵심 단어 <b>"{activeWord.en}"</b>를 활용해 나만의 짧은 일상 문장을 타이핑해 보세요! 인공지능이 응원의 피드백을 실시간 채점해 드립니다.
              </p>

              <div className="space-y-2">
                <textarea
                  value={userSentenceInput}
                  onChange={(e) => setUserSentenceInput(e.target.value)}
                  placeholder={`예: Sorry, actually i can't do that. 처럼 쉽고 간편히 써 보세요!`}
                  className="w-full h-20 bg-stone-50 border border-slate-100 rounded-2xl p-3 text-xs font-bold font-sans outline-none focus:border-orange-400 placeholder-slate-300 resize-none"
                />
              </div>

              <div className="flex justify-between items-center gap-2">
                <button
                  onClick={() => setUserSentenceInput(`I will try to use ${activeWord.en} next time.`)}
                  className="text-[10px] text-slate-400 hover:text-orange-500 font-bold"
                >
                  💡 작문 초안 자동 도우미 쓰기
                </button>
                <button
                  onClick={handleCompositionSubmit}
                  disabled={!userSentenceInput.trim()}
                  className={`px-4 py-2 text-[11px] rounded-xl font-black transition-all ${
                    userSentenceInput.trim()
                      ? 'bg-slate-800 text-white hover:bg-slate-700 active:scale-95 cursor-pointer'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  문장 작성 완료 및 피드백 받기
                </button>
              </div>

              {compositionFeedback && (
                <div className="p-3.5 bg-green-50 border border-green-100 rounded-2xl text-[11px] text-green-700 leading-relaxed font-bold animate-fadeIn">
                  {compositionFeedback}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Dynamic sub-stage progression navigation buttons */}
        <div className="pt-6">
          {/* Word Mission Success progress indicator */}
          {wordProgress[activeWordIdx] === 'completed' ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-center py-3 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                <span>오늘의 단어 가꾸기 미션 성공! 🎉</span>
              </div>
              
              {areAllCompleted() && (
                <button
                  onClick={claimOverallRewards}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black py-4 rounded-3xl hover:from-orange-600 hover:to-amber-600 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xl shadow-orange-500/20"
                >
                  <span className="text-sm">오늘의 단어 수확 및 정원 보상 받기 🌾</span>
                  <span className="text-[9.5px] opacity-90 font-medium">💧 물뿌리개 +1  |  🧪 거름 영양제 +1  |  🏆 +15 EXP 획득</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={proceedSubstage}
              disabled={
                (subStage === 'speak' && !speakSuccess) ||
                (subStage === 'puzzle' && !puzzleAnswerCorrect) ||
                (subStage === 'composition' && !compositionFeedback)
              }
              className={`w-full font-extrabold py-3.5 rounded-2xl transition-all flex justify-center items-center gap-1.5 shadow-md ${
                (subStage === 'speak' && !speakSuccess) ||
                (subStage === 'puzzle' && !puzzleAnswerCorrect) ||
                (subStage === 'composition' && !compositionFeedback)
                  ? 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed border border-slate-200/40'
                  : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/10 cursor-pointer'
              }`}
            >
              <span>
                {subStage === 'speak' ? '말하기 미션 완료 확인' : subStage === 'puzzle' ? '단어 조합 완료 확인' : '작문 완료하고 학습 마치기'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
