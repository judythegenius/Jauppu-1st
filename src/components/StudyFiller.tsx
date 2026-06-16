import React, { useState } from 'react';
import { StudyFiller, UserPersona } from '../types';
import { OFFLINE_FILLERS } from '../data/learningFallbacks';
import { Volume2, Sparkles, Check, Play, Award, ArrowRight } from 'lucide-react';

interface StudyFillerProps {
  persona: UserPersona;
  customFiller: StudyFiller | null;
  onCompleteSession: (expGained: number) => void;
  onGoBack: () => void;
}

export default function StudyFillerView({ persona, customFiller, onCompleteSession, onGoBack }: StudyFillerProps) {
  // Select active filler from fallback pool or custom Gemini generated content.
  const activeFiller = customFiller || OFFLINE_FILLERS[new Date().getDate() % OFFLINE_FILLERS.length];

  const [step, setStep] = useState<'learn' | 'simulation' | 'finish'>('learn');
  const [selectedFillerId, setSelectedFillerId] = useState<string | null>(null);

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

  const handleComplete = () => {
    onCompleteSession(15); // Filler grants +15 EXP
    setStep('finish');
  };

  return (
    <div className="w-full flex flex-col justify-between min-h-full pb-8 px-5 py-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div>
          <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-1.5">
            <span>💬 Filler Word</span>
            <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">대화 윤활유</span>
          </h3>
          <p className="text-[11px] text-gray-400">버퍼링을 채우는 원어민들의 비밀 무기</p>
        </div>
        <button onClick={onGoBack} className="text-xs text-gray-400 hover:text-gray-500 font-medium cursor-pointer">나가기</button>
      </div>

      {step === 'learn' && (
        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-5">
            {/* Filler Info Card */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100/60 rounded-3xl p-6 relative overflow-hidden shadow-sm animate-pulse-once">
              <span className="absolute right-4 top-4 text-xs font-mono text-red-400 font-bold tracking-wider">NATURAL FILLER</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-red-600 tracking-tight">"{activeFiller.en}"</span>
                <button 
                  onClick={() => speak(activeFiller.en)}
                  className="p-1 px-2.5 rounded-lg bg-white/80 hover:bg-white text-red-500 border border-red-100 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">듣기</span>
                </button>
              </div>
              <div className="text-xs font-bold text-gray-400 mt-2">한국어 번역 느낌: {activeFiller.ko}</div>
            </div>

            {/* Why use this card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-red-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-red-500 animate-spin" />
                <span>언제 말하면 되나요? (자없프 핵심 회복)</span>
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                {activeFiller.usage}
              </p>
              <p className="text-[11px] text-gray-400 leading-normal bg-red-50/20 p-2.5 rounded-xl border border-dashed border-red-100">
                ⚠️ 다음 단어가 도무지 기억 안 나 숨이 멎을 것 같을 때, <b>"Umm..."</b> 하지 마시고 <b>"{activeFiller.en}"</b>를 천천히 발음하며 3초 시간을 버세요!
              </p>
            </div>

            {/* Conversation Example */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400">대화 가상 연습</span>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-gray-800 leading-relaxed font-sans">{activeFiller.sentenceEn}</p>
                  <button 
                    onClick={() => speak(activeFiller.sentenceEn)}
                    className="p-1.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-100 text-gray-400 cursor-pointer flex-shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">{activeFiller.sentenceKo}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('simulation')}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-500/10 mt-6"
          >
            <span>침묵 탈출 침착 훈련!</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 'simulation' && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="text-center mb-6">
              <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Freeze-Escape Training</span>
              <h4 className="text-base font-bold text-gray-800 mt-2.5 leading-snug">
                원어민 질문 도중 말문이 턱 막혔습니다.<br />
                침묵을 수습하고 3초 생각 시간을 벌어줄 말은?
              </h4>
              <div className="bg-gray-50 border border-dashed border-gray-200 mt-4 p-4 rounded-xl text-center">
                <span className="text-xs text-gray-400 font-bold">원어민: "Why do you think English is so hard for you?"</span>
                <p className="text-sm font-black text-gray-800 font-sans mt-2">
                  "Oh... <span className="text-red-500 bg-red-50 px-3 py-1 rounded-lg border border-red-200 animate-pulse font-mono font-bold"> [ ❓ ] </span>, I think grammar rules confuse me a lot."
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { id: 'f_err1', text: 'Umm... (그냥 길게 어물거리기)', correct: false, desc: '주저하고 있는 당황스러운 기운이 온전히 상대에게 전해져 긴장 수치가 올라가요.' },
                { id: 'f_ok', text: `${activeFiller.en} (자연스레 화제를 실마리로 채워가기)`, correct: true, desc: '대화가 차분히 연결되어 원어민은 당신이 골똘히 생각하고 있다는 것을 눈치채고 기다려 줍니다!' },
                { id: 'f_err2', text: 'Shut up (갑자기 침묵시키기)', correct: false, desc: '동문서답의 위태로운 조립입니다.' }
              ].map((choice) => {
                const isSelected = selectedFillerId === choice.id;
                let cardStyle = 'border-gray-100 bg-white';
                if (isSelected) {
                  cardStyle = choice.correct 
                    ? 'border-green-500 bg-green-50/50 text-green-700' 
                    : 'border-red-300 bg-red-50/50 text-red-700';
                }

                return (
                  <button
                    key={choice.id}
                    disabled={selectedFillerId !== null}
                    onClick={() => {
                      setSelectedFillerId(choice.id);
                      if (choice.correct) speak(activeFiller.en);
                    }}
                    className={`w-full text-left p-4 border rounded-2xl transition-all cursor-pointer flex flex-col gap-1.5 ${cardStyle}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{choice.text}</span>
                      {isSelected && choice.correct && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                    {isSelected && (
                      <p className="text-[10px] leading-relaxed text-gray-400 font-medium">
                        {choice.desc}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            disabled={selectedFillerId === null}
            onClick={handleComplete}
            className={`w-full font-extrabold py-3.5 rounded-2xl transition-all shadow-md mt-6 flex justify-center items-center gap-1.5 ${
              selectedFillerId === null 
                ? 'bg-gray-100 text-gray-300 shadow-none cursor-not-allowed' 
                : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/10 cursor-pointer'
            }`}
          >
            대화 훈련 완료하기 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 'finish' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 animate-bounce">
            <Award className="w-9 h-9 text-white" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-800">Filler Word 마스터! 🌱</h4>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              영어 울렁증을 산뜻하게 걷어내는<br />
              필러 <b>"{activeFiller.en}"</b>의 쓰임새를 체득하셨어요.
            </p>
          </div>
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl w-full flex justify-around items-center divide-x divide-red-100">
            <div>
              <div className="text-[10px] text-red-500 font-bold">농장 거름 획득</div>
              <div className="font-black text-red-600 text-lg mt-0.5">+15 EXP</div>
            </div>
            <div className="pl-6">
              <div className="text-[10px] text-gray-400 font-bold">나의 회복도</div>
              <div className="font-black text-gray-700 text-sm mt-0.5">자라나는 새싹</div>
            </div>
          </div>
          <button
            onClick={onGoBack}
            className="w-full bg-gray-800 text-white font-extrabold py-3.5 rounded-2xl hover:bg-gray-900 transition-all cursor-pointer shadow-sm shadow-black/10 mt-6"
          >
            농장으로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}
