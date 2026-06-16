import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Setup Gemini API client on the server side
  const getAiHelper = () => {
    const rawApiKey = (process.env.GEMINI_API_KEY || '').trim();
    const apiKey = rawApiKey.replace(/^["']|["']$/g, ''); // strip any wrapping quotes
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API 0: Check Gemini API Key Connection status (secure)
  app.get('/api/gemini/status', (req, res) => {
    const rawApiKey = (process.env.GEMINI_API_KEY || '').trim();
    const apiKey = rawApiKey.replace(/^["']|["']$/g, '');
    const active = !!apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey !== '';
    res.json({
      active,
      keyLength: apiKey.length,
      prefix: apiKey ? apiKey.slice(0, 6) : '',
      suffix: apiKey ? apiKey.slice(-4) : '',
      envExists: 'GEMINI_API_KEY' in process.env
    });
  });

  // API 1: Generate custom daily learning content based on user persona
  app.post('/api/gemini/generate-learning', async (req, res) => {
    const ai = getAiHelper();
    const { mbti, goal, level, trauma, recentMistakes } = req.body;
    const levelIndex = Number(level) || 2;
    const goalKey = goal || '일상';
    const levelName = ['기초', '초급', '중급', '중상급', '상급'][levelIndex - 1] || '초급';

    // Core offline backups for absolute safety
    const fallbackWords = [
      { en: 'By the way', ko: '그런데, 그건 그렇고', definition: 'To introduce a new subject of conversation in a natural flow.', sentenceEn: 'By the way, did you see my keys?', sentenceKo: '근데 내 열쇠 봤어?', levelText: `${levelName} (수행)` },
      { en: 'Deal with', ko: '처리하다, 해결하다', definition: 'To take action to solve a problem or handle a situation.', sentenceEn: 'I have to deal with this issue now.', sentenceKo: '지금 이 문제를 처리해야 해요.', levelText: `${levelName} (수행)` },
      { en: 'Look forward to', ko: '~을 학수고대하다', definition: 'To feel pleased and excited about something that is going to happen.', sentenceEn: 'I look forward to meeting you soon.', sentenceKo: '곧 뵙기를 고대하겠습니다.', levelText: `${levelName} (수행)` }
    ];

    const fallbackPhrasals = [
      { en: 'Catch up', ko: '오랜만에 밀린 대화를 나누다', definition: 'To talk to someone at length to get up to date on news.', sentenceEn: 'We should catch up over lunch sometime.', sentenceKo: '우리 조만간 점심 먹으면서 그동안 얘기 좀 하자.', context: '바쁜 일상 중 보고 싶었던 친구를 만나 수다를 떨 때' },
      { en: 'Run out of', ko: '다 써 버리다, 바닥나다', definition: 'To finish the supply of something.', sentenceEn: 'We are running out of milk.', sentenceKo: '우리 우유 다 떨어져 가.', context: '일이나 음식 재료 등 무언가가 고갈되어 갈 때 안심 기지가 필요한 상황' }
    ];

    const fallbackFillers = [
      { en: 'Actually', ko: '사실은, 실은', usage: '대답하기 곤란하거나 머릿속 단어를 떠올릴 때, 생각을 고르는 척 숨 고를 시간을 줍니다.', sentenceEn: 'Actually, I don’t think that is the best approach.', sentenceKo: '사실, 그게 최선의 방법은 아닌 거 같아.' },
      { en: 'You know', ko: '있잖아, 알다시피', usage: '상대의 공감대를 부드럽게 두드려 한 몸이 되어 대화를 풀고자 할 때 유용해요.', sentenceEn: 'She is, you know, a very passionate person.', sentenceKo: '그녀는 말하자면... 알다시피 엄청 열정적인 사람이야.' }
    ];

    const fallbackExprs = [
      { en: 'That makes two of us.', ko: '내 말이! 나도 완전 공감해.', situation: '누군가 실수에 대해 고민을 털어놓았을 때 완벽하게 한 편이 되어 위로를 건넬 때', alternative: 'I am same -> That makes two of us' },
      { en: 'How has your day been so far?', ko: '오늘 하루 지금까지 어떻게 보내고 있어?', situation: '긴장 없이 스몰토크의 물꼬를 가볍게 트이고 싶을 때', alternative: 'Are you happy? -> How has your day been so far?' }
    ];

    const fallbackQuestions: Record<string, string[]> = {
      '여행': [
        "Welcome to the Grand Hotel! Are you ready to check in, or can I help you carry your bags?",
        "Where is your dream travel destination and what is the first thing you want to eat there?",
        "Excuse me, did you get lost? I can help you find your way! What spot are you looking for?"
      ],
      '직장·이직': [
        "Tell me about a challenging project you worked on recently. How did you feel about it?",
        "What are your unique strengths that make you stand out from other candidates?",
        "Why do you want to transition your career right now?"
      ],
      '일상': [
        "Hi there! How has your day been so far? Anything fun or relaxing happened?",
        "What is your absolute favorite comfort food when you are having a tiring day?",
        "If you had a million dollars and had to spend it all in 24 hours, what would you buy?"
      ],
      '시험': [
        "Describe a memorable change that has happened in your neighborhood over the last few years.",
        "Do you prefer watching news on television or reading articles on your phone? Why?",
        "Talk about a very useful skill you recently acquired."
      ],
      '콘텐츠': [
        "Have you watched any great movies or YouTube videos lately? Tell me about them!",
        "If you could enter any Netflix series as a main character, which one would you choose?",
        "What is your favorite genre of music, and who is an artist you could listen to all day?"
      ]
    };
    const goalQs = fallbackQuestions[goalKey] || fallbackQuestions['일상'];
    const selectedQ = goalQs[Math.floor(Math.random() * goalQs.length)];

    // Pick offline random indexes
    const wordIdx = Math.floor(Math.random() * fallbackWords.length);
    const phrasalIdx = Math.floor(Math.random() * fallbackPhrasals.length);
    const fillerIdx = Math.floor(Math.random() * fallbackFillers.length);
    const exprIdx = Math.floor(Math.random() * fallbackExprs.length);

    const offlineFallbackBlock = {
      word: fallbackWords[wordIdx],
      phrasal: fallbackPhrasals[phrasalIdx],
      filler: fallbackFillers[fillerIdx],
      expr: fallbackExprs[exprIdx],
      freeTalkQuestion: selectedQ
    };

    try {
      if (!ai) {
        console.warn('Gemini Client is in offline fallback mode. Serving high-fidelity mock curriculum.');
        return res.json(offlineFallbackBlock);
      }

      let prompt = `
        You are the main curriculum designer for "자없프" (No-Confidence English), an app that helps Koreans who are anxious about speaking English.
        Create an elegant daily study session tailored specifically for this user persona:
        - Goal: ${goalKey} (e.g. 여행, 직장·이직, 시험, 콘텐츠, 일상)
        - MBTI: ${mbti} (We use this to tone the explanation)
        - English Proficiency Level: ${levelName} (out of 5 levels)
        - Trauma/Anxiety points: ${Array.isArray(trauma) ? trauma.join(', ') : 'None'} (Help them feel relaxed and capable).`;

      if (Array.isArray(recentMistakes) && recentMistakes.length > 0) {
        prompt += `\n\nCRITICAL DIRECT ACTION REQUIREMENT: The user recently made the following English mistakes during their 1:1 Free Talk conversation:
        ${recentMistakes.map((m: any, idx: number) => `- No. ${idx + 1}: Pronounced "${m.before}" but it should have been "${m.after}" (Correction tip: ${m.tip})`).join('\n')}

        You MUST design today's dynamic curriculum specifically to review, reinforce, and heal these recent mistakes!
        For example: Choose vocabulary or 구동사 (phrasal verb) or recommended expression ("expr") that teaches the grammar rule they failed on, or directly incorporates the target word they were trying to say under similar scenarios!`;
      }

      prompt += `\n\n
        Generate exactly five customized learning components in Korean (except the English question text):
        1. "word": A highly practical conversational vocabulary item, matching their level. Detail spelling, Korean meaning, elegant English definition, and a high-use real-world example sentence with Korean translation.
        2. "phrasal": A Phrasal Verb (구동사) suitable for their goal and level. Detail spelling, Korean meaning, English definition, context simulation (situational context description on when to say it), and an example sentence with Korean translation.
        3. "filler": A helpful English Filler Word (e.g. "actually", "you know", "I mean", "kind of", "to be honest") to help them buy time when they are nervous. Explain spelling, Korean meaning, usage situation advice, and an example sentence with Korean translation.
        4. "expr": A Recommended Situational Expression (추천 표현) relating to their selected goal. Help them express themselves more naturally. Suggest a native-sounding expression ("after") instead of a rigid awkward translation ("before") in format "Rigid Stiff Phrase -> Native Recommended Expression", explain why, with an example sentence and translation.
        5. "freeTalkQuestion": Today's personalized 1:1 Free talk conversation starter question. It must be a highly engaging, comforting, open-ended question in natural conversational English, specifically customized for their selected goal (${goalKey}) and English proficiency level. It should encourage them to speak. Keep the question friendly, and do not make it too complex.

        Strictly generate a single, clean JSON matched to this TypeScript schema:
        {
          "word": { "en": string, "ko": string, "definition": string, "sentenceEn": string, "sentenceKo": string, "levelText": string },
          "phrasal": { "en": string, "ko": string, "definition": string, "sentenceEn": string, "sentenceKo": string, "context": string },
          "filler": { "en": string, "ko": string, "usage": string, "sentenceEn": string, "sentenceKo": string },
          "expr": { "en": string, "ko": string, "situation": string, "alternative": string },
          "freeTalkQuestion": string
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  ko: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  sentenceEn: { type: Type.STRING },
                  sentenceKo: { type: Type.STRING },
                  levelText: { type: Type.STRING }
                },
                required: ['en', 'ko', 'definition', 'sentenceEn', 'sentenceKo', 'levelText']
              },
              phrasal: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  ko: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  sentenceEn: { type: Type.STRING },
                  sentenceKo: { type: Type.STRING },
                  context: { type: Type.STRING }
                },
                required: ['en', 'ko', 'definition', 'sentenceEn', 'sentenceKo', 'context']
              },
              filler: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  ko: { type: Type.STRING },
                  usage: { type: Type.STRING },
                  sentenceEn: { type: Type.STRING },
                  sentenceKo: { type: Type.STRING }
                },
                required: ['en', 'ko', 'usage', 'sentenceEn', 'sentenceKo']
              },
              expr: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  ko: { type: Type.STRING },
                  situation: { type: Type.STRING },
                  alternative: { type: Type.STRING }
                },
                required: ['en', 'ko', 'situation', 'alternative']
              },
              freeTalkQuestion: { type: Type.STRING }
            },
            required: ['word', 'phrasal', 'filler', 'expr', 'freeTalkQuestion']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from model.');
      }
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.error('Learning generation error (falling back):', error);
      res.json(offlineFallbackBlock); // Sanely fall back to keep page active
    }
  });

  // API 2: Chat Partner with live feed corrections (MBTI and Trauma Adaptive)
  app.post('/api/gemini/chat', async (req, res) => {
    const ai = getAiHelper();
    const { userMessage, history, mbti, goal, level, trauma, question } = req.body;
    const isNF = (mbti || '').toLowerCase().includes('f');
    const levelIndex = Number(level) || 2;
    const levelName = ['기초', '초급', '중급', '중상급', '상급'][levelIndex - 1] || '초급';

    // Generates localized cute fallback responses based on parsed inputs to prevent any crash
    const normalizedMsg = (userMessage || '').trim().toLowerCase();
    
    let simulatedReply = "Oh, I hear you! That sounds really interesting. Tell me more about what you mean! What is the favorite part of your day? 🐹";
    let simulatedCorrections: any[] = [];

    if (isNF) {
      simulatedReply = "Wow, that is beautiful! Your willingness to express your goals is incredible. I'm so excited to learn more about your thoughts. Can you tell me more about it? 🦊";
    } else {
      simulatedReply = "That's a very practical point. It's highly efficient to think about this in progressive stages. What is the immediate goal you want to accomplish next? 📊";
    }

    // Smart regex scan for gentle simulated corrections to give direct real value during fallback!
    if (normalizedMsg.includes('study am') || normalizedMsg.includes('i am study')) {
      simulatedCorrections.push({
        before: 'I am study',
        after: 'I study',
        tip: '영어 공부 중인 사실은 am 없이 "I study" 또는 "I am studying"으로 깔끔하게 표현하는 것이 훨씬 자연스러워요. 너무 정겹고 멋진 표현이에요! 🌿',
        type: 'grammar',
        category: 'tenses'
      });
    } else if (normalizedMsg.includes('팀') || normalizedMsg.includes('team')) {
      // If they input korean mixed or awkward
      simulatedCorrections.push({
        before: '팀',
        after: 'team',
        tip: '한글 혼용도 최고로 멋져요! 대화 중 수줍을 때는 영어 단어 "team"으로 부드럽게 채우시면 백점입니다! 😊',
        type: 'vocab',
        category: 'nativeAlt'
      });
    } else if (normalizedMsg.length > 0 && normalizedMsg.length < 5) {
      // Too short
      simulatedReply = "Oh! I'm so happy you said that. Even simple words are great! How have you been feeling today? Raise your voice and let me know! 💛";
    }

    const offlineFallbackChat = {
      reply: simulatedReply,
      corrections: simulatedCorrections
    };

    try {
      if (!ai) {
        console.warn('Gemini Client is in offline fallback mode for Chat. Serving simulated chat partner.');
        return res.json(offlineFallbackChat);
      }

      const historyContext = history.slice(-10).map((m: any) => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');

      const systemInstruction = `
        You are the warm, highly empathetic native AI chat partner for "자없프" (No-Confidence English), an app for Korean English-learners who are terrified of spoken mistakes or stuttering.
        
        Your core responsibilities:
        1. "reply": converse as an extremely friendly, responsive chat partner.
           - Tailor your English sentences specifically to a ${levelName} Korean learner. Use clear, simple, but authentic native vocabulary.
           - DO NOT sound like a rigid textbook. Use warm, natural spoken English.
           - You MUST directly build on top of what the user says in "${userMessage}". Respond with genuine human-like interest and empathy first (e.g., "Oh that sounds amazing!", "I completely get what you mean!").
           - To keep the conversational momentum going continuously, you MUST always close your reply with exactly one friendly, natural, simple open-ended question related to the topic. Do not let the chat end.
        2. "corrections": gently analyze the latest user message ("${userMessage}").
           - CRITICAL ANALYSIS DETAIL: You MUST thoroughly evaluate the ENTIRE user message. If the user message has multiple sentences (e.g. "Sentence one. Sentence two."), do NOT stop after the first sentence or skip subsequent parts of the text. Scan every sentence fully to identify all notable mistakes, direct translations, or Konglish slips.
           - Help them speak like a natural native. Look for grammatical mistakes, spelling bugs, awkward phrasing, or stiff direct-translation slips. Focus particularly on parts where the user holds back, types in Korean, or uses hybrid words (e.g. "팀 (team)").
           - For the "before" and "after" fields, target ONLY the key word, short chunk, or phrase that was actually incorrect or awkward (e.g., "팀" or "팀 (team)" -> "team") rather than reproducing the entire correct or long sentence. This makes it extremely clear where the error is. Only output the entire sentence if the entire structural layout of the sentence is incorrect.
           - For each point, provide a correction object:
             * "before": what the user wrote (target only the specific incorrect word/phrase).
             * "after": the natural polished native phrasing (target only the corrected word/phrase).
             * "tip": a very cozy, comforting explanation in Korean, telling them why the change makes sense and praising their bravery. Keep it encouraging!
             * "type": 'grammar' or 'vocab'.
             * "category": Assign exactly one category based on the nature of the error:
               - "tenses": verb forms, subject-verb agreement, conjugation, auxiliary verbs, regular/irregular verbs, helper verb omissions.
               - "prepositions": preposition choice (in/on/at/to/of/for...), articles (a/an/the), plural -s markers, pronouns, or simple word boundary particles.
               - "nativeAlt": Korean-style literal translations (e.g., direct Konglish matches), awkward terminology, or missing natural spoken English phrasing. This includes instances where the user used Korean to describe a concept (e.g., "중간에서 조율하는 역할" -> "mediating between people" or "mediator role" rather than prepositions).
               - "others": spelling, capitalization, minor punctuation typos, or other misc categories.
           - Be fully professional and precise when categorizing. Korean-to-English vocabulary choice or capitalization/spelling corrections of proper nouns (like "tteokbokki", "gimghig", etc.) MUST be categorized as "others" or "nativeAlt", and NEVER under "tenses" or "prepositions".
           - Keep corrections to a maximum of 6 items. Keep them encouraging! Do not flag errors to be pedantic; only correct actual ungrammatical or visibly awkward or Korean-containing spots. Never falsely flag words like "team" or correct sentences if they are already grammatically fine.

        Tone guidelines:
        - If MBTI is 'NF', be exceptionally supportive, praise their bravery, and use warm adjectives.
        - If 'NT', be logically structured, highlighting clear patterns or tips.
        - If 'SJ' or 'SP', give highly practical, day-to-day scenarios.
        - Trauma Points: ${Array.isArray(trauma) ? trauma.join(', ') : 'None'}. Be sensitive to these anxieties and build their confidence.
      `;

      const prompt = `
        Focus Goal: ${goal}
        Current English Level: ${levelName}
        Anxiety Context: ${Array.isArray(trauma) ? trauma.join(', ') : 'None'}
        First Opener Question: "${question}"

        Recent Conversation History:
        ${historyContext}

        Latest User Message to check & reply to: "${userMessage}"

        Respond STRICTLY with a single JSON matched to this schema:
        {
          "reply": "Your next conversational English turn ending with an engaging question",
          "corrections": [
            { "before": "user input", "after": "better wording", "tip": "다정한 한글 설명", "type": "grammar", "category": "tenses" }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              corrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    before: { type: Type.STRING },
                    after: { type: Type.STRING },
                    tip: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['grammar', 'vocab'] },
                    category: { type: Type.STRING, enum: ['tenses', 'prepositions', 'nativeAlt', 'others'] }
                  },
                  required: ['before', 'after', 'tip', 'type', 'category']
                }
              }
            },
            required: ['reply', 'corrections']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini.');
      }
      
      const parsed = JSON.parse(responseText.trim());
      if (parsed.corrections && Array.isArray(parsed.corrections)) {
        parsed.corrections = parsed.corrections.slice(0, 6);
      }
      
      res.json(parsed);
    } catch (error: any) {
      console.error('Chat API Error (falling back):', error);
      res.json(offlineFallbackChat); // Sanely fall back to keep chat running
    }
  });

  // Serve Vite dev server in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from production dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
