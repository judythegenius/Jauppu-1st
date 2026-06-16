import { StudyWord, StudyPhrasal, StudyFiller, StudyExpr } from '../types';

export const OFFLINE_WORDS: Record<number, StudyWord[]> = {
  1: [
    { id: 'w1', en: 'Actually', ko: '사실은, 실은', definition: 'In fact or really; used to correct a mistake or introduce a detail.', sentenceEn: 'Actually, I don’t like coffee very much.', sentenceKo: '사실은, 저 커피 별로 안 좋아해요.', levelText: '씨앗 (기초)' },
    { id: 'w2', en: 'Hang out', ko: '어울려 놀다, 시간을 보내다', definition: 'To spend a lot of time in a place or with someone.', sentenceEn: 'Do you want to hang out this weekend?', sentenceKo: '이번 주말에 같이 놀래?', levelText: '씨앗 (기초)' },
    { id: 'w3', en: 'Figure out', ko: '알아내다, 이해하다', definition: 'To understand or find the answer to something after thinking.', sentenceEn: 'I finally figured out how to use this app.', sentenceKo: '드디어 이 앱 어떻게 쓰는지 알아냈어.', levelText: '씨앗 (기초)' },
    { id: 'w4', en: 'Kind of', ko: '조금, 약간, 가령', definition: 'To some extent; in some degree; slightly.', sentenceEn: 'I feel kind of tired today.', sentenceKo: '나 오늘 약간 피곤한 느낌이야.', levelText: '씨앗 (기초)' },
    { id: 'w5', en: 'I mean', ko: '내 말은, 그러니까', definition: 'Used to correct what you have just said or to make it clearer.', sentenceEn: 'I cannot go, I mean, I don’t have time.', sentenceKo: '나 못 가, 그러니까 시간 없다고.', levelText: '씨앗 (기초)' }
  ],
  2: [
    { id: 'w11', en: 'By the way', ko: '그런데, 그건 그렇고', definition: 'Used to introduce a new subject of conversation.', sentenceEn: 'By the way, did you see my keys?', sentenceKo: '근데 내 열쇠 봤어?', levelText: '새싹 (초급)' },
    { id: 'w12', en: 'End up', ko: '결국 ~하게 되다', definition: 'To finally be in a particular place or situation.', sentenceEn: 'We ended up ordering pizza for dinner.', sentenceKo: '우리는 결국 저녁으로 피자를 시켜 먹게 됐다.', levelText: '새싹 (초급)' },
    { id: 'w13', en: 'Make sense', ko: '이해가 되다, 말이 되다', definition: 'To be clear and easy to understand; to have a clear meaning.', sentenceEn: 'What you say makes perfect sense.', sentenceKo: '네가 하는 말이 완전히 이해가 돼.', levelText: '새싹 (초급)' },
    { id: 'w14', en: 'Deal with', ko: '처리하다, 해결하다', definition: 'To take action to solve a problem or handle a situation.', sentenceEn: 'I have to deal with this issue now.', sentenceKo: '지금 이 문제를 처리해야 해요.', levelText: '새싹 (초급)' },
    { id: 'w15', en: 'Look forward to', ko: '~을 학수고대하다', definition: 'To feel pleased and excited about something that is going to happen.', sentenceEn: 'I look forward to meeting you soon.', sentenceKo: '곧 뵙기를 고대하겠습니다.', levelText: '새싹 (초급)' }
  ],
  3: [
    { id: 'w21', en: 'Come across', ko: '우연히 발견하다, 마주치다', definition: 'To meet or find someone or something by chance.', sentenceEn: 'I came across an old photo in the drawer.', sentenceKo: '서랍에서 우연히 옛날 사진 한 장을 발견했어.', levelText: '줄기 (중급)' },
    { id: 'w22', en: 'Bring up', ko: '이야기를 꺼내다, 언급하다', definition: 'To start talking about a subject during a conversation.', sentenceEn: 'Don’t bring up that topic at dinner, please.', sentenceKo: '저녁 먹을 때 제발 그 얘긴 꺼내지 말아줘.', levelText: '줄기 (중급)' },
    { id: 'w23', en: 'Turn out', ko: '결국 ~로 밝혀지다, 드러나다', definition: 'To be known or discovered finally to be something.', sentenceEn: 'The rumors turned out to be completely true.', sentenceKo: '그 소문은 결국 전부 사실로 밝혀졌다.', levelText: '줄기 (중급)' },
    { id: 'w24', en: 'Hold on', ko: '잠깐 기다리다, 버티다', definition: 'Used to tell someone to wait for a short time.', sentenceEn: 'Hold on a second, I’m almost ready.', sentenceKo: '잠깐만 대기해줘, 거의 다 됐어.', levelText: '줄기 (중급)' },
    { id: 'w25', en: 'Go through', ko: '경험하다, (어려움을) 겪다', definition: 'To experience a difficult or unpleasant situation.', sentenceEn: 'He is going through a tough time lately.', sentenceKo: '그는 최근 힘든 시기를 겪고 있어.', levelText: '줄기 (중급)' }
  ],
  4: [
    { id: 'w31', en: 'Elaborate', ko: '자세히 설명하다, 정교하게 만들다', definition: 'To add more information or explain something in greater detail.', sentenceEn: 'Could you elaborate on your plan?', sentenceKo: '계획에 대해 조금 더 자세히 말씀해주시겠어요?', levelText: '꽃 (중상급)' },
    { id: 'w32', en: 'Nuance', ko: '뉘앙스, 미묘한 차이', definition: 'A very slight difference in appearance, meaning, sound, etc.', sentenceEn: 'He understood the nuance of the conversation.', sentenceKo: '그는 대화의 미묘한 뉘앙스를 이해했다.', levelText: '꽃 (중상급)' },
    { id: 'w33', en: 'Pull off', ko: '어려운 일을 해내다', definition: 'To succeed in doing something that is difficult or unexpected.', sentenceEn: 'I cannot believe you pulled off that project!', sentenceKo: '네가 그 프로젝트를 성공적으로 끝내다니 정말 대단해!', levelText: '꽃 (중상급)' },
    { id: 'w34', en: 'Keep up with', ko: '발맞춰 따라가다, 뒤처지지 않다', definition: 'To move or progress at the same rate as someone or something.', sentenceEn: 'It’s hard to keep up with the latest fashion.', sentenceKo: '최신 유행에 발맞춰 따라가는 것은 어렵다.', levelText: '꽃 (중상급)' },
    { id: 'w35', en: 'On the fence', ko: '애매한 태도를 취하는, 미확정인', definition: 'Not able to decide something, or not wanting to make a choice.', sentenceEn: 'I’m still on the fence about which job to choose.', sentenceKo: '어떤 직장을 선택할지 아직 결정을 못 하겠어.', levelText: '꽃 (중상급)' }
  ],
  5: [
    { id: 'w41', en: 'Repercussion', ko: '여파, 악영향을 미치는 파장', definition: 'An effect, unpleasant and often continuing, of an action.', sentenceEn: 'His action could have serious repercussions.', sentenceKo: '그의 행동은 심각한 여파를 불러올 수 있다.', levelText: '열매 (상급)' },
    { id: 'w42', en: 'Articulate', ko: '생각을 조리 있게 잘 표현하는', definition: 'Able to express thoughts and feelings easily and clearly.', sentenceEn: 'She gave a highly articulate speech yesterday.', sentenceKo: '그녀는 어제 아주 정연하고 조리 있게 스피치를 했다.', levelText: '열매 (상급)' },
    { id: 'w43', en: 'Take a toll on', ko: '~에 심각한 피해/악영향을 주다', definition: 'To cause damage or suffering over a period of time.', sentenceEn: 'Stress can take a toll on your immune system.', sentenceKo: '스트레스는 당신의 면역 체계에 악영향을 미칠 수 있습니다.', levelText: '열매 (상급)' },
    { id: 'w44', en: 'Ambivalent', ko: '양가 감정의, 좋고 싫음이 엇갈리는', definition: 'Having mixed feelings or contradictory ideas about something.', sentenceEn: 'I am ambivalent about attending the party.', sentenceKo: '파티에 참석하는 것에 대해 좋기도 하고 싫기도 해.', levelText: '열매 (상급)' },
    { id: 'w45', en: 'Prerequisite', ko: '필수 조건, 전제 조건', definition: 'A thing that is required as a prior condition for something else.', sentenceEn: 'Trust is a prerequisite for a healthy friendship.', sentenceKo: '신뢰는 건강한 우정을 위한 필수 조건이다.', levelText: '열매 (상급)' }
  ]
};

