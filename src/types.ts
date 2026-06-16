export interface UserPersona {
  nickname: string;
  mbti: string; // e.g. ENFP, INTJ
  mbtiGroup: 'NF' | 'NT' | 'SJ' | 'SP' | 'default';
  goal: '여행' | '직장·이직' | '시험' | '콘텐츠' | '일상';
  trauma: string[];
  time: string; // e.g. "10분", "20분", "30분"
  level: number; // 1 to 5
  onboardingComplete: boolean;
  onboardingDate: string; // YYYY-MM-DD
  
  // Custom high-fidelity onboarding fields
  job?: string;
  age?: string;
  period?: string;
  listening?: string;
  subjects?: string[];
  duration?: string;
  gradDate?: string;
}

export interface StudyWord {
  id: string;
  en: string;
  ko: string;
  definition: string;
  sentenceEn: string;
  sentenceKo: string;
  levelText: string;
  isCompleted?: boolean;
}

export interface StudyPhrasal {
  id: string;
  en: string;
  ko: string;
  definition: string;
  sentenceEn: string;
  sentenceKo: string;
  context: string;
  isCompleted?: boolean;
}

export interface StudyFiller {
  id: string;
  en: string;
  ko: string;
  usage: string; // When to use it
  sentenceEn: string;
  sentenceKo: string;
  isCompleted?: boolean;
}

export interface StudyExpr {
  id: string;
  en: string;
  ko: string;
  situation: string;
  alternative: string; // simpler or native equivalent
  isCompleted?: boolean;
}

export interface Mistake {
  id: string;
  before: string;
  after: string;
  tip?: string;
  type: 'grammar' | 'vocab';
  category?: 'tenses' | 'prepositions' | 'nativeAlt' | 'others';
  timestamp: string;
  count: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  corrections?: Mistake[]; // computed on the fly by Gemini
}

export interface TalkSession {
  id: string;
  date: string; // YYYY-MM-DD
  goal: string;
  question: string;
  messages: ChatMessage[];
  completed: boolean;
}

export const GOAL_STARTER_QUESTIONS: Record<string, string[]> = {
  "여행": [
    "Welcome to the Grand Hotel! Are you ready to check in, or can I help you carry your bags?",
    "Where is your dream travel destination and what is the first thing you want to eat there?",
    "Excuse me, did you get lost? I can help you find your way! What spot are you looking for?"
  ],
  "직장·이직": [
    "Tell me about a challenging project you worked on recently. How did you feel about it?",
    "What are your unique strengths that make you stand out from other candidates?",
    "Why do you want to transition your career right now?"
  ],
  "일상": [
    "Hi there! How has your day been so far? Anything fun or relaxing happened?",
    "What is your absolute favorite comfort food when you are having a tiring day?",
    "If you had a million dollars and had to spend it all in 24 hours, what would you buy?"
  ],
  "시험": [
    "Describe a memorable change that has happened in your neighborhood over the last few years.",
    "Do you prefer watching news on television or reading articles on your phone? Why?",
    "Talk about a very useful skill you recently acquired."
  ],
  "콘텐츠": [
    "Have you watched any great movies or YouTube videos lately? Tell me about them!",
    "If you could enter any Netflix series as a main character, which one would you choose?",
    "What is your favorite genre of music, and who is an artist you could listen to all day?"
  ]
};
