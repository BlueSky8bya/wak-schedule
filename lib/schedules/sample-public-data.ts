// 공개 전용 샘플 데이터 — Supabase 미설정 환경의 공개 포스터/공개 API 폴백.
//
// 공개 경계(.claude/rules/public-private-boundary.md): 이 파일에는 **공개해도 안전한 데이터만** 둔다
// (일정 공개 필드·태그·팔레트·공개 업도움·공개 스티커·시청자 제안). privateMeta·엠바고/작업 일정·
// requests(요청 payload)·viewerModePreview 같은 스튜디오 전용/비공개 데이터는 절대 넣지 않는다.
// studio 샘플(`sample-data.ts`)이 이 파일을 import해 비공개 필드를 얹어 확장한다(역방향 import 금지).

import type {
  BroadcastTag,
  CalendarMeta,
  ColorPaletteEntry,
  PublicSchedule,
  PublicScheduleEvent
} from "@/lib/domain/schedule-types";
import { PRODUCT_TIMEZONE } from "@/lib/domain/schedule-types";
import { CALENDAR_SLUG, POSTER_TITLE } from "@/lib/config/site";

// 명도·채도까지 흔들어 구분한 색 (DB seed 0010_distinct_palette_v3.sql와 동일). 색은 공개 데이터.
export const defaultPalette: ColorPaletteEntry[] = [
  { key: "gray", name: "회색", bgColor: "#cdd2da", textColor: "#2b2f38", borderColor: "#9aa0ab", sortOrder: 1 },
  { key: "red", name: "빨강", bgColor: "#d11a2a", textColor: "#ffffff", borderColor: "#a8121f", sortOrder: 2 },
  { key: "orange", name: "주황", bgColor: "#f5a623", textColor: "#5a3300", borderColor: "#d6760c", sortOrder: 3 },
  { key: "yellow", name: "노랑", bgColor: "#ffe14d", textColor: "#5f4a00", borderColor: "#e3bf17", sortOrder: 4 },
  { key: "lime", name: "초록", bgColor: "#4e9e2f", textColor: "#ffffff", borderColor: "#3a7a1f", sortOrder: 5 },
  { key: "mint", name: "민트", bgColor: "#9fe8c4", textColor: "#0c4a32", borderColor: "#5cc497", sortOrder: 6 },
  { key: "teal", name: "청록", bgColor: "#0e8a80", textColor: "#ffffff", borderColor: "#0a625c", sortOrder: 7 },
  { key: "sky", name: "하늘", bgColor: "#a9dbf5", textColor: "#08405a", borderColor: "#5cb6e0", sortOrder: 8 },
  { key: "blue", name: "파랑", bgColor: "#2f63d6", textColor: "#ffffff", borderColor: "#1f49a8", sortOrder: 9 },
  { key: "indigo", name: "남색", bgColor: "#5a44c2", textColor: "#ffffff", borderColor: "#4131a0", sortOrder: 10 },
  { key: "lavender", name: "보라", bgColor: "#d8bdf2", textColor: "#43176b", borderColor: "#b78fe0", sortOrder: 11 },
  { key: "pink", name: "분홍", bgColor: "#ee5aa3", textColor: "#ffffff", borderColor: "#d63b89", sortOrder: 12 },
  { key: "beige", name: "갈색", bgColor: "#a9794a", textColor: "#ffffff", borderColor: "#885d33", sortOrder: 13 },
  { key: "silver", name: "은색", bgColor: "#6b7682", textColor: "#ffffff", borderColor: "#4b535c", sortOrder: 14 }
];

// 폴백 태그 — 사용자 확정 분류(2026-08-26, docs/tags/wak-tags-draft-2026-08.md)의 축약판.
// 정본은 DB(db/seeds/0014_wak_tags.sql). 이 배열은 Supabase 미설정 폴백에서만 쓰인다 —
// 대분류 12 + 대표 세부·형식 몇 개만 담아 화면 구성이 실 데이터와 같은 모양이 되게 한다.
const contentParents = [
  { id: "tag-dayoff", tagKey: "dayoff", displayName: "휴뱅", colorKey: "gray", sortOrder: 1 },
  { id: "tag-isedol", tagKey: "isedol", displayName: "이세돌", colorKey: "pink", sortOrder: 2 },
  { id: "tag-gomem", tagKey: "gomem", displayName: "고멤", colorKey: "lavender", sortOrder: 3 },
  { id: "tag-club", tagKey: "club", displayName: "동아리", colorKey: "lime", sortOrder: 4 },
  { id: "tag-wakmoolwon", tagKey: "wakmoolwon", displayName: "왁물원", colorKey: "beige", sortOrder: 5 },
  { id: "tag-vrchat", tagKey: "vrchat", displayName: "VR챗", colorKey: "sky", sortOrder: 6 },
  { id: "tag-cinety", tagKey: "cinety", displayName: "시네티", colorKey: "indigo", sortOrder: 7 },
  { id: "tag-jogong", tagKey: "jogong", displayName: "조공", colorKey: "red", sortOrder: 8 },
  { id: "tag-server", tagKey: "server", displayName: "대형서버", colorKey: "blue", sortOrder: 9 },
  { id: "tag-game", tagKey: "game", displayName: "게임", colorKey: "yellow", sortOrder: 10 },
  { id: "tag-etc", tagKey: "etc", displayName: "기타", colorKey: "teal", sortOrder: 12 }
].map((t) => ({ ...t, isDefault: true, isActive: true, parentId: null, kind: "content" as const }));