export const OFFLINE_PHRASALS: Record<string, StudyPhrasal[]> = {
  '여행': [
    { id: 'p1', en: 'Check in', ko: '체크인하다', definition: 'To report one’s arrival at a hotel, airport, etc.', sentenceEn: 'We need to check in at least two hours before.', sentenceKo: '우리는 최소 2시간 전에는 체크인을 해야 합니다.', context: '공항이나 호텔에 도착해서 프런트 데스크 직원에게 수속을 밟을 때' },
    { id: 'p2', en: 'Set off', ko: '출발하다', definition: 'To start a journey.', sentenceEn: 'We set off early in the morning to avoid traffic.', sentenceKo: '우리는 교통체증을 피하기 위해 아침 일찍 출발했다.', context: '차를 타거나 배낭을 매고 여행의 여정을 개시하는 순간' },
    { id: 'p3', en: 'Drop off', ko: '태워다 주다, 하차하다', definition: 'To take someone to a place and leave them there.', sentenceEn: 'Can you drop me off at the train station?', sentenceKo: '기차역에 저 좀 내려주실 수 있나요?', context: '택시 기사에게나 동행자에게 내려 달라고 정중히 예기할 때' }
  ],
  '직장·이직': [
    { id: 'p11', en: 'Call off', ko: '취소하다', definition: 'To cancel something that was scheduled.', sentenceEn: 'They decided to call off the afternoon meeting.', sentenceKo: '그들은 오후 회의를 취소하기로 결정했다.', context: '갑작스러운 업무 지연으로 예고된 회의나 미팅 일정을 파할 때' },
    { id: 'p12', en: 'Follow up', ko: '추가 검토하다, 후속 조치하다', definition: 'To main contact or take further action regarding something.', sentenceEn: 'I will follow up with you regarding the budget.', sentenceKo: '예산 계획안과 관련해서 추가로 후속 피드백 드리겠습니다.', context: '동료나 클라이언트에게 메일을 보내며 후속 진척을 약속할 때' },
    { id: 'p13', en: 'Wrap up', ko: '정리하다, 마무리 짓다', definition: 'To complete or finish something.', sentenceEn: 'Let’s wrap up this project by Friday.', sentenceKo: '금요일까지 이 프로젝트 마무리 지읍시다.', context: '길어지는 회의나 분기 작업을 기한 내에 산뜻하게 마무리하려 할 때' }
  ],
  '일상': [
    { id: 'p21', en: 'Run out of', ko: '다 써 버리다, 바닥나다', definition: 'To finish the supply of something.', sentenceEn: 'We are running out of milk.', sentenceKo: '우리 우유 다 떨어져 가.', context: '냉장고를 열었는데 생필품이 부족해 장을 봐야 할 때' },
    { id: 'p22', en: 'Catch up', ko: '근황을 메우다, 오랜만에 얘기 나누다', definition: 'To talk to someone at length to get up to date on news.', sentenceEn: 'We should catch up over lunch sometime.', sentenceKo: '우리 조만간 점심 먹으면서 그동안 얘기 좀 하자.', context: '오랜만에 만난 동창이나 지인과 안부를 밀도 있게 나누고 싶을 때' },
    { id: 'p23', en: 'Look after', ko: '돌보다, 신경 쓰다', definition: 'To take care of someone or something.', sentenceEn: 'Will you look after my dog while I am away?', sentenceKo: '나 없는 동안 강아지 좀 봐줄 수 있어?', context: '외출하는 동안 반려동물이나 화분, 조카 돌봄을 잠시 고부할 때' }
  ]
};

