(function () {
  const EVENT_META = {
    wedding: {
      label: "결혼식",
      badge: "💍 WEDDING",
      defaultTitle: "결혼식에 초대합니다",
      defaultGreeting:
        "두 사람이 서로의 삶을 약속하는 소중한 날,\n귀한 걸음으로 함께해 주시면 더없는 기쁨이겠습니다.",
      hostLabels: ["신랑", "신부"],
    },
    dol: {
      label: "돌잔치",
      badge: "🎂 FIRST BIRTHDAY",
      defaultTitle: "첫 돌잔치에 초대합니다",
      defaultGreeting:
        "우리 아이의 첫 번째 생일을 맞아 작은 잔치를 준비했습니다.\n함께 오셔서 축하해 주세요.",
      hostLabels: ["아이 이름", "보호자"],
    },
    house: {
      label: "집들이",
      badge: "🏡 HOUSEWARMING",
      defaultTitle: "집들이에 초대합니다",
      defaultGreeting:
        "새 보금자리에서 소중한 분들과 첫 식사를 함께하고 싶습니다.\n편하게 놀러 오세요.",
      hostLabels: ["호스트", "가족/동반"],
    },
    seventy: {
      label: "칠순/고희",
      badge: "🎊 CELEBRATION",
      defaultTitle: "칠순 잔치에 초대합니다",
      defaultGreeting:
        "감사한 마음으로 칠순 잔치를 마련했습니다.\n귀한 시간 내어 함께 축복해 주시면 감사하겠습니다.",
      hostLabels: ["주인공", "자녀 대표"],
    },
    pre: {
      label: "결혼전모임",
      badge: "🥂 PRE-WEDDING",
      defaultTitle: "결혼 전 모임에 초대합니다",
      defaultGreeting:
        "본식 전에 편하게 인사 나누는 자리를 준비했습니다.\n가볍게 오셔서 즐겁게 함께해 주세요.",
      hostLabels: ["주최자", "동반자"],
    },
  };

  const TEMPLATE_LIBRARY = {
    wedding: [
      { id: "wedding-1", name: "블러썸 클래식", desc: "플로럴 로맨틱", image: "/assets/bg/wedding1.jpg", accent: "#c86c93" },
      { id: "wedding-2", name: "모던 세리머니", desc: "깔끔한 모던", image: "/assets/bg/wedding2.jpg", accent: "#7b8ac9" },
      { id: "wedding-3", name: "가든 라이트", desc: "자연광 무드", image: "/assets/bg/wedding3.jpg", accent: "#6aa27a" },
      { id: "wedding-4", name: "화이트 릴리", desc: "프리미엄 화이트", image: "/assets/bg/wedding4.jpg", accent: "#8f7cd7" },
      { id: "wedding-5", name: "캐릭터 세리머니", desc: "일러스트 포인트", image: "/assets/character/party-friends.svg", accent: "#f08a5d" },
    ],
    dol: [
      { id: "dol-1", name: "베이비 파티", desc: "사랑스러운 톤", image: "/assets/bg/dol1.jpg", accent: "#ff8fab" },
      { id: "dol-2", name: "캔디 포토", desc: "밝은 컬러감", image: "/assets/bg/dol2.jpg", accent: "#9b88f3" },
      { id: "dol-3", name: "소프트 데이", desc: "부드러운 배경", image: "/assets/bg/dol3.jpg", accent: "#4ca7c2" },
      { id: "dol-4", name: "러블리 리본", desc: "귀여운 감성", image: "/assets/bg/dol4.jpg", accent: "#f0768b" },
      { id: "dol-5", name: "캐릭터 페스타", desc: "일러스트 포인트", image: "/assets/character/party-friends.svg", accent: "#f59e0b" },
    ],
    house: [
      { id: "house-1", name: "뉴홈 내추럴", desc: "따뜻한 우드톤", image: "/assets/bg/house1.jpg", accent: "#9a6b4f" },
      { id: "house-2", name: "미니멀 리빙", desc: "모던 인테리어", image: "/assets/bg/house2.jpg", accent: "#5d7b8c" },
      { id: "house-3", name: "선셋 테라스", desc: "편안한 저녁", image: "/assets/bg/house3.jpg", accent: "#d97757" },
      { id: "house-4", name: "그린 하우스", desc: "플랜테리어 무드", image: "/assets/bg/house4.jpg", accent: "#5f9f71" },
      { id: "house-5", name: "캐릭터 홈파티", desc: "일러스트 포인트", image: "/assets/character/party-friends.svg", accent: "#6366f1" },
    ],
    seventy: [
      { id: "seventy-1", name: "감사의 날", desc: "격식 있는 분위기", image: "/assets/bg/seventy1.jpg", accent: "#b0843d" },
      { id: "seventy-2", name: "전통 모던", desc: "클래식 컬러", image: "/assets/bg/seventy2.jpg", accent: "#b45355" },
      { id: "seventy-3", name: "골드 세리머니", desc: "기념식 무드", image: "/assets/bg/seventy3.jpg", accent: "#8b6f47" },
      { id: "seventy-4", name: "패밀리 포트레이트", desc: "가족 중심", image: "/assets/bg/seventy4.jpg", accent: "#7c6ea7" },
      { id: "seventy-5", name: "캐릭터 축하연", desc: "일러스트 포인트", image: "/assets/character/party-friends.svg", accent: "#ef7d57" },
    ],
    pre: [
      { id: "pre-1", name: "브라이덜 나잇", desc: "트렌디 감성", image: "/assets/bg/pre1.jpg", accent: "#f06292" },
      { id: "pre-2", name: "친구들과 건배", desc: "캐주얼 무드", image: "/assets/bg/pre2.jpg", accent: "#5a67d8" },
      { id: "pre-3", name: "루프탑 밋업", desc: "도시 야경", image: "/assets/bg/pre3.jpg", accent: "#0ea5a3" },
      { id: "pre-4", name: "테이블 토크", desc: "스몰모임 스타일", image: "/assets/bg/pre4.jpg", accent: "#ef8354" },
      { id: "pre-5", name: "캐릭터 모임", desc: "일러스트 포인트", image: "/assets/character/party-friends.svg", accent: "#a855f7" },
    ],
  };

  window.InviteTemplates = {
    EVENT_META,
    TEMPLATE_LIBRARY,
  };
})();