const contentChildren = [
  { id: "tag-minecraft", tagKey: "minecraft", displayName: "마인크래프트", colorKey: "yellow", sortOrder: 25, parentId: "tag-game" },
  { id: "tag-lol", tagKey: "lol", displayName: "롤", colorKey: "yellow", sortOrder: 26, parentId: "tag-game" },
  { id: "tag-wakchidong", tagKey: "wakchidong", displayName: "왁치동", colorKey: "lime", sortOrder: 22, parentId: "tag-club" }
].map((t) => ({ ...t, isDefault: true, isActive: true, kind: "content" as const }));

const modifierTags = [
  { id: "tag-hapbang", tagKey: "hapbang", displayName: "합방", colorKey: "mint", sortOrder: 41 },
  { id: "tag-sicham", tagKey: "sicham", displayName: "시참", colorKey: "sky", sortOrder: 44 },
  { id: "tag-janjan", tagKey: "janjan", displayName: "잔잔뱅", colorKey: "teal", sortOrder: 47 }
].map((t) => ({ ...t, isDefault: true, isActive: true, parentId: null, kind: "modifier" as const }));

export const defaultTags: BroadcastTag[] = [...contentParents, ...contentChildren, ...modifierTags];

// 공개 캘린더 메타(슬러그·표시 이름 등 — 전부 공개). studio 샘플도 이걸 그대로 쓴다.
export const publicCalendarMeta: CalendarMeta = {
  slug: CALENDAR_SLUG,
  displayName: POSTER_TITLE,
  title: POSTER_TITLE,
  timezone: PRODUCT_TIMEZONE,
  defaultYear: 2026,
  defaultMonth: 6,
  publicMemo: "",
  posterTheme: "none"
};

// (P2-PROTO-1: sampleProposals 제거 — 가짜 공개 API의 원천이었다.)

// 공개 일정(공개 범위·비-draft만). privateMeta·엠바고/작업 일정은 여기 없다. PublicScheduleEvent 형태
// 그대로(= 예전 public-loader의 toPublicEvent 산출물과 동일). isTentative는 공개해도 안전한 상태값.
const publicEvents: PublicScheduleEvent[] = [
  {
    id: "evt-001",
    startsAt: "2026-06-01T20:00:00+09:00",
    endsAt: "2026-06-01T23:00:00+09:00",
    isAllDay: false,
    isTentative: false,
    publicTitle: "종합게임",
    publicDescription: "6월 첫 방송",
    status: "scheduled",
    visibilityScope: "public",
    category: "stream",
    tagIds: ["tag-game"],
    primaryTagIds: ["tag-game"],
    sortOrder: 1
  },
  {
    id: "evt-002",
    startsAt: "2026-06-04T20:00:00+09:00",
    endsAt: "2026-06-04T23:00:00+09:00",
    isAllDay: false,
    isTentative: false,
    publicTitle: "합방\n마크 서버",
    status: "scheduled",
    visibilityScope: "public",
    category: "collab",
    tagIds: ["tag-minecraft", "tag-hapbang"],
    primaryTagIds: ["tag-minecraft"],
    sortOrder: 1
  },
  {
    id: "evt-003",
    startsAt: "2026-06-07T00:00:00+09:00",
    isAllDay: true,
    isTentative: false,
    publicTitle: "휴방",
    status: "scheduled",
    visibilityScope: "public",
    category: "dayoff",
    tagIds: ["tag-dayoff"],
    primaryTagIds: ["tag-dayoff"],
    sortOrder: 1
  },
  {
    id: "evt-004",
    startsAt: "2026-06-15T20:00:00+09:00",
    endsAt: "2026-06-15T23:00:00+09:00",
    isAllDay: false,
    isTentative: true,
    publicTitle: "시청자 참여",
    status: "scheduled",
    visibilityScope: "public",
    category: "stream",
    tagIds: ["tag-sicham"],
    primaryTagIds: ["tag-sicham"],
    sortOrder: 1
  },
  {
    id: "evt-005",
    startsAt: "2026-06-16T20:00:00+09:00",
    endsAt: "2026-06-16T23:30:00+09:00",
    isAllDay: false,
    isTentative: false,
    publicTitle: "소통방송\n밀린 이야기",
    status: "scheduled",
    visibilityScope: "public",
    category: "stream",
    tagIds: ["tag-etc"],
    primaryTagIds: ["tag-etc"],
    sortOrder: 1
  },
  {
    id: "evt-006",
    startsAt: "2026-06-25T20:00:00+09:00",
    endsAt: "2026-06-25T23:00:00+09:00",
    isAllDay: false,
    isTentative: false,
    publicTitle: "대회 리허설\n브래킷 점검",
    status: "scheduled",
    visibilityScope: "public",
    category: "stream",
    tagIds: ["tag-isedol"],
    primaryTagIds: ["tag-isedol"],
    sortOrder: 1
  }
];

// 완성된 공개 스케줄 폴백.
export const samplePublicScheduleData: PublicSchedule = {
  calendar: publicCalendarMeta,
  events: publicEvents,
  tags: defaultTags,
  palette: defaultPalette,
  heartCount: 0
};
