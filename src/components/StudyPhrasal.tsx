import React, { useState, useEffect } from 'react';
import { StudyPhrasal, UserPersona } from '../types';
import { OFFLINE_PHRASALS } from '../data/learningFallbacks';
import { Volume2, CheckCircle2, Award, ArrowRight, Mic, Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface StudyPhrasalProps {
  persona: UserPersona;
  customPhrasal: StudyPhrasal | null;
  onRewardEarned: (water: number, fertilizer: number, exp: number) => void;
  onBookmarkToggle: (en: string, ko: string) => void;
  unknownExpressions: { en: string }[];
  onGoBack: () => void;
}

export default function StudyPhrasalView({
  persona,
  customPhrasal,
  onRewardEarned,
  onBookmarkToggle,
  unknownExpressions,
  onGoBack
}: StudyPhrasalProps) {
  
  const goalKey = persona.goal || '일상';
  const phrasalPool = OFFLINE_PHRASALS[goalKey] || OFFLINE_PHRASALS['일상'];
  
  // Choose 1 phrasal verb for today
  const [targetPhrasals, setTargetPhrasals] = useState<StudyPhrasal[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [progState, setProgState] = useState<Record<number, 'not_started' | 'completed'>>({});
  
  // Stages states: 'speak' | 'puzzle' | 'composition'
  const [subStage, setSubStage] = useState<'speak' | 'puzzle' | 'composition'>('speak');

  // Mic simulation states
  const [isRecording, setIsRecording] = useState(false);
  const [speakSuccess, setSpeakSuccess] = useState(false);

  // Scramble states
  const [puzzlePool, setPuzzlePool] = useState<string[]>([]);
  const [userAssembly, setUserAssembly] = useState<string[]>([]);
  const [puzzleCorrect, setPuzzleCorrect] = useState<boolean | null>(null);

  // Composition states
  const [userWritingInput, setUserWritingInput] = useState('');
  const [writingFeedback, setWritingFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (customPhrasal) {
      setTargetPhrasals([customPhrasal]);
    } else {
      const idx = new Date().getDate() % phrasalPool.length;
      setTargetPhrasals([phrasalPool[idx]]);
    }
  }, [customPhrasal, goalKey]);

  const activePhrasal = targetPhrasals[activeIdx];

  // Refresh whenever active idx changes
  useEffect(() => {
    if (!activePhrasal) return;
    setSubStage('speak');
    setSpeakSuccess(false);
    setIsRecording(false);
    setUserWritingInput('');
    setWritingFeedback(null);
    setPuzzleCorrect(null);
    setUserAssembly([]);

    const tokens = activePhrasal.sentenceEn
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map(t => t.trim());
    
    setPuzzlePool([...tokens].sort(() => 0.5 - Math.random()));
  }, [activeIdx, targetPhrasals]);

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
          const target = activePhrasal.sentenceEn;
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
            setSpeechError(`목표 구동사의 발음 일치율이 약간 낮네요! (일치율: 약 ${Math.round(pct * 100)}%). 천천히 더 이어서 크게 말씀해 주시거나 수동 완료 처리를 하셔도 전승 기록에 모두 인정됩니다! 🌱`);
          }
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Phrasal study speech error:", event.error);
        if (event.error === 'not-allowed') {
          setSpeechError("마이크 윈도우 권한 차단됨 (아래 수동완료 버튼 이용 가능)");
        } else if (event.error === 'no-speech') {
          // Silent continuous space
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

  const selectPuzzleToken = (t: string, index: number) => {
    setUserAssembly(prev => [...prev, t]);
    setPuzzlePool(prev => prev.filter((_, i) => i !== index));
  };

  const removePuzzleToken = (t: string, index: number) => {
    setUserAssembly(prev => prev.filter((_, i) => i !== index));
    setPuzzlePool(prev => [...prev, t]);
  };

  const checkAssembleAnswer = () => {
    if (!activePhrasal) return;
    const orig = activePhrasal.sentenceEn
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .join(' ');

    const user = userAssembly.map(t => t.toLowerCase()).join(' ');

    if (orig === user) {
      setPuzzleCorrect(true);
    } else {
      setPuzzleCorrect(false);
    }
  };

  const quickRevealPuzzle = () => {
    const tokens = activePhrasal.sentenceEn
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    setUserAssembly(tokens);
    setPuzzlePool([]);
    setPuzzleCorrect(true);
  };

  const checkUserWriting = () => {
    if (!userWritingInput.trim()) return;
    const hasWord = userWritingInput.toLowerCase().includes(activePhrasal.en.toLowerCase());
    
    let answerText = '';
    if (!hasWord) {
      answerText = `💡 구동사 "${activePhrasal.en}"를 최소 1회 문맥에 녹여내야 원예 에너지가 채워집니다. 다시 엮어 보세요!`;
    } else {
      answerText = `🎉 탁월합니다! 실감 나는 작문을 마스터해 수확을 대기 중인 상태입니다. 이대로 정원을 넓혀 보세요!`;
    }
    setWritingFeedback(answerText);
  };

  const proceedSubstage = () => {
    if (subStage === 'speak') {
      setSubStage('puzzle');
    } else if (subStage === 'puzzle') {
      setSubStage('composition');
    } else if (subStage === 'composition') {
      const nextProg = { ...progState };
      nextProg[activeIdx] = 'completed';
      setProgState(nextProg);
    }
  };

  const areAllDone = () => {
    return targetPhrasals.length > 0 &&
           progState[0] === 'completed';
  };

  const claimPhrasalReward = () => {
    onRewardEarned(1, 1, 20); // Lightweight single reward (+1 water, +1 fertilizer, +20 EXP) matches easier volume!
    onGoBack();
  };

  if (targetPhrasals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400 text-xs">
        로딩 중...
      </div>
    );
  }

  const isBookmarked = unknownExpressions.some(it => it.en.toLowerCase() === activePhrasal.en.toLowerCase());

  return (
    <div className="w-full flex flex-col justify-between min-h-full pb-8 px-5 py-4 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div>
          <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
            <span>🔗 필수 구동사 숙달</span>
            <span className="text-[10px] bg-teal-100 text-teal-700 font-extrabold px-2 py-0.5 rounded-full">상황 결합</span>
          </h3>
          <p className="text-[11px] text-gray-400">네이티브가 빈번히 결합하여 활용하는 유용한 구동사를 격파해요.</p>
        </div>
        <button onClick={onGoBack} className="text-xs text-slate-400 hover:text-red-500 font-bold">나가기</button>
      </div>

      {/* Sleek single-item progress indicator */}
      <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-2.5 text-center text-teal-950 font-extrabold text-[11px] mb-4 flex items-center justify-center gap-1.5 shadow-xs">
        <span>✨ 오늘의 특급 가꾸기 구동사:</span>
        <span className="font-mono bg-white px-2.5 py-0.5 rounded-lg text-teal-700 shadow-xs font-black">{activePhrasal.en}</span>
      </div>

      {/* Content box */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-5">
          
          {/* Main Flash Spotlight */}
          <div className="bg-gradient-to-br from-teal-50/70 to-emerald-50 border border-teal-100 p-5 rounded-3xl relative overflow-hidden">
            <button
              onClick={() => onBookmarkToggle(activePhrasal.en, activePhrasal.ko)}
              className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                isBookmarked 
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-500'
              }`}
            >
              <span>{isBookmarked ? '🌟 보관됨' : '📓 담아두기'}</span>
            </button>

            <div className="text-[10px] text-teal-600 font-black tracking-widest uppercase mb-1">Phrasal verb card</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{activePhrasal.en}</span>
              <button 
                onClick={() => speak(activePhrasal.en)}
                className="p-1 px-2.5 rounded-lg bg-white border border-teal-100 text-teal-600 flex items-center gap-1 text-[10.5px] font-bold"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>듣기</span>
              </button>
            </div>
            <div className="text-xs text-teal-700 font-bold mt-1">뜻: {activePhrasal.ko}</div>
            <div className="text-[11px] text-slate-500 leading-normal mt-3 bg-white/70 p-2.5 rounded-2xl border border-dashed border-teal-100">
              <b>결합적 의미:</b> {activePhrasal.definition}
            </div>
            <div className="mt-2 text-[10.5px] text-emerald-800 font-semibold bg-emerald-100/35 px-2.5 py-1.5 rounded-lg border border-emerald-100/30">
              📚 <b>상황 맥락:</b> {activePhrasal.context}
            </div>
          </div>

          {/* Sub stages list indicators */}
          <div className="flex items-center gap-2 pl-1 select-none">
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${subStage === 'speak' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>1. 경청 & 말하기</span>
            <span className="text-xs text-slate-300">→</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${subStage === 'puzzle' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2. 문장 조각 퍼즐</span>
            <span className="text-xs text-slate-300">→</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${subStage === 'composition' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>3. 대화 적용</span>
          </div>

          {/* STAGE CONTROLS */}

          {/* S1: SPEAK */}
          {subStage === 'speak' && (
            <div className="p-4.5 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <h4 className="text-xs font-black text-slate-700">🔉 1단계 미션: 소리내어 말하기</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                구동사의 뉘앙스 음성을 경청하고, 마이크에 대고 속삭이듯 3회 반복 훈련해 봅니다.
              </p>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <p className="text-sm font-extrabold text-slate-800 leading-relaxed font-sans">{activePhrasal.sentenceEn}</p>
                  <button 
                    onClick={() => speak(activePhrasal.sentenceEn)}
                    className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-[11px] text-slate-500">번역: {activePhrasal.sentenceKo}</div>
              </div>

              <div className="pt-2 flex flex-col items-center">
                <button
                  onClick={startSpeechRecording}
                  disabled={isRecording}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-rose-500 text-white animate-pulse shadow-md ring-4 ring-rose-200' 
                      : speakSuccess 
                      ? 'bg-green-100 text-green-600 border border-green-300' 
                      : 'bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200'
                  }`}
                >
                  <Mic className="w-6 h-6" />
                </button>
                <div className="text-[10px] font-black text-slate-400 mt-2">
                  {isRecording ? '목소리를 듣고 있어요... 🎙️' : speakSuccess ? '발음 체크 성공 ✓ (입술 풀림 완료)' : '탭하고 직접 말해보세요'}
                </div>

                {transcript && (
                  <div className="mt-2 text-[11px] bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg max-w-[85%] text-center font-medium">
                    🗣️ 인식된 구절: <span className="font-extrabold text-teal-600 font-sans">"{transcript}"</span>
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

          {/* S2: PUZZLE */}
          {subStage === 'puzzle' && (
            <div className="p-4.5 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-700">🧩 2단계 미션: 단어 어순 복습</h4>
                <button 
                  onClick={quickRevealPuzzle}
                  className="text-[10px] text-slate-400 hover:text-teal-600 underline"
                >
                  해답 바로 스킵
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                한글 문장의 뜻에 마비가 되지 않도록, 아래 단어 토큰 조각들을 정밀하게 맞추어 보세요.
              </p>

              <div className="p-3 bg-teal-50/50 border border-teal-100 text-[11.5px] text-teal-800 font-bold rounded-xl">
                한국어 뜻: {activePhrasal.sentenceKo}
              </div>

              {/* Created sentence screen */}
              <div className="p-3 bg-slate-50 rounded-2xl min-h-[50px] border border-slate-100 flex flex-wrap gap-2.5 items-center">
                {userAssembly.length === 0 ? (
                  <span className="text-[10px] text-slate-300 font-bold">터치한 토큰들이 가지런히 정렬됩니다.</span>
                ) : (
                  userAssembly.map((tok, idx) => (
                    <div
                      key={idx}
                      className="bg-teal-600 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-transform"
                    >
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveToken(idx, idx - 1); }}
                          className="p-0.5 hover:bg-teal-700 rounded text-teal-200 cursor-pointer active:scale-90"
                          title="왼쪽 이동"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      
                      <span 
                        className="cursor-pointer hover:underline px-1 select-none"
                        onClick={() => removePuzzleToken(tok, idx)}
                        title="클릭하여 복원"
                      >
                        {tok}
                      </span>

                      {idx < userAssembly.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveToken(idx, idx + 1); }}
                          className="p-0.5 hover:bg-teal-700 rounded text-teal-200 cursor-pointer active:scale-90"
                          title="오른쪽 이동"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removePuzzleToken(tok, idx)}
                        className="ml-1 p-0.5 hover:bg-teal-700 rounded text-teal-100 cursor-pointer"
                        title="제거"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Pool screen */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {puzzlePool.map((tok, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectPuzzleToken(tok, idx)}
                    className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    {tok}
                  </button>
                ))}
              </div>

              {userAssembly.length > 0 && (
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={checkAssembleAnswer}
                    className="bg-slate-800 text-white text-[11.5px] font-black px-4 py-2 rounded-xl"
                  >
                    배열 검증하기
                  </button>
                  {puzzleCorrect === true && <span className="text-xs font-black text-green-600">✓ 정밀 정렬 성공!</span>}
                  {puzzleCorrect === false && <span className="text-xs font-black text-rose-500">배열 불일치 ✕ 다시 해봐요</span>}
                </div>
              )}
            </div>
          )}

          {/* S3: COMPOSITION */}
          {subStage === 'composition' && (
            <div className="p-4.5 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <h4 className="text-xs font-black text-slate-700">✏️ 3단계 미션: 나만의 문장 말해보기</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                학습한 소중한 구동사 ♣ <b>"{activePhrasal.en}"</b>를 직접 주어로 삼아 간단한 일상 회화를 설계해 보세요.
              </p>

              <textarea
                value={userWritingInput}
                onChange={(e) => setUserWritingInput(e.target.value)}
                placeholder={`예: She had to check in early. 의 수준으로 짧게 입력하세요.`}
                className="w-full h-20 bg-stone-50 border border-slate-100 rounded-2xl p-3 text-xs font-bold font-sans outline-none focus:border-teal-400 resize-none"
              />

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setUserWritingInput(`I need to ${activePhrasal.en} now.`)}
                  className="text-[10px] text-slate-300 hover:text-teal-600"
                >
                  💡 템플릿 초안 자동 설계받기
                </button>
                <button
                  onClick={checkUserWriting}
                  disabled={!userWritingInput.trim()}
                  className={`px-4 py-2 text-[11px] rounded-xl font-black transition-all ${
                    userWritingInput.trim()
                      ? 'bg-slate-800 text-white hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  원예 검수 받기
                </button>
              </div>

              {writingFeedback && (
                <div className="p-3.5 bg-green-50 border border-green-100 rounded-2xl text-[11px] text-green-700 font-bold leading-relaxed">
                  {writingFeedback}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Navigation bottom toolbar */}
        <div className="pt-6">
          {progState[activeIdx] === 'completed' ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-center py-3 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                <span>오늘의 구동사 습득 완료! 🎉</span>
              </div>

              {areAllDone() && (
                <button
                  onClick={claimPhrasalReward}
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black py-4 rounded-3xl hover:from-teal-700 hover:to-emerald-700 transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                >
                  <span className="text-sm">오늘의 구동사 수확 및 보상 지급 🌾</span>
                  <span className="text-[9.5px] opacity-90 font-medium">💧 물뿌리개 +1  |  🧪 거름 영양제 +1  |  🏆 +20 EXP 획득</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={proceedSubstage}
              disabled={
                (subStage === 'speak' && !speakSuccess) ||
                (subStage === 'puzzle' && !puzzleCorrect) ||
                (subStage === 'composition' && !writingFeedback)
              }
              className={`w-full font-extrabold py-3.5 rounded-2xl transition-all flex justify-center items-center gap-1.5 shadow-md ${
                (subStage === 'speak' && !speakSuccess) ||
                (subStage === 'puzzle' && !puzzleCorrect) ||
                (subStage === 'composition' && !writingFeedback)
                  ? 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed border border-slate-200/40'
                  : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-500/10 cursor-pointer'
              }`}
            >
              <span>
                {subStage === 'speak' ? '말하기 완료 확인' : subStage === 'puzzle' ? '단어 조합 완료 확인' : '학습 완료하고 경험치 받기'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
