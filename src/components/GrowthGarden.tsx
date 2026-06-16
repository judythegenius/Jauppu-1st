import React, { useState, useEffect } from 'react';
import { UserPersona } from '../types';
import { Award, Sparkles, Droplet, Music, Compass, ShoppingBag, Flame, Trash2 } from 'lucide-react';

interface GrowthGardenProps {
  persona: UserPersona;
  totalSessions: number;
  gardenWater: number;
  setGardenWater: React.Dispatch<React.SetStateAction<number>>;
  gardenFertilizer: number;
  setGardenFertilizer: React.Dispatch<React.SetStateAction<number>>;
}

interface CropPlot {
  id: number;
  name: string;
  type: 'carrot' | 'strawberry' | 'sunflower';
  stage: number; // 0: 씨앗(Seed) -> 1: 새싹(Sprout) -> 2: 꽃봉오리(Bud) -> 3: 개화(Bloomed) -> 4: 결실/수확대기(Ripe - Harvest Ready!)
  waterApplied: number;
  waterNeeded: number;
  fertilizerApplied: number;
  fertilizerNeeded: number;
}

const QUOTES = [
  { en: "Mistakes are proof that you are trying.", ko: "실수는 당신이 도전을 멈추지 않고 노력하고 있다는 가장 아름다운 증거입니다. 💖" },
  { en: "Speak to express, not to impress.", ko: "타인을 평가하려 골머리 앓지 말고, 내 솔직한 감정대로 시원하게 대화해요. ✨" },
  { en: "Done is better than perfect.", ko: "침묵 속에 완벽하기보단, 투박해도 소통하는 영어 한 마디가 천 배쯤 낫습니다. 🚀" },
  { en: "Every drop of water makes the river.", ko: "단어 세 개, 구동사 한 줌이 모여 거침없는 네이티브 회복의 강을 이룹니다. 🌱" },
  { en: "A different language is a different vision of life.", ko: "낯선 말을 가꿀 때마다, 세상을 바라보는 새로운 비석 하나가 내 심장에 심깁니다. 🌻" }
];

