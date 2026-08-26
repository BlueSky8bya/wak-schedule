// 사이트 정체성 단일 출처 — 스트리머 이름·달력 슬러그·스토리지 키 접두사.
//
// 왜 한곳에 모으나: 이 프로젝트는 VIC(빅토리) 스케줄 스튜디오에서 갈라져 나왔다. 원본은 슬러그
// "vic"과 스트리머 문자열, localStorage 키가 20여 곳에 하드코딩돼 있어, 다른
// 스트리머로 옮길 때마다 전수 치환이 필요했다. 여기 상수를 참조하면 그 작업이 이 파일 하나로 끝난다.
//
// ⚠ STORAGE_PREFIX를 바꾸면 기존 방문자의 localStorage/쿠키 설정(동작 줄이기·눈 편한 테마 등)이
// 초기화된다. 배포 후에는 바꾸지 말 것.

// DB `calendars.slug`. 공개 API 경로 /api/public/<slug>/* 의 <slug>이기도 하다.
export const CALENDAR_SLUG = process.env.NEXT_PUBLIC_CALENDAR_SLUG ?? "wak";

// 화면에 노출되는 스트리머 표기.
export const STREAMER_NAME = "우왁굳";

// 브라우저 탭/문서 메타데이터용 사이트 이름 (사용자 확정 2026-08-26).
export const SITE_NAME = "Wak Schedule";

// 제목 양옆 장식 이모지. 🌿 = 왁굳형 상징 계열(팬덤 유래의 '나무', 숲(SOOP), 왁물원,
// 페리도트 그린)을 잇는 잎사귀. 바꾸고 싶으면 여기 하나만 고친다(🌳·🍃·🐵 등).
export const TITLE_SPARK = "🌿";

// 포스터/스켈레톤/문서 제목. DB `calendars.title`이 있으면 그쪽이 우선이고, 이건 폴백·로딩 문구용.
export const POSTER_TITLE = `${STREAMER_NAME} 일정표`;

// localStorage/sessionStorage/쿠키 키 접두사. (예: `${STORAGE_PREFIX}.reduceMotion`)
export const STORAGE_PREFIX = "wak";
