import React, { useState, useEffect } from 'react';
import { StudyExpr, UserPersona } from '../types';
import { OFFLINE_EXPRS } from '../data/learningFallbacks';
import { Volume2, CheckCircle2, Award, ArrowRight, Mic, Sparkles, Heart } from 'lucide-react';

interface StudyExprProps {
  persona: UserPersona;
  customExpr: StudyExpr | null;
  onRewardEarned: (water: number, fertilizer: number, exp: number) => void;
  onBookmarkToggle: (en: string, ko: string) => void;
  unknownExpressions: { en: string }[];
  onGoBack: () => void;
}

export default function StudyExprView({
  persona,
  customExpr,
  onRewardEarned,
  onBookmarkToggle,
  unknownExpressions,
  onGoBack
}: StudyExprProps) {
  
  const goalKey = persona.goal || '일상';
  const exprPool = OFFLINE_EXPRS[goalKey] || OFFLINE_EXPRS['일상'];
  
  // Choose 1 expression for today
  const [targetExprs, setTargetExprs] = useState<StudyExpr[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [progState, setProgState] = useState<Record<number, 'not_started' | 'completed'>>({});
  
  // Stages: 'contrast' | 'quiz' | 'composition'
  const [subStage, setSubStage] = useState<'contrast' | 'quiz' | 'composition'>('contrast');

  const [isRecording, setIsRecording] = useState(false);
  const [speakSuccess, setSpeakSuccess] = useState(false);

  // Quiz states
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null);

  // Composition states
  const [userWritingInput, setUserWritingInput] = useState('');
  const [writingFeedback, setWritingFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (customExpr) {
      setTargetExprs([customExpr]);
    } else {
      const idx = new Date().getDate() % exprPool.length;
      setTargetExprs([exprPool[idx]]);
    }
  }, [customExpr, goalKey]);

  const activeExpr = targetExprs[activeIdx];

  // Refresh solvers upon active item change
  useEffect(() => {
    if (!activeExpr) return;
    setSubStage('contrast');
    setSpeakSuccess(false);
    setIsRecording(false);
    setUserWritingInput('');
    setWritingFeedback(null);
    setQuizAnswered(false);
    setQuizCorrect(null);
  }, [activeIdx, targetExprs]);

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
          const target = parsedAfter.en || activeExpr.en;
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
            setSpeechError(`표현과의 발음 일치율이 약간 낮네요! (일치율: 약 ${Math.round(pct * 100)}%). 계속 더 말해보시거나 수동 완료 버튼을 눌러 정답처리 해주세요! 🌱`);
          }
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Expression study speech error:", event.error);
        if (event.error === 'not-allowed') {
          setSpeechError("마이크 윈도우 권한 차단됨 (아래 수동완료 버튼 이용 가능)");
        } else if (event.error === 'no-speech') {
          // Continuous can be quiet brief periods, keep recording
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

  const handleSelectQuiz = (pickedCorrect: boolean) => {
    setQuizAnswered(true);
    setQuizCorrect(pickedCorrect);
    if (pickedCorrect) {
      speak(activeExpr.en);
    }
  };

  const checkUserWriting = () => {
    if (!userWritingInput.trim()) return;
    const hasWord = userWritingInput.toLowerCase().includes(activeExpr.en.toLowerCase().replace(/[?,.!\-$%]/g, "").trim());
    
    let answerText = '';
    if (!hasWord && !userWritingInput.toLowerCase().includes("makes two")) {
      answerText = `💡 권장 표현 "${activeExpr.en}"을 활용해서 내 상황 속에 배치해야 보상이 주어집니다! 다시 엮어 보세요.`;
    } else {
      answerText = `🎉 매우 세련됐습니다! 어색하고 딱딱한 직역 투에서 벗어나 네이티브 식 뉘앙스를 온전히 체득하셨어요!`;
    }
    setWritingFeedback(answerText);
  };

  const proceedSubstage = () => {
    if (subStage === 'contrast') {
      setSubStage('quiz');
    } else if (subStage === 'quiz') {
      setSubStage('composition');
    } else if (subStage === 'composition') {
      const nextProg = { ...progState };
      nextProg[activeIdx] = 'completed';
      setProgState(nextProg);
    }
  };

  const areAllDone = () => {
    return targetExprs.length > 0 &&
           progState[0] === 'completed';
  };

  const claimExprReward = () => {
    onRewardEarned(1, 1, 20); // Water +1, Fertilizer +1, XP +20
    onGoBack();
  };

  if (targetExprs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400 text-xs">
        로딩 중...
      </div>
    );
  }

  const parts = activeExpr.alternative.split(' -> ');
  const beforeRaw = parts[0] || 'Stiff literal phrase';
  const afterRaw = parts[1] || 'Natural expression';

  const parseWithComment = (text: string) => {
    const idx = text.indexOf('(');
    if (idx !== -1) {
      return {
        en: text.slice(0, idx).trim(),
        ko: text.slice(idx).trim()
      };
    }
    return { en: text, ko: '' };
  };

  const parsedBefore = parseWithComment(beforeRaw);
  const parsedAfter = parseWithComment(afterRaw);

  const isBookmarked = unknownExpressions.some(it => it.en.toLowerCase() === activeExpr.en.toLowerCase());

  return (
    <div className="w-full flex flex-col justify-between min-h-full pb-8 px-5 py-4 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div>
          <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
            <span>💡 세련 추천 표현</span>
            <span className="text-[10px] bg-amber-100 text-amber-700 font-extrabold px-2 py-0.5 rounded-full">뉘앙스 조정</span>
          </h3>
          <p className="text-[11px] text-gray-400">교과서식 딱딱한 영어를 세련된(Natural) 구사 표현으로 체득해요.</p>
        </div>
        <button onClick={onGoBack} className="text-xs text-slate-400 hover:text-red-500 font-bold">나가기</button>
      </div>

      {/* Sleek single-item progress indicator */}
      <div className="bg-amber-100/55 border border-amber-200/40 rounded-2xl px-4 py-2.5 text-center text-amber-950 font-extrabold text-[11px] mb-4 flex items-center justify-center gap-1.5 shadow-xs">
        <span>✨ 오늘의 특급 가꾸기 표현:</span>
        <span className="font-mono bg-white px-2.5 py-0.5 rounded-lg text-orange-600 shadow-xs font-black">{activeExpr.en}</span>
      </div>

      {/* Content box */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-5">
            
          {/* Main Contrast Card */}
          <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/30 border border-amber-200 p-5 rounded-3xl relative overflow-hidden">
            <button
              onClick={() => onBookmarkToggle(activeExpr.en, activeExpr.ko)}
              className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                isBookmarked 
                  ? 'bg-amber-100 border-amber-300 text-amber-800' 
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-500'
              }`}
            >
              <span>{isBookmarked ? '🌟 보관됨' : '📓 담아두기'}</span>
            </button>

            <div className="text-[10px] text-amber-600 font-black tracking-widest uppercase mb-1">Contrast mapping card</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-800 tracking-tight">{activeExpr.en}</span>
              <button 
                onClick={() => speak(activeExpr.en)}
                className="p-1 px-2.5 rounded-lg bg-white border border-amber-200 text-amber-600 flex items-center gap-1 text-[10.5px] font-bold"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>듣기</span>
              </button>
            </div>
            <div className="text-xs text-amber-700 font-bold mt-1">뜻: {activeExpr.ko}</div>
            <div className="text-[11px] text-slate-500 leading-normal mt-3 bg-white/70 p-2.5 rounded-2xl border border-dashed border-amber-100">
              <b>상황 설명:</b> {activeExpr.situation}
            </div>
            <div className="mt-2 text-[10.5px] text-orange-850 font-semibold bg-orange-100/30 px-2.5 py-1 rounded-lg border border-orange-100/30">
              🌱 <b>올바른 뉘앙스 대비:</b> {activeExpr.alternative}
            </div>
          </div>

          {/* Sub stages indicators */}
          <div className="flex items-center gap-2 pl-1 select-none">
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${subStage === 'contrast' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>1. 뉘앙스 대비 연습</span>
            <span className="text-xs text-slate-300">→</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${subStage === 'quiz' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>2. 올바른 표현 매칭</span>
            <span className="text-xs text-slate-300">→</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${subStage === 'composition' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>3. 대화 에세이</span>
          </div>

          {/* INTERACTIVE SOLVERS */}

          {/* S1: CONTRAST / MOCK MICROPHONE SPEAK */}
          {subStage === 'contrast' && (
            <div className="p-4.5 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <h4 className="text-xs font-black text-slate-700">🔉 1단계 미션: 올바른 표현 소리내어 말하기</h4>
              <p className="text-[11px] text-slate-400 leading-normal font-medium">
                어색하고 단어 그대로 바꾼 <b>딱딱한 문장</b> 대신, 원어민들이 일상에서 정말 많이 쓰는 <b>자연스러운 추천 표현</b>을 소리 내어 직접 말해 봅니다.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-rose-50/40 p-3.5 border border-rose-100 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] bg-red-100 text-red-650 font-extrabold px-1.5 py-0.5 rounded">어려운 기계식 표현 ⚠️</span>
                    <div className="text-xs font-bold text-red-600 mt-2">{parsedBefore.en}</div>
                  </div>
                  {parsedBefore.ko && (
                    <div className="text-[10px] text-slate-500 font-semibold mt-1 leading-normal">
                      {parsedBefore.ko}
                    </div>
                  )}
                </div>
                <div className="bg-green-50/40 p-3.5 border border-green-100 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] bg-green-100 text-green-700 font-extrabold px-1.5 py-0.5 rounded">자연스러운 추천 🌱</span>
                    <div className="text-xs font-bold text-green-700 mt-2">{parsedAfter.en || activeExpr.en}</div>
                  </div>
                  {parsedAfter.ko && (
                    <div className="text-[10px] text-slate-500 font-semibold mt-1 leading-normal">
                      {parsedAfter.ko}
                    </div>
                  )}
                </div>
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
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200'
                  }`}
                >
                  <Mic className="w-6 h-6" />
                </button>
                <div className="text-[10px] font-black text-slate-400 mt-2">
                  {isRecording ? '목소리를 듣고 있어요... 🎙️' : speakSuccess ? '스피킹 연습 완료 ✓' : '탭하고 편안하게 영어로 읽어보세요'}
                </div>

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

          {/* S2: MATCHING SCENARIO QUIZ */}
          {subStage === 'quiz' && (
            <div className="p-4.5 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <h4 className="text-xs font-black text-slate-700">🧩 2단계 미션: 올바른 추천 표현 고르기</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                다음 상황 맥락이 생겼을 때, 어색함 없이 소통을 틀어 줄 네이티브의 올바른 구사는 무엇일끼요?
              </p>

              <div className="p-3 bg-amber-50/50 border border-amber-100 text-[11px] text-amber-800 font-bold rounded-xl leading-normal">
                💡 상황: "{activeExpr.situation}"
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  disabled={quizAnswered}
                  onClick={() => handleSelectQuiz(false)}
                  className={`w-full text-left p-3.5 border rounded-2xl transition-all cursor-pointer ${
                    quizAnswered && quizCorrect === false 
                      ? 'border-red-400 bg-red-50 text-red-700 font-extrabold animate-shake' 
                      : 'border-slate-100 bg-white hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-extrabold font-sans">{parsedBefore.en}</div>
                  <div className="text-[9.5px] text-slate-400 mt-1">상당히 서먹해질 수 있는 딱딱한 문투</div>
                </button>

                <button
                  disabled={quizAnswered}
                  onClick={() => handleSelectQuiz(true)}
                  className={`w-full text-left p-3.5 border rounded-2xl transition-all cursor-pointer ${
                    quizAnswered && quizCorrect === true 
                      ? 'border-green-500 bg-green-50 text-green-700 font-extrabold shadow-xs' 
                      : 'border-slate-100 bg-white hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-extrabold font-sans text-green-600">{activeExpr.en}</div>
                  <div className="text-[9.5px] text-slate-400 mt-1">친절하고 직관적인 네이티브 추천 문어</div>
                </button>
              </div>

              {quizAnswered && (
                <div className="pt-1.5 text-center text-[11px] font-bold">
                  {quizCorrect ? (
                    <span className="text-green-600">🎉 정답입니다! 원어민들이 즐겨 쓰는 생생한 뉘앙스를 마스터하셨어요!</span>
                  ) : (
                    <span className="text-rose-500">✕ 아쉬워요! 좀 더 따뜻하고 자연스러운 다른 영어 표현을 골라볼까요?</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* S3: WRITING */}
          {subStage === 'composition' && (
            <div className="p-4.5 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <h4 className="text-xs font-black text-slate-700">✏️ 3단계 미션: 나만의 표현 만들기</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                이 뉘앙스 가득한 영어 표현 <b>"{activeExpr.en}"</b>을 직접 일기나 대화 형식에 녹여 나만의 문장을 적어 보세요.
              </p>

              <textarea
                value={userWritingInput}
                onChange={(e) => setUserWritingInput(e.target.value)}
                placeholder={`예: I said, "${activeExpr.en}" to my friendly coworker. 의 수준으로 써보세요.`}
                className="w-full h-20 bg-stone-50 border border-slate-100 rounded-2xl p-3 text-xs font-bold font-sans outline-none focus:border-amber-400 resize-none"
              />

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setUserWritingInput(`Please remember: ${activeExpr.en}`)}
                  className="text-[10px] text-slate-300 hover:text-amber-600"
                >
                  💡 초안 가이드 얹어 받기
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
                  농원 검토 요청
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

        {/* Navigation Toolbar */}
        <div className="pt-6">
          {progState[activeIdx] === 'completed' ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-center py-3 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                <span>오늘의 표현 습득 성공! 🎉</span>
              </div>

              {areAllDone() && (
                <button
                  onClick={claimExprReward}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black py-4 rounded-3xl hover:from-amber-600 hover:to-orange-600 transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                >
                  <span className="text-sm">오늘의 추천 표현 수확 및 보상 지급 🌾</span>
                  <span className="text-[9.5px] opacity-90 font-medium font-sans">💧 물뿌리개 +1  |  🧪 거름 영양제 +1  |  🏆 +20 EXP 획득</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={proceedSubstage}
              disabled={
                (subStage === 'contrast' && !speakSuccess) ||
                (subStage === 'quiz' && !quizAnswered) ||
                (subStage === 'composition' && !writingFeedback)
              }
              className={`w-full font-extrabold py-3.5 rounded-2xl transition-all flex justify-center items-center gap-1.5 shadow-md ${
                (subStage === 'contrast' && !speakSuccess) ||
                (subStage === 'quiz' && !quizAnswered) ||
                (subStage === 'composition' && !writingFeedback)
                  ? 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed border border-slate-200/40'
                  : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/10 cursor-pointer'
              }`}
            >
              <span>
                {subStage === 'contrast' ? '소리 발음 완료 확인' : subStage === 'quiz' ? '상황별 퀴즈 정답 확인' : '학습 완료하고 경험치 쌓기'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