export default function GrowthGarden({
  persona,
  totalSessions,
  gardenWater,
  setGardenWater,
  gardenFertilizer,
  setGardenFertilizer
}: GrowthGardenProps) {
  
  // 3 independent crop pots configuration
  const [plots, setPlots] = useState<CropPlot[]>([]);
  const [harvestStorage, setHarvestStorage] = useState<Record<string, number>>({ carrot: 0, strawberry: 0, sunflower: 0 });
  const [activeQuote, setActiveQuote] = useState<{ en: string; ko: string } | null>(null);
  const [wigglePlotId, setWigglePlotId] = useState<number | null>(null);
  const [actionAlert, setActionAlert] = useState<string | null>(null);
  const [showGradModal, setShowGradModal] = useState<boolean>(false);
  const getGraduationGoals = (duration?: string) => {
    const d = duration || "1";
    if (d === "1") return { stamps: 30, harvests: 5, label: "1개월 단기 집중 완성 (30일)" };
    if (d === "2") return { stamps: 60, harvests: 10, label: "2개월 기틀 세우기 (60일)" };
    if (d === "3") return { stamps: 90, harvests: 15, label: "3개월 완벽한 정원 완성 (90일)" };
    if (d === "6") return { stamps: 180, harvests: 30, label: "6개월 유창한 고지 마스터 (180일)" };
    if (d === "custom") return { stamps: 15, harvests: 3, label: "집중 교정 스쿨 (15일)" };
    return { stamps: 30, harvests: 5, label: "1개월 단기 집중 완성 (30일)" };
  };

  const goals = getGraduationGoals(persona?.duration);
  const goalHarvests = goals.harvests;
  const goalStamps = goals.stamps;

  const handleGraduationReset = () => {
    setShowGradModal(false);
    // Keep materials (water & fert), but reset plots and harvest storage cabinet
    const resetPlots = getInitialPlots();
    savePlots(resetPlots);
    const resetHarvest = { carrot: 0, strawberry: 0, sunflower: 0 };
    saveHarvest(resetHarvest);
    setActionAlert("🎓 졸업 수료 완료! 정원 슬롯이 깔끔하게 비워졌으며 새로운 씨앗들이 무사히 심겼습니다! 다시 힘차게 가꿔봐요. 🌱");
  };

  // Load pots from localStorage or initialize
  useEffect(() => {
    const cachedPlots = localStorage.getItem('gardenPlots_v2');
    if (cachedPlots) {
      try {
        setPlots(JSON.parse(cachedPlots));
      } catch (e) {
        setPlots(getInitialPlots());
      }
    } else {
      setPlots(getInitialPlots());
    }

    const cachedHarvest = localStorage.getItem('harvestStorage_v2');
    if (cachedHarvest) {
      try {
        setHarvestStorage(JSON.parse(cachedHarvest));
      } catch (e) {}
    }
  }, []);

  // Save changes
  const savePlots = (updated: CropPlot[]) => {
    setPlots(updated);
    localStorage.setItem('gardenPlots_v2', JSON.stringify(updated));
  };

  const saveHarvest = (updated: Record<string, number>) => {
    setHarvestStorage(updated);
    localStorage.setItem('harvestStorage_v2', JSON.stringify(updated));
  };

  const getInitialPlots = (): CropPlot[] => [
    { id: 1, name: '토끼 홍당무 🥕', type: 'carrot', stage: 1, waterApplied: 1, waterNeeded: 3, fertilizerApplied: 0, fertilizerNeeded: 2 },
    { id: 2, name: '수줍은 딸기 🍓', type: 'strawberry', stage: 0, waterApplied: 0, waterNeeded: 4, fertilizerApplied: 0, fertilizerNeeded: 2 },
    { id: 3, name: '태양 해바라기 🌻', type: 'sunflower', stage: 2, waterApplied: 2, waterNeeded: 5, fertilizerApplied: 1, fertilizerNeeded: 3 },
  ];

  // Get active emoji based on current stage and crop type
  const getCropEmoji = (plot: CropPlot) => {
    if (plot.stage === 0) return '🌰'; // Seed common
    if (plot.stage === 1) return '🌱'; // Sprout common
    if (plot.stage === 2) return '🌿'; // Plant Bud common
    
    // Stage 3: Blooming/Unripe leaf
    if (plot.stage === 3) {
      if (plot.type === 'carrot') return '🥬'; // green top
      if (plot.type === 'strawberry') return '🌸'; // flower
      if (plot.type === 'sunflower') return '🪴'; // yellow bud
    }

    // Stage 4: Harvest Ready!
    if (plot.type === 'carrot') return '🥕';
    if (plot.type === 'strawberry') return '🍓';
    return '🌻';
  };

  const getStageLabel = (stage: number) => {
    return ['씨앗 단계 🌰', '아기 새싹 🌱', '줄기 쑥쑥 🌿', '꽃 피는 중 🌸', '주렁주렁 수확 가능! 🎉'][stage];
  };

  // Perform watering on a specific plot index
  const applyWater = (plotId: number) => {
    if (gardenWater <= 0) {
      setActionAlert('💧 물뿌리개 수분이 부족합니다! 학습 미션을 완수해 채워 오세요.');
      return;
    }

    const updated = plots.map(plot => {
      if (plot.id === plotId) {
        if (plot.stage >= 4) {
          setActionAlert('이미 탐스럽게 여물어 수확을 대기 중입니다! 얼른 수확망에 담아 정원을 보존해 주세요.');
          return plot;
        }
        if (plot.waterApplied >= plot.waterNeeded) {
          setActionAlert('이 화분은 이미 수분이 넉넉합니다! 거름을 주거나 옆 이웃 화분을 살펴봐 주세요.');
          return plot;
        }

        const nextWater = plot.waterApplied + 1;
        setGardenWater(prev => Math.max(0, prev - 1));
        
        // Check stage progression
        let nextStage = plot.stage;
        let nextAppliedWater = nextWater;
        let nextAppliedFert = plot.fertilizerApplied;

        if (nextWater >= plot.waterNeeded && plot.fertilizerApplied >= plot.fertilizerNeeded) {
          // Progress Stage!
          nextStage = Math.min(4, plot.stage + 1);
          nextAppliedWater = 0;
          nextAppliedFert = 0;
          triggerWiggle(plotId, `축하합니다! ${plot.name} 작물이 다음 단계로 쑥 자랐습니다! ✨`);
        } else {
          triggerWiggle(plotId, '물뿌리개 시원하게 샤워 중! 💧 촉촉해 굳어진 흙이 풀렸습니다.');
        }

        return {
          ...plot,
          waterApplied: nextAppliedWater,
          fertilizerApplied: nextAppliedFert,
          stage: nextStage
        };
      }
      return plot;
    });

    savePlots(updated);
    pickRandomQuote();
  };

  // Perform fertilizing on a specific plot index
  const applyFertilizer = (plotId: number) => {
    if (gardenFertilizer <= 0) {
      setActionAlert('🧪 거름 영양제가 바닥났습니다! 오늘의 회화 트레이닝을 마무리해 확보해 오세요.');
      return;
    }

    const updated = plots.map(plot => {
      if (plot.id === plotId) {
        if (plot.stage >= 4) {
          setActionAlert('과실이 가득 맺혔습니다! 거름을 그치고 즉시 수확해 주시면 좋습니다.');
          return plot;
        }
        if (plot.fertilizerApplied >= plot.fertilizerNeeded) {
          setActionAlert('이미 유기 영양분이 포화 상태입니다. 이제 물을 부어서 생기를 북돋아 줄 때!');
          return plot;
        }

        const nextFert = plot.fertilizerApplied + 1;
        setGardenFertilizer(prev => Math.max(0, prev - 1));

        let nextStage = plot.stage;
        let nextAppliedWater = plot.waterApplied;
        let nextAppliedFert = nextFert;

        if (plot.waterApplied >= plot.waterNeeded && nextFert >= plot.fertilizerNeeded) {
          nextStage = Math.min(4, plot.stage + 1);
          nextAppliedWater = 0;
          nextAppliedFert = 0;
          triggerWiggle(plotId, `축하합니다! 영양 풍부! ${plot.name} 작물이 멋지게 우뚝 솟았습니다! ✨`);
        } else {
          triggerWiggle(plotId, '모차르트 클래식 응원 에너지가 비료처럼 작물 줄기에 촉촉 주입됩니다!');
        }

        return {
          ...plot,
          waterApplied: nextAppliedWater,
          fertilizerApplied: nextAppliedFert,
          stage: nextStage
        };
      }
      return plot;
    });

    savePlots(updated);
    pickRandomQuote();
  };

  // Harvesting sequence
  const harvestCrop = (plotId: number, type: 'carrot' | 'strawberry' | 'sunflower') => {
    const updated = plots.map(plot => {
      if (plot.id === plotId) {
        if (plot.stage < 4) return plot;
        
        // Harvest successfully!
        const cropName = plot.name;
        triggerWiggle(plotId, `🧺 바구니에 탐스러운 ${cropName} 수확 완료! 경험치 50 EXP가 적립되고 화분 슬롯이 새 도전을 준비하기 위해 새 씨앗으로 가꾸어졌습니다. 🌱`);
        
        // Increment harvest cupboard count
        const updatedHarvest = { ...harvestStorage };
        updatedHarvest[type] = (updatedHarvest[type] || 0) + 1;
        saveHarvest(updatedHarvest);

        // Reset pot to seed stage 0
        return {
          ...plot,
          stage: 0,
          waterApplied: 0,
          fertilizerApplied: 0
        };
      }
      return plot;
    });

    savePlots(updated);
    pickRandomQuote();
  };

  const triggerWiggle = (plotId: number, msg: string) => {
    setWigglePlotId(plotId);
    setActionAlert(msg);
    setTimeout(() => {
      setWigglePlotId(null);
    }, 1500);
  };

  const pickRandomQuote = () => {
    const rand = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setActiveQuote(rand);
  };

  return (
    <div className="w-full px-5 py-5 space-y-6 animate-fadeIn" id="gardenPanel">
      
      {/* Title section with styling */}
      <div className="border-b border-gray-100 pb-3 flex justify-between items-end">
        <div>
          <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-1.5">
            <span>📈 내 손안의 영어 정원</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 font-extrabold px-2 py-0.5 rounded-full border border-emerald-100">실시간 연동</span>
          </h3>
          <p className="text-[11px] text-gray-400">말씀을 가꿀수록 무럭무럭 자라고 수확되는 3개의 보람 화분</p>
        </div>
      </div>

      {/* Resource Inventory board */}
      <div className="bg-slate-950 text-slate-100 rounded-3xl p-4.5 space-y-3 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr from-transparent to-amber-500/10 rounded-full blur-xl"></div>
        
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
          <span className="text-[10.5px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
            <span>🌾 농가 저수지 및 창고 자재</span>
          </span>
          <span className="text-[9.5px] text-slate-400 font-black">데일리 미션 클리어 보상 충전</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-900 border border-slate-800/65 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-bold">물뿌리개 수량</div>
              <div className="text-sm font-black text-sky-400 mt-0.5 flex items-center gap-1">
                <span>💧 {gardenWater}개</span>
              </div>
            </div>
            <span className="text-xl">🧴</span>
          </div>

          <div className="bg-slate-900 border border-slate-800/65 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-bold">유기 거름 비료</div>
              <div className="text-sm font-black text-amber-500 mt-0.5 flex items-center gap-1">
                <span>🧪 {gardenFertilizer}개</span>
              </div>
            </div>
            <span className="text-xl">🍪</span>
          </div>
        </div>
        
        {gardenWater === 0 && gardenFertilizer === 0 && (
          <p className="text-[9.5px] text-orange-400 font-medium leading-normal animate-pulse text-center">
            💡 보급 창고가 비었습니다! 단어·구동사·추천코스 3단계 학습을 진행하면 가꾸기 재료가 즉시 가득 조달됩니다! 🌱
          </p>
        )}
      </div>

      {/* Dynamic Alerts inside gardening feedback */}
      {actionAlert && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-xs font-bold text-slate-700 animate-fadeIn flex items-start gap-2">
          <span className="text-base select-none">💬</span>
          <p className="leading-snug flex-1">{actionAlert}</p>
        </div>
      )}

      {/* Wooden Plots Container Grid */}
      <div className="space-y-4">
        <div className="text-xs font-black text-slate-500 flex items-center gap-1 pl-1">
          <span>🪴 심겨진 3대 텃밭 생태계</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {plots.map((plot) => {
            const isWiggling = wigglePlotId === plot.id;
            const waterFull = plot.waterApplied >= plot.waterNeeded;
            const fertFull = plot.fertilizerApplied >= plot.fertilizerNeeded;
            const canHarvest = plot.stage === 4;

            return (
              <div 
                key={plot.id} 
                className="bg-white border border-slate-100 rounded-[28px] p-4.5 space-y-4 shadow-xs transition-all hover:shadow-md relative"
              >
                {/* Visual badge top right */}
                <span className="absolute top-4 right-4 text-[9.5px] bg-slate-50 text-slate-400 font-extrabold px-2 py-0.5 rounded-lg border border-slate-100">
                  {getStageLabel(plot.stage)}
                </span>

                <div className="flex items-center gap-4">
                  {/* Emoji Visual potted plant wiggler */}
                  <div 
                    className={`w-16 h-16 bg-stone-50 border border-amber-100 rounded-2xl flex items-center justify-center text-3xl select-none relative transition-transform duration-300 ${
                      isWiggling ? 'animate-bounce scale-110 rotate-12 bg-amber-50' : ''
                    } ${canHarvest ? 'border-amber-300 ring-2 ring-amber-400 ring-offset-2 animate-pulse' : ''}`}
                  >
                    {getCropEmoji(plot)}
                    {canHarvest && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                    )}
                  </div>

                  {/* Text descriptions level */}
                  <div className="flex-1 space-y-1">
                    <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>{plot.name}</span>
                      <span className="text-[10px] text-amber-600 font-black">HP.LV {plot.stage}</span>
                    </div>
                    
                    {/* Tiny Progress indicators */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-400 pt-0.5">
                      <div className="flex items-center gap-1">
                        <span>물 수분:</span>
                        <span className={waterFull ? 'text-sky-500 font-black' : 'text-slate-600 font-black'}>
                          {plot.waterApplied} / {plot.waterNeeded} 💧
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>거름 비료:</span>
                        <span className={fertFull ? 'text-amber-500 font-black' : 'text-slate-600 font-black'}>
                          {plot.fertilizerApplied} / {plot.fertilizerNeeded} 🧪
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pot Care Actions Toolbar inside individual plots */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-50">
                  <button
                    onClick={() => applyWater(plot.id)}
                    disabled={plot.stage >= 4 || waterFull}
                    className={`rounded-xl py-2 flex items-center justify-center gap-1 text-[10.5px] font-black transition-all ${
                      plot.stage >= 4 || waterFull
                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                        : 'bg-sky-50 hover:bg-sky-100 text-sky-600 active:scale-95 cursor-pointer border border-sky-100'
                    }`}
                  >
                    <span>💧 물붓기 (-1)</span>
                  </button>

                  <button
                    onClick={() => applyFertilizer(plot.id)}
                    disabled={plot.stage >= 4 || fertFull}
                    className={`rounded-xl py-2 flex items-center justify-center gap-1 text-[10.5px] font-black transition-all ${
                      plot.stage >= 4 || fertFull
                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 active:scale-95 cursor-pointer border border-amber-100'
                    }`}
                  >
                    <span>🧪 거름주기 (-1)</span>
                  </button>

                  <button
                    onClick={() => harvestCrop(plot.id, plot.type)}
                    disabled={plot.stage < 4}
                    className={`rounded-xl py-2 flex items-center justify-center gap-1 text-[10.5px] font-black transition-all ${
                      plot.stage < 4
                        ? 'bg-slate-50 text-slate-300 border border-slate-100/40 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 cursor-pointer shadow-sm animate-pulse'
                    }`}
                  >
                    <span>🧺 수확하기!!</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Harvest storage cabinet cupboard mockup! */}
      <div className="bg-amber-50/50 border border-amber-100 rounded-[28px] p-4 space-y-3">
        <div className="flex justify-between items-center pl-1">
          <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
            <span>🧺 나의 영문 수확 도감 및 보관 바구니</span>
          </span>
          <span className="text-[10px] text-amber-700 font-bold">수확 누적창고</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-white border border-amber-100/70 p-3 rounded-2xl shadow-xs">
            <span className="text-2xl block mb-1">🥕</span>
            <div className="text-[9.5px] text-amber-800 font-bold">토끼 홍당무</div>
            <div className="text-xs font-black text-emerald-600 mt-1">{harvestStorage.carrot || 0}개 수확</div>
          </div>

          <div className="bg-white border border-amber-100/70 p-3 rounded-2xl shadow-xs">
            <span className="text-2xl block mb-1">🍓</span>
            <div className="text-[9.5px] text-amber-800 font-bold">수줍은 딸기</div>
            <div className="text-xs font-black text-emerald-600 mt-1">{harvestStorage.strawberry || 0}개 수확</div>
          </div>

          <div className="bg-white border border-amber-100/70 p-3 rounded-2xl shadow-xs">
            <span className="text-2xl block mb-1">🌻</span>
            <div className="text-[9.5px] text-amber-800 font-bold">태양 해바라기</div>
            <div className="text-xs font-black text-emerald-600 mt-1">{harvestStorage.sunflower || 0}개 수확</div>
          </div>
        </div>
        
        {/* Real-time Graduation Progress and Requirement section */}
        {(() => {
          const totalHarvests = (harvestStorage.carrot || 0) + (harvestStorage.strawberry || 0) + (harvestStorage.sunflower || 0);
          const pct = Math.min(100, (totalHarvests / goalHarvests) * 100);
          
          // Get stamps count based on totalSessions or cached days
          const stamps = Math.min(goalStamps, totalSessions);
          
          return (
            <div className="pt-3 border-t border-amber-200/50 space-y-4">
              <div className="flex justify-between items-center text-xs font-bold pl-1">
                <span className="text-slate-800 flex items-center gap-1">
                  <span>🎓</span>
                  <span>명예 졸업 요건</span>
                </span>
                <div className="flex items-center gap-1 bg-amber-100/85 border border-amber-200 px-2.5 py-0.5 rounded-lg text-amber-900 select-none">
                  <span className="text-[10px] font-black">🎖️ {goalHarvests}회 수확 + {goalStamps}일 Habit 스탬프 완료 시</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 pl-1">
                  <span>1단계: 식물 수확 진척도 ({totalHarvests} / {goalHarvests}개)</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 transition-all duration-1000" 
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>

              {/* Dynamic Period Habit Stamp Board */}
              <div className="space-y-2 bg-white/70 border border-amber-100/50 rounded-2xl p-3.5 shadow-inner">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-600 pl-0.5">
                  <span className="flex items-center gap-1">✨ 2단계: {goalStamps}일 매일 실천 스탬프 (누적 {stamps} / {goalStamps}일)</span>
                  <span className="text-emerald-600">오늘 완료 ✓</span>
                </div>
                
                <div className="grid grid-cols-10 gap-1 pt-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {Array.from({ length: goalStamps }).map((_, idx) => {
                    const isStamped = idx < stamps;
                    return (
                      <div 
                        key={idx} 
                        className={`aspect-square rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${
                          isStamped 
                            ? 'bg-amber-100 text-amber-700 border border-amber-300 shadow-xs' 
                            : 'bg-slate-50 text-slate-350 border border-slate-100 border-dashed'
                        }`}
                        title={isStamped ? `${idx + 1}일차 완료` : `${idx + 1}일차 미접수`}
                      >
                        {isStamped ? '🌻' : idx + 1}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Intuitive and Complete Mechanic explainer on Point 6 */}
              <div className="bg-orange-50/50 border border-orange-100/60 p-3 rounded-2xl text-[10.5px] text-slate-500 leading-relaxed font-semibold">
                🌾 <b>가꾸기 재료 및 수확 안내:</b><br />
                - 필러 워드 공부나 데일리 단어 등을 학습하여 쌓인 <b>경험치(XP)</b>는 정원의 <b>물뿌리개 💧 1개 및 비료 🧪 1개</b>로 실시간 변환되어 인벤토리에 조달됩니다.<br />
                - 조달된 재료로 식물 3줄기를 가꿔 <b>총 {goalHarvests}회 수확</b>을 마치고, 매일 가볍게 대화해 <b>{goalStamps}칸의 습관 스탬프</b>를 다 채우면 대망의 한 달 맞춤 졸업 수료증 및 1:1 진단 종합 카드가 발급됩니다! 🎓
              </div>

              <div className="flex justify-between items-center pt-1">
                {(totalHarvests >= goalHarvests && stamps >= goalStamps) ? (
                  <button
                    onClick={() => setShowGradModal(true)}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-orange-500/10 cursor-pointer active:scale-95 transition-all text-center"
                  >
                    🎉 목표 수료 요건 달성! 명예 졸업장 수령하기 🎓
                  </button>
                ) : (
                  <p className="text-[9.5px] text-slate-400 pl-1 font-semibold leading-normal">
                    💡 앞으로 <b>{Math.max(0, goalHarvests - totalHarvests)}개 수확</b> 및 <b>{Math.max(0, goalStamps - stamps)}일 스탬프</b>를 충족하면, 내 MBTI 타입 맞춤 자없프 명예 졸업장이 자동 수여됩니다!
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Graduation Modal overlay */}
      {showGradModal && (() => {
        const totalHarvests = (harvestStorage.carrot || 0) + (harvestStorage.strawberry || 0) + (harvestStorage.sunflower || 0);
        const subGroup = persona.mbtiGroup === 'default' ? 'NF' : persona.mbtiGroup;
        
        let mbtiFeedback = '';
        if (subGroup === 'NF') {
          mbtiFeedback = '완벽함이라는 긴장에 갇히지 않고 용기를 던진 당신의 감성이 오늘의 싱그러운 꽃밭을 피워냈습니다. 실수는 꽃잎이 떨어지는 과정일 뿐이며, 다음 단계에서도 당신만의 특별한 목소리는 더욱 빛날 것입니다. 🌸';
        } else if (subGroup === 'NT') {
          mbtiFeedback = '실수를 오류 데이터로 간주하고 매일 끈기 있게 수정한 결과물이 수학적으로 완벽한 숙련도를 안겨주었습니다. 분석을 두려워하지 않는 합리적 몰입도가 이뤄낸 영예로운 수확입니다. 📊';
        } else if (subGroup === 'SJ') {
          mbtiFeedback = '어김없이 매일 아끼지 않고 물과 거름을 주던 정직한 인내와 루틴의 승리입니다. 당신이 하루씩 쌓아 올린 이 벽돌은 쉽게 무너지지 않는 찬란한 영어 오아시스가 되었습니다. 🏆';
        } else {
          mbtiFeedback = '틀에 박힌 교재보단 직관적인 리듬과 생동하는 문형 자체를 유연하게 흡수해 과실로 영글게 만들었습니다. 원어민들의 놀이터처럼 가벼운 마음과 감각을 다음 정원에서도 실천해 봐요! 🎸';
        }

        return (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-[32px] p-6 w-full max-w-[340px] border border-amber-200 shadow-2xl relative overflow-y-auto max-h-[92vh] no-scrollbar flex flex-col justify-between">
              
              <div className="space-y-4">
                {/* Gold Crest */}
                <div className="text-center relative">
                  <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 mx-auto animate-pulse">
                    <span className="text-3xl">🎓</span>
                  </div>
                  <div className="absolute -top-1 right-20 text-[10px] bg-red-500 text-white font-extrabold px-2 py-0.5 rounded-full rotate-12 shadow-xs">OFFICIAL</div>
                </div>

                <div className="text-center space-y-1">
                  <h4 className="text-sm font-semibold tracking-wider text-amber-800 uppercase font-serif">HONORARY CERTIFICATE</h4>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">명예 영어 원예가 졸업 증서</h3>
                  <div className="w-16 h-0.5 bg-amber-400 mx-auto my-1.5 rounded-full"></div>
                  <p className="text-xs text-slate-700 font-extrabold font-sans">성명: {persona.nickname} 님</p>
                </div>

                {/* Content body */}
                <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-3.5 space-y-3.5 text-left">
                  <div>
                    <h5 className="text-[10.5px] font-black text-amber-900 border-b border-amber-200/50 pb-1 mb-1.5 flex items-center gap-1">
                      <span>📊</span>
                      <span>나만의 영어 정원 수확 요약</span>
                    </h5>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] font-bold text-slate-600">
                      <div>총 스피킹 프리토크:</div>
                      <div className="text-indigo-600 text-right">{totalSessions}세션</div>
                      <div>안도 교정 개선율:</div>
                      <div className="text-emerald-600 text-right">95.2%</div>
                      <div>총 수확 작물 개수:</div>
                      <div className="text-orange-500 text-right">{totalHarvests}개 완료</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-[10.5px] font-black text-amber-900 border-b border-amber-200/50 pb-1 mb-1.5 flex items-center gap-1">
                      <span>💬</span>
                      <span>맞춤형 격려 및 AI 총평</span>
                    </h5>
                    <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold italic">
                      "{mbtiFeedback}"
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-medium text-center italic">
                  "틀려도 괜찮아, 나만의 스치듯 시원한 영어로 도약한 수고를 정중히 증명합니다."
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-4">
                <button
                  onClick={handleGraduationReset}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-4 rounded-2xl text-xs transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  <span>🎉 졸업 수료 & 새로운 2기 정원 일구기</span>
                </button>
                <button
                  onClick={() => setShowGradModal(false)}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  기록 잠시 더 보기
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Dynamic Confidence Quote boosters */}
      {activeQuote ? (
        <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl space-y-1.5 animate-fadeIn">
          <div className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Confidence Booster Quotes</div>
          <p className="text-xs font-black font-sans text-gray-800 leading-relaxed">"{activeQuote.en}"</p>
          <p className="text-[11px] text-gray-500 leading-normal">{activeQuote.ko}</p>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50/30 border border-emerald-100/60 rounded-2xl flex items-start gap-2.5">
          <Compass className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
            <b>안내:</b> 화분에 물(💧)과 거름(🧪) 영양이 동시에 만충될 때마다 화분이 즉시 한 단계 쑥 자라며 울렁증 방지 힐링 에센스가 쏟아져 나옵니다.
          </p>
        </div>
      )}

    </div>
  );
}
