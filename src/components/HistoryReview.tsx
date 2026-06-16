import React, { useState } from 'react';
import { Mistake } from '../types';
import { RefreshCw, Trash2, CircleAlert, Volume2, Sparkles } from 'lucide-react';

interface HistoryReviewProps {
  mistakes: Mistake[];
  onClearMistakes: () => void;
}

export default function HistoryReview({ mistakes, onClearMistakes }: HistoryReviewProps) {
  const [filter, setFilter] = useState<'all' | 'tenses' | 'prepositions' | 'nativeAlt' | 'others'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  // Group mistakes into categories matching the report scheme
  const getMistakeCategory = (m: Mistake): 'tenses' | 'prepositions' | 'nativeAlt' | 'others' => {
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
  };

  const parsedTenses = mistakes.filter(m => getMistakeCategory(m) === 'tenses');
  const parsedPrepositions = mistakes.filter(m => getMistakeCategory(m) === 'prepositions');
  const parsedNativeAlt = mistakes.filter(m => getMistakeCategory(m) === 'nativeAlt');
  const parsedOthers = mistakes.filter(m => getMistakeCategory(m) === 'others');

  // Decide current items to show based on filter
  const getFilteredMistakes = () => {
    switch (filter) {
      case 'tenses': return parsedTenses;
      case 'prepositions': return parsedPrepositions;
      case 'nativeAlt': return parsedNativeAlt;
      case 'others': return parsedOthers;
      default: return mistakes;
    }
  };

  const filteredItems = getFilteredMistakes();

  return (
    <div className="w-full px-5 py-5 space-y-5 animate-fadeIn" id="historyPanel">
      {/* History Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-1.5">
            <span>📜 오답 및 정밀 치료 센터</span>
            <span className="text-[9px] bg-indigo-50 text-indigo-650 font-black px-2 py-0.5 rounded-full">자없프 처방</span>
          </h3>
          <p className="text-[10.5px] text-gray-400">말할 때 긴장하지 않도록, 나에게 맞춘 1:1 오류 극복 사전입니다.</p>
        </div>
        {mistakes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {showClearConfirm ? (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 rounded-lg p-1.5 px-2 animate-fadeIn">
                <span className="text-[10px] font-extrabold text-rose-700">전체 삭제할까요?</span>
                <button
                  onClick={() => {
                    onClearMistakes();
                    setShowClearConfirm(false);
                  }}
                  className="bg-rose-500 hover:bg-rose-600 text-white text-[9.5px] font-black px-2 py-1 rounded cursor-pointer transition-all"
                >
                  지우기
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="bg-slate-200 hover:bg-slate-350 text-slate-700 text-[9.5px] font-black px-2 py-1 rounded cursor-pointer transition-all"
                >
                  취소
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowClearConfirm(true)} 
                className="flex items-center gap-0.5 text-[10.5px] text-red-500 hover:text-red-650 font-bold cursor-pointer bg-red-50/50 border border-red-100/30 hover:border-red-100/80 px-2 py-1.5 rounded-lg active:scale-95 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>비우기</span>
              </button>
            )}
          </div>
        )}
      </div>

      {mistakes.length === 0 ? (
        <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 bg-gray-50/50 border border-dashed border-gray-200 rounded-3xl min-h-[300px]">
          <div className="w-14 h-14 bg-green-50 text-green-600 border border-green-100 rounded-full flex items-center justify-center text-2xl shadow-inner animate-pulse">
            🌱
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-slate-800">정정된 프리토크 실수가 아직 없어요!</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed px-5 max-w-[270px] mx-auto">
              1:1 안심 프리토크 방에서 파트너와 안심 마이크 대화를 시도하면 교정된 보충 문장들이 실시간 4가지 카테고리로 차곡차곡 쌓여요! 🗣️
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3.5 bg-yellow-50/60 border border-yellow-100 rounded-2xl flex items-start gap-2 text-[10.5px] text-yellow-850 leading-relaxed font-semibold">
            <CircleAlert className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <span>
              💡 <b>실수는 귀여운 거름입니다:</b> 이 교정 리포트는 채찍질이 아닌 성장 통로예요. 보강이 필요한 분야 버튼을 눌러 정밀하게 오답만 골라 복습해 보세요!
            </span>
          </div>

          {/* Interactive Bento categories filter */}
          <div className="grid grid-cols-5 gap-1.5 select-none pt-1">
            <button
              onClick={() => setFilter('all')}
              className={`p-2.5 rounded-xl text-center border text-[9.5px] font-black cursor-pointer transition-all ${
                filter === 'all' 
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                  : 'bg-stone-50 text-slate-500 border-slate-100 hover:bg-slate-100'
              }`}
            >
              <div>전체</div>
              <div className="font-extrabold text-[12px] mt-0.5">{mistakes.length}</div>
            </button>
            <button
              onClick={() => setFilter('tenses')}
              className={`p-2.5 rounded-xl text-center border text-[9.5px] font-black cursor-pointer transition-all ${
                filter === 'tenses' 
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm animate-fadeIn' 
                  : 'bg-rose-50/40 text-rose-700 border-rose-100/40 hover:bg-rose-100/50'
              }`}
            >
              <div>⏰ 시제/동사</div>
              <div className="font-extrabold text-[11px] mt-0.5">{parsedTenses.length}</div>
            </button>
            <button
              onClick={() => setFilter('prepositions')}
              className={`p-2.5 rounded-xl text-center border text-[9.5px] font-black cursor-pointer transition-all ${
                filter === 'prepositions' 
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm animate-fadeIn' 
                  : 'bg-amber-50/40 text-amber-700 border-amber-100/40 hover:bg-amber-100/50'
              }`}
            >
              <div>🏷 전치관사</div>
              <div className="font-extrabold text-[11px] mt-0.5">{parsedPrepositions.length}</div>
            </button>
            <button
              onClick={() => setFilter('nativeAlt')}
              className={`p-2.5 rounded-xl text-center border text-[9.5px] font-black cursor-pointer transition-all ${
                filter === 'nativeAlt' 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm animate-fadeIn' 
                  : 'bg-emerald-50/40 text-emerald-700 border-emerald-100/40 hover:bg-emerald-100/50'
              }`}
            >
              <div>🌱 네이티브</div>
              <div className="font-extrabold text-[11px] mt-0.5">{parsedNativeAlt.length}</div>
            </button>
            <button
              onClick={() => setFilter('others')}
              className={`p-2.5 rounded-xl text-center border text-[9.5px] font-black cursor-pointer transition-all ${
                filter === 'others' 
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm animate-fadeIn' 
                  : 'bg-indigo-50/40 text-indigo-750 border-indigo-100/40 hover:bg-indigo-100/50'
              }`}
            >
              <div>🧩 일반/어휘</div>
              <div className="font-extrabold text-[11px] mt-0.5">{parsedOthers.length}</div>
            </button>
          </div>

          {/* List display */}
          <div className="space-y-3.5 pt-2">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 font-medium bg-slate-50 border border-slate-100 rounded-3xl">
                선택한 카테고리에 누적된 실수가 없습니다. 👏 완벽해요!
              </div>
            ) : (
              filteredItems.map((mistake) => {
                // Determine theme color of each block to look unified
                const isTense = parsedTenses.includes(mistake);
                const isPrep = parsedPrepositions.includes(mistake);
                const isNative = parsedNativeAlt.includes(mistake);
                
                const cardBorder = isTense 
                  ? 'hover:border-rose-300 border-rose-100 bg-rose-50/20' 
                  : isPrep 
                  ? 'hover:border-amber-300 border-amber-100 bg-amber-50/25' 
                  : isNative 
                  ? 'hover:border-emerald-300 border-emerald-100 bg-emerald-50/20' 
                  : 'hover:border-indigo-300 border-indigo-100 bg-indigo-50/15';

                return (
                  <div 
                    key={mistake.id} 
                    className={`border rounded-2xl p-4.5 transition-all relative overflow-hidden shadow-xs ${cardBorder}`}
                  >
                    {/* Visual marker Category */}
                    <div className="absolute right-3.5 top-3.5">
                      <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded-md ${
                        isTense 
                          ? 'bg-rose-100 text-rose-700' 
                          : isPrep 
                          ? 'bg-amber-100 text-amber-800' 
                          : isNative 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {isTense ? '시제/동사' : isPrep ? '전치사/관사' : isNative ? '자연스러운 뉘앙스' : '구문/어휘'}
                      </span>
                    </div>

                    <div className="space-y-3 max-w-[85%]">
                      {/* Before / Awkward */}
                      <div>
                        <span className="text-[9px] text-red-500 bg-red-50 font-black px-1.5 py-0.5 rounded">어색한 표현 🛑</span>
                        <p className="text-xs font-bold text-red-500/90 leading-relaxed mt-2 pl-0.5">{mistake.before}</p>
                      </div>
                      
                      {/* After / Corrected */}
                      <div>
                        <span className="text-[9px] text-green-700 bg-green-50 font-black px-1.5 py-0.5 rounded">자연스러운 추천 🌱</span>
                        <div className="flex items-center gap-2 mt-2 pl-0.5">
                          <p className="text-sm font-black text-green-700 leading-relaxed">{mistake.after}</p>
                          <button 
                            onClick={() => speak(mistake.after)}
                            className="p-1 rounded-md bg-green-100/50 hover:bg-green-100 text-green-700 border border-green-250 cursor-pointer flex items-center justify-center transition-all active:scale-90"
                            title="원어민 발음 듣기"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Gentle explainer */}
                      {mistake.tip && (
                        <div className="bg-white border border-dashed border-slate-200 p-2.5 rounded-xl text-[10.5px] text-slate-500 leading-relaxed font-semibold">
                          💡 {mistake.tip}
                        </div>
                      )}
                    </div>

                    <div className="text-[8px] text-gray-400 font-mono mt-3 text-right">
                      {new Date(mistake.timestamp).toLocaleDateString()} 감약 복습 완료
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
