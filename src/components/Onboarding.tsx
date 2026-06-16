import React, { useState } from 'react';
import { UserPersona } from '../types';
import { Sparkles, ArrowRight, ChevronLeft, Calendar } from 'lucide-react';

interface OnboardingProps {
  onComplete: (persona: UserPersona) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState('');
  const [speaking, setSpeaking] = useState('');
  const [trauma, setTrauma] = useState<string[]>([]);
  const [mbtiRaw, setMbtiRaw] = useState('');
  
  // Consolidated Goal settings
  const [purpose, setPurpose] = useState<'여행' | '직장·이직' | '시험' | '콘텐츠' | '일상'>('일상');
  const [goalType, setGoalType] = useState<string>('');
  const [goalDetail, setGoalDetail] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [gradDate, setGradDate] = useState<string>('');

  const calculateMbtiGroup = (mbtiString: string): 'NF' | 'NT' | 'SJ' | 'SP' | 'default' => {
    const chars = mbtiString.toUpperCase();
    if (chars.includes('N') && chars.includes('F')) return 'NF';
    if (chars.includes('N') && chars.includes('T')) return 'NT';
    if (chars.includes('S') && chars.includes('J')) return 'SJ';
    if (chars.includes('S') && chars.includes('P')) return 'SP';
    return 'NF'; // default comforting team
  };

  const handleToggleTrauma = (option: string) => {
    if (option === '특별히 없어요 (다행이에요!)') {
      setTrauma([option]);
      return;
    }
    const filtered = trauma.filter(t => t !== '특별히 없어요 (다행이에요!)');
    if (filtered.includes(option)) {
      setTrauma(filtered.filter(t => t !== option));
    } else {
      setTrauma([...filtered, option]);
    }
  };

  const handleGoalChange = (val: string) => {
    setGoalType(val);
    setGoalDetail('');
    
    // Map selected sub-goals to primary goals
    if (val === '여행') setPurpose('여행');
    else if (val === '스몰토크' || val === '인터뷰') setPurpose('직장·이직');
    else if (val === '넷플릭스') setPurpose('콘텐츠');
    else if (val === '시험') setPurpose('시험');
    else setPurpose('일상');
  };