export const OFFLINE_FILLERS: StudyFiller[] = [
  { id: 'f1', en: 'Actually', ko: '사실은, 실은', usage: '대답하기 곤란할 때 생각을 정돈하고 솔직한 분위기를 풀고자 할 때 사용해요.', sentenceEn: 'Actually, I don’t think that is the best approach.', sentenceKo: '사실, 그게 최선의 방법은 아닌 거 같아.' },
  { id: 'f2', en: 'You know', ko: '있잖아, 알다시피', usage: '상대방의 공감을 정중히 유도하거나, 적절한 영단어가 얼른 생각나지 않아 침묵을 채울 때 아주 유용해요.', sentenceEn: 'She is, you know, a very passionate person.', sentenceKo: '그녀는 뭐랄까... 알다시피 엄청 열정적인 사람이야.' },
  { id: 'f3', en: 'I mean', ko: '그러니까, 내 말은', usage: '앞서 내가 한 말을 순식간에 보정하거나 예시를 추가할 때 자연스러운 브릿지로 씁니다.', sentenceEn: 'It is too expensive. I mean, we cannot afford it.', sentenceKo: '이거 너무 비싸. 내 말은, 우리 예산을 넘어선다는 소리야.' },
  { id: 'f4', en: 'Kind of', ko: '약간, 일종의', usage: '단정 지어 결론내기 어렵거나 완충적인 태도를 표현할 때 쓰며 주저하는 뉘앙스에 좋습니다.', sentenceEn: 'It is kind of cold in here, don’t you think?', sentenceKo: '여기 좀 추운 것 같지 않아?' },
  { id: 'f5', en: 'Like', ko: '약간... 음...', usage: '젊은 원어민들이 대화 사이사이에 단어를 고를 때 빈번하게 삽입하는 필수 필러입니다.', sentenceEn: 'I was like, so surprised to see him.', sentenceKo: '그 사람 보고 진짜, 그러니까, 엄청 기겁했잖아.' }
];

export const OFFLINE_EXPRS: Record<string, StudyExpr[]> = {
  '여행': [
    { id: 'e1', en: 'Can I get a glass of water?', ko: '물 한 잔 받을 수 있을까요?', situation: '식당이나 기내에서 요구사항을 자연스럽게 전달할 때', alternative: 'Give me water (X) -> Can I get ~ (O)' },
    { id: 'e2', en: 'Where is the nearest restroom?', ko: '가장 가까운 화장실은 어디인가요?', situation: '초조하게 화장실 위치를 찾아 헤매는 비상 상황일 때', alternative: 'Restroom location (X) -> Where is the nearest restroom? (O)' },
    { id: 'e3', en: 'Could you keep my bags here?', ko: '제 가방을 여기에 보관해 주실 수 있나요?', situation: '호텔 체크아웃 후 여행 전에 짐 보관을 요청할 때', alternative: 'Luggage storage please (X) -> Could you keep my bags here? (O)' }
  ],
  '직장·이직': [
    { id: 'e11', en: 'Let’s stay in touch.', ko: '앞으로도 계속 긴밀히 교류하며 기회를 봐요.', situation: '이직이나 면접 퇴실 후 면접관 또는 동료와 네트워킹을 매조지할 때', alternative: 'Write letter to me (X) -> Let’s stay in touch. (O)' },
    { id: 'e12', en: 'I will look into it right away.', ko: '해당 요청사항 즉시 검토한 후 피드백 드리겠습니다.', situation: '업무 중 예상치 못한 버그나 리포트 요청에 신뢰감을 주어 응대할 때', alternative: 'I don’t know, I will study (X) -> I will look into it. (O)' },
    { id: 'e13', en: 'Could we reschedule our call?', ko: '저희 통화/미팅 시간을 변경할 수 있을까요?', situation: '급한 선약이 생겨 상대방과의 전화나 미팅 일정을 예의 바르게 미룰 때', alternative: 'Cancel call (X) -> Could we reschedule our call? (O)' }
  ],
  '일상': [
    { id: 'e21', en: 'What do you feel like eating today?', ko: '오늘 혹시 어떤 종류의 음식이 땡기니?', situation: '퇴근 후 저녁 식사 조율 등 가벼운 식욕 선택을 질문할 때', alternative: 'What menu choose? (X) -> What do you feel like eating? (O)' },
    { id: 'e22', en: 'How has your day been so far?', ko: '오늘 하루 지금까지 어떻게 보내고 있었어?', situation: '대화를 기분 좋게 시작하는 가장 대표적인 스몰토크 오프닝', alternative: 'Are you happy today? (X) -> How has your day been so far? (O)' },
    { id: 'e23', en: 'That makes two of us.', ko: '내 말이! 나도 완전히 공감해.', situation: '상대방의 의견이나 처지에 대해 강한 유대감과 위트 있는 동의를 표할 때', alternative: 'I am same (X) -> That makes two of us. (O)' }
  ]
};