  const handleDurationChange = (val: string) => {
    setDuration(val);
    if (val) {
      const months = val === 'custom' ? 1 : parseInt(val);
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      setGradDate(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`);
    } else {
      setGradDate('');
    }
  };

  const autoNext = (delay = 200) => {
    setTimeout(() => {
      setStep(prev => Math.min(prev + 1, 6));
    }, delay);
  };

  const isStepValid = () => {
    if (step === 1) return nickname.trim().length > 0;
    if (step === 2) return speaking.length > 0;
    if (step === 3) return trauma.length > 0;
    if (step === 4) return purpose.length > 0;
    if (step === 5) return true; // MBTI is skippable/optional
    if (step === 6) {
      if (!goalType || !duration) return false;
      if ((goalType === '시험' || goalType === '직접') && !goalDetail) return false;
      return true;
    }
    return false;
  };

  const handleNext = () => {
    if (!isStepValid()) return;
    
    if (step < 6) {
      setStep(step + 1);
    } else {
      // Completed Onboarding
      const finalMbti = mbtiRaw.toUpperCase().trim() || 'INFP';
      const mbtiGroup = calculateMbtiGroup(finalMbti);
      
      // Determine computed level from speaking
      let computedLevel = 2;
      let listeningLevelText = '상대가 천천히 또박또박 말해주면 이해해요';
      if (speaking.includes('알파벳만')) {
        computedLevel = 1;
        listeningLevelText = '알파벳 소리만 나요 (거의 웅얼웅얼 들림)';
      } else if (speaking.includes('단어는 아는데')) {
        computedLevel = 2;
        listeningLevelText = '핵심 단어들은 골라져요 (문장은 흩어짐)';
      } else if (speaking.includes('얼어버려요')) {
        computedLevel = 2;
        listeningLevelText = '상대가 아주 천천히 또박또박 말해주면 이해해요';
      } else if (speaking.includes('문법이 엉망')) {
        computedLevel = 3;
        listeningLevelText = '대충 흐름은 느껴지는데 세세한 뉘앙스만 놓쳐요';
      } else if (speaking.includes('읽기·듣기는 되는데')) {
        computedLevel = 4;
        listeningLevelText = '유튜브나 직관 회화 등 리스닝에는 강해요';
      } else if (speaking.includes('뉘앙스')) {
        computedLevel = 5;
        listeningLevelText = '스피킹 및 리스닝 양쪽 모두 대단히 훌륭한 속도 완충 단계';
      }

      // Auto-derive Job based on English Goal Focus (Request #2 streamlining)
      let derivedJob = '기타';
      if (purpose === '직장·이직') {
        derivedJob = '직장인';
      } else if (purpose === '시험') {
        derivedJob = '취준생';
      } else if (purpose === '콘텐츠') {
        derivedJob = '프리랜서·자영업';
      } else if (purpose === '여행') {
        derivedJob = '주부';
      }

      // Auto-derive subjects with Sam (Request #2 streamlining)
      let derivedSubjects = ['일상·취미'];
      if (purpose === '여행') {
        derivedSubjects = ['여행 이야기'];
      } else if (purpose === '직장·이직') {
        derivedSubjects = ['직장·비즈니스'];
      } else if (purpose === '콘텐츠') {
        derivedSubjects = ['문화·미드·콘텐츠'];
      } else if (purpose === '시험') {
        derivedSubjects = ['시사·뉴스 상식'];
      }

      const newUserPersona: UserPersona = {
        nickname: nickname.trim(),
        mbti: finalMbti,
        mbtiGroup,
        goal: purpose,
        trauma: trauma.length > 0 ? trauma : ['특별히 없어요'],
        time: "하루 20분 (정석 습득)",
        level: computedLevel,
        onboardingComplete: true,
        onboardingDate: new Date().toISOString().slice(0, 10),
        
        // Auto-derived / Simplified custom fields to prevent breaks
        job: derivedJob,
        age: '20대 후반',
        period: '최근 1~2년 동안 가끔 시도했어요',
        listening: listeningLevelText,
        subjects: derivedSubjects,
        duration,
        gradDate
      };
      
      onComplete(newUserPersona);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="w-full flex flex-col justify-between min-h-[90vh] px-5 py-6">
      
      {/* Top Header & Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handleBack} 
            disabled={step === 1}
            className={`p-1.5 rounded-xl border border-gray-100 ${step === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-xs font-extrabold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            STEP {step} / 6
          </span>
          <button 
            onClick={() => { setMbtiRaw(''); handleNext(); }}
            className={`text-xs text-gray-400 font-bold hover:text-gray-600 ${step === 5 ? 'visible' : 'invisible'}`}
          >
            건너뛰기
          </button>
        </div>

        {/* Progress Fill */}
        <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden mb-6">
          <div 
            className="bg-gradient-to-r from-orange-400 to-amber-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 6) * 100}%` }}
          ></div>
        </div>

        {/* Core Quiz Screen */}
        <div className="space-y-4">
          
          {/* STEP 1: Nickname */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <span className="text-4xl">👋</span>
              <h2 className="text-xl font-black text-slate-800 leading-snug">
                자없프 농장의 주민이 되신 것을 환영해요!<br />농장에서 불릴 닉네임을 알려주시겠어요?
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                <b>자없프</b>는 <b>“자신은 없지만 프리토크는 하고싶어”</b>의 줄임말이에요. 틀린 영어 문장을 내뱉어도 100% 안전하고 상처받지 않는 가상의 비공개 정원입니다. 농장에서 귀엽게 불릴 이름이나 영어 이름을 자유롭게 적어 보세요! 🌱
              </p>
              <div className="relative pt-2">
                <input
                  type="text"
                  maxLength={12}
                  placeholder="예: 초록새싹, 제이, 말하는당근"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full border-b-2 border-orange-200 focus:border-orange-500 py-3 text-base font-bold text-slate-800 placeholder-slate-300 outline-none transition-all"
                />
                <span className="absolute right-0 bottom-3 text-[10px] text-gray-400 font-mono font-bold">
                  {nickname.length}/12
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Speaking Level */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <span className="text-4xl">🗣️</span>
              <h2 className="text-xl font-black text-slate-800">영어로 실제로 말할 때<br />내 안은 어떤 풍경인가요?</h2>
              <p className="text-xs text-slate-400">당신에게 필요한 데일리 단어 장벽과 울렁증 방지 힐링 에센스를 설계하는 기준입니다.</p>
              <div className="flex flex-col gap-2 pt-2">
                {[
                  { t: '알파벳과 눈싸움 중 (문장 조립이 안 됨)', e: '😰' },
                  { t: '단어 단어 끊어 말함 (예: I... Apple... Want...)', e: '😅' },
                  { t: '외국인 앞에만 서면 머리가 하얗게 얼어붙음', e: '🙂' },
                  { t: '문장을 만드는데 문법 구조가 매번 엉망진창', e: '😌' },
                  { t: '읽기와 듣기는 되는데 오직 말하는 입술만 떨림', e: '😎' },
                  { t: '내 느낌을 단어 뉘앙스 포함해서 길게 뻗음 가능', e: '🔥' }
                ].map((item) => (
                  <button
                    key={item.t}
                    onClick={() => { setSpeaking(item.t); autoNext(); }}
                    className={`p-3.5 border text-left rounded-2xl transition-all flex items-center gap-3 ${
                      speaking === item.t 
                        ? 'border-orange-500 bg-orange-50/50' 
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <span className="text-xl">{item.e}</span>
                    <span className="font-bold text-[11.5px] text-slate-800 leading-normal">{item.t}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: English Trauma / Scars */}
          {step === 3 && (
            <div className="space-y-3 animate-fadeIn">
              <span className="text-4xl">💔</span>
              <h2 className="text-xl font-black text-slate-800">영어 때문에 마음의 상처를<br />입은 흔적이 있나요?</h2>
              <p className="text-xs text-slate-400">교사로부터의 혹평, 창피함 등 상처 유형에 따라 피드백을 극도로 친절하게 조절합니다.</p>
              <p className="text-[10px] text-orange-500 font-extrabold tracking-wider bg-orange-50 py-1.5 px-3 rounded-lg">동시 다중 탭 선택 가꾸기가 가능합니다.</p>
              <div className="flex flex-col gap-2 pt-1.5">
                {[
                  { t: '과거 시험 스피킹에서 크게 주눅 들어 트라우마', e: '😭' },
                  { t: '외국인 앞에서 완전히 얼어붙어 억울했던 기억', e: '😨' },
                  { t: '나더러 못 알아듣는 표정을 지어 무척 속상했음', e: '😓' },
                  { t: '완벽한 문법이 아님을 상대가 비웃을 것 같이 불안', e: '😰' },
                  { t: '특별히 없어요 (다행이에요!)', e: '🙂' }
                ].map((option) => {
                  const isSelected = trauma.includes(option.t);
                  return (
                    <button
                      key={option.t}
                      onClick={() => handleToggleTrauma(option.t)}
                      className={`w-full text-left p-3.5 border rounded-xl text-xs transition-all leading-relaxed flex items-center justify-between ${
                        isSelected 
                          ? 'border-red-400 bg-rose-50/40 text-rose-700 font-bold' 
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{option.e}</span>
                        <span>{option.t}</span>
                      </div>
                      <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border text-[9px] ${
                        isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-slate-200 bg-white text-transparent'
                      }`}>✓</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Focus Purpose (Consolidated) */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <span className="text-4xl">🎯</span>
              <h2 className="text-xl font-black text-slate-800">가장 영어로 말하고 싶은 목적은?</h2>
              <p className="text-xs text-slate-400">대화 목적에 맞춘 전용 1:1 대화 주제와 추천 표현들이 자동으로 설정됩니다.</p>
              <div className="flex flex-col gap-2 pt-2">
                {[
                  { name: '여행', icon: '✈️', desc: '해외 여행 및 입국 심사, 주문, 길 찾기 등', val: '여행' },
                  { name: '직장·이직', icon: '💼', desc: '비즈니스 협상, 메일링, 이직 면접 인터뷰 준비', val: '직장·이직' },
                  { name: '시험', icon: '📝', desc: '오픽(OPIc) 및 토익 스피킹 등 실전 점수 취득', val: '시험' },
                  { name: '콘텐츠', icon: '🎬', desc: '자막 없는 미드, 유튜브 라이브, 영화 즐기기', val: '콘텐츠' },
                  { name: '일상 회화', icon: '💬', desc: '편안한 일상의 사담, 잡담, 스몰토크 회화 가꾸기', val: '일상' }
                ].map((g) => (
                  <button
                    key={g.name}
                    onClick={() => { setPurpose(g.val as any); autoNext(); }}
                    className={`w-full flex items-center gap-4 p-4 border rounded-2xl text-left transition-all ${
                      purpose === g.val 
                        ? 'border-orange-500 bg-orange-50/50 shadow-xs' 
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <span className="text-3xl">{g.icon}</span>
                    <div>
                      <div className={`font-bold text-xs ${purpose === g.val ? 'text-orange-600' : 'text-slate-800'}`}>
                        {g.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{g.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: MBTI */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <span className="text-4xl">🧠</span>
              <h2 className="text-xl font-black text-slate-800">당신의 성격 기제 (MBTI)는?</h2>
              <p className="text-xs text-slate-400">교정 시 상처받지 않게 따뜻하게 꼬옥 감싸안아 공감을 띄울지 (F형), 명쾌하게 문제 해결만 제시할지 (T형) 등의 감정 조율이 진행됩니다.</p>
              <div className="relative pt-3">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="예: ENFP, ISTJ (선택 사항)"
                  value={mbtiRaw}
                  onChange={(e) => setMbtiRaw(e.target.value.toUpperCase())}
                  className="w-full border-b-2 border-orange-200 focus:border-orange-500 py-3 text-lg font-bold text-slate-800 placeholder-slate-300 outline-none uppercase tracking-widest text-center"
                />
              </div>
              <p className="text-[10px] text-center text-slate-400">잘 모르시면 빈칸으로 가셔도 완벽한 맞춤형 케어가 보장됩니다 🥰</p>
            </div>
          )}

          {/* STEP 6: Goal & Duration Planning */}
          {step === 6 && (
            <div className="space-y-3 animate-fadeIn">
              <span className="text-4xl">🏆</span>
              <h2 className="text-xl font-black text-slate-800">목표 계획과 기간을 세워봐요</h2>
              <p className="text-xs text-slate-400">도전 목표와 기간을 입력하면 나의 성향 카드와 맞춤 졸업장이 정원 성장에 정밀 반영됩니다.</p>
              
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 pl-1">1. 실전 배움 목표 구체화</label>
                  <select 
                    value={goalType} 
                    onChange={(e) => handleGoalChange(e.target.value)}
                    className="w-full border border-slate-100 rounded-xl p-3 text-xs bg-white focus:border-orange-500 font-bold text-slate-700 outline-none"
                  >
                    <option value="">🎯 달성할 목표를 선택해 주세요</option>
                    <option value="여행">🌍 여행에서 혼자 가뿐하게 주문하고 길 찾기</option>
                    <option value="스몰토크">🤝 외국인 직장 동료와 어색함 없이 스몰토크</option>
                    <option value="넷플릭스">🎬 넷플릭스 영화/미드 실전 자막 떼기</option>
                    <option value="시험">📝 오픽(OPIc) / 토스 단기 스피킹 등급 취득</option>
                    <option value="인터뷰">🗣️ 영어 면접 꼬리 질문 부드럽게 방어하기</option>
                    <option value="직접">✏️ 나만의 목표를 직접 입력하여 가꾸기</option>
                  </select>
                </div>

                {goalType === '시험' && (
                  <div className="animate-fadeIn">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 pl-1">희망 공인 목표 가이드</label>
                    <select 
                      value={goalDetail} 
                      onChange={(e) => setGoalDetail(e.target.value)}
                      className="w-full border border-slate-100 rounded-xl p-3 text-xs bg-white focus:border-orange-500 font-semibold text-slate-700 outline-none"
                    >
                      <option value="">시험 목표 등급 선택</option>
                      <option value="토스 IM">토익스피킹 Intermediate Mid</option>
                      <option value="토스 AL">토익스피킹 Advanced Low</option>
                      <option value="OPIc IM">OPIc Intermediate Mid</option>
                      <option value="OPIc IH">OPIc Intermediate High</option>
                    </select>
                  </div>
                )}

                {goalType === '직접' && (
                  <div className="animate-fadeIn">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 pl-1">목표 직접 서술</label>
                    <input 
                      type="text" 
                      placeholder="예: 팝송 가사 완벽히 알아듣기, 전화 영어 버티기"
                      value={goalDetail}
                      onChange={(e) => setGoalDetail(e.target.value)}
                      className="w-full border border-slate-100 rounded-xl p-3 text-xs focus:border-orange-500 font-bold text-slate-700 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 pl-1">2. 수강 및 회복 계획 도전 기간</label>
                  <select 
                    value={duration} 
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="w-full border border-slate-100 rounded-xl p-3 text-xs bg-white focus:border-orange-500 font-bold text-slate-700 outline-none"
                  >
                    <option value="">🗓️ 희망 도전 기간 설정</option>
                    <option value="1">1개월 단기 집중 완성 (30일 • 5회 수확)</option>
                    <option value="2">2개월 기틀 세우기 (60일 • 10회 수확)</option>
                    <option value="3">3개월 완벽한 정원 완성 (90일 • 15회 수확)</option>
                    <option value="6">6개월 유창한 고지 마스터 (180일 • 30회 수확)</option>
                    <option value="custom">집중 교정 스쿨 (15일 단기 완성 • 3회 수확)</option>
                  </select>
                </div>

                {gradDate && (
                  <div className="p-3 bg-orange-50/70 border border-orange-100 rounded-xl flex items-center gap-2 text-xs text-orange-600 font-bold animate-fadeIn">
                    <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span>🎓 예상 목표 달성 및 졸업일: {gradDate}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Button controls */}
      <div className="mt-8">
        <button
          onClick={handleNext}
          disabled={!isStepValid()}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-md ${
            isStepValid() 
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white cursor-pointer active:scale-98 shadow-orange-500/10' 
              : 'bg-stone-100 text-stone-300 cursor-not-allowed shadow-none'
          }`}
        >
          <span>{step === 6 ? '자없프 영어 정원 개설하기 ✨' : '다음 단계로 가기'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
