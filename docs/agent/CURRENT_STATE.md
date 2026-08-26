# Current State

Last Updated: 2026-08-26
Project Version: 0.1.0
Harness Protocol: project-initializing_260712.md (schema 1.1)

## Current Objective

T-3 메모·월별 인사이트·관리 버튼 2개·포스터 아바타 제거 완료(PLAN-20260826-004).
다음 후보: T-7 VOD 버튼(ADR-0010) / T-4 트래픽 점검 / T-5 Playwright / T-8 하트 티어.
대기: 인사이트 모달 실클릭 확인(사용자, owner 로그인).

## Current Status

- **동작함**: 코드 전체 — tsc·eslint·vitest(197)·next build 전부 exit 0 (2026-08-26).
  Supabase 없이 샘플 데이터 폴백으로 dev가 뜬다.
- **한 번도 안 됨**: Playwright(e2e·visual, VIC 기준 스펙), 라이브 배지 실동작(방송 중 확인 필요).
- **배포됨(2026-08-26)**: https://wak-schedule.vercel.app — 실 DB 응답·CDN 캐시 확인.
  main push = 자동 배포(PRODUCTION_INFRA 활성). 남은 설정: Supabase Site URL/Redirect에
  프로덕션 도메인 추가 + NEXT_PUBLIC_SITE_URL env(사용자) — 없으면 프로덕션 로그인 불가.
- **적용됨(2026-08-26)**: DB 스키마 전 체인 — Supabase 서울, verify 통과 (ISSUE-001 해소).
- **확정 반영(2026-08-26)**: 기념일=생일(7/24)뿐, D+ 기준 2008-11-01 임시 (ADR-0008 Accepted).
- **정리됨(M1, 커밋 6dc3aff)**: 죽은 크론(vercel.json·workflow), middleware matcher
  VIC 이름, 죽은 vi.mock, package-lock name, `SOOP_BJ_ID=ecvhao`.

## Active Work

없음. 직전: PLAN-20260826-002(T-1) 완료. 그 전: PLAN-20260826-001 완료(`plans/completed/`) — M1 6dc3aff, M2 516432a, M3 a0b966f.
CI 초록 확인 → BLOCKING 4건 MACHINE (BR-PUBLIC·CACHE·DESIGN·PAGING).

## Known Issues

### ISSUE-001 — DB SQL 체인 미검증
Status: **Resolved 2026-08-26** · 실 Supabase 첫 적용 완료, 전 체인 멱등 재실행 오류 0.
잡은 버그 3건(시드 slug vic·verify-db 호스트·멱등 가드)은 CHANGELOG CHG-005/006.
캘린더 시드까지 완료(2026-08-26): calendars 1 · palette 13 · tags 10 · 샘플 events 3.
소유자 로그인 → 편집실 진입 확인(사용자). Google OAuth: 로컬(localhost:3000) 구성 완료 —
Vercel 배포 시 Site URL·Redirect 추가 필요.

### ISSUE-002 — Playwright 스펙이 VIC 기준
Status: Open · Evidence: `tests/README.md`
없는 기능을 검사. T-5에서 분류(살리기/지우기), 스냅샷 재촬영.

### ISSUE-003 — docs/ 산문에 VIC 흔적
Status: Open · Evidence: `docs/README.md` ⚠, deployment.md의 VIC 도메인·없는 env
`docs/sop.md`는 아카이브 예정(M2). `deployment.md`는 T-1과 함께 재작성.

### ISSUE-004 — 하트 집계가 캐시 밖 매 요청 읽기
Status: Open · Evidence: `public-loader`의 `loadLiveEventHeartCounts`
첫 병목 후보. 배포 후 실측 (T-4). ADR-0004 참조.

## Locked / Stable Areas

- `db/_vic-legacy/` — 적용 금지 (ADR-0007)
- 라이브 폴링 구조(서버 20초 캐시) — 깨는 코드 금지 (ADR-0004·0005)
- 공개 경계 import 규칙 (BR-PUBLIC-001)

## Open Decisions

- A-04: 개인 도구(caveman 스킬·copilot-instructions) 저장소 잔류 여부
- **소유자 계정**: wakmoolwon@gmail.com(왁굳형 추정, 미확인)을 사용자 결정으로
  OWNER_EMAIL에 **선등록**(2026-08-26, 주 소유자는 whiteheaven 유지 — 목록 첫 번째).
  해당 계정 **로그인 한 번이면 열람·편집·저장 전부 즉시 동작** — 로그인 콜백이 RLS
  공동 소유자 행을 자동 등록한다(CHG-20260826-008, `lib/auth/owner-sync.ts`).
  수동 0013 재실행 불필요(0013은 목록에서 뺀 계정 '제거' 동기화용으로만 남음).
  Vercel env에도 OWNER_EMAIL 동일 값 반영됨.
- ~~T-2(태그)~~ **완료(2026-08-26)**: 확정 30개(콘텐츠 대분류 12·세부 9·형식 9)
  DB 적용 — `db/seeds/0014_wak_tags.sql`, 폴백(sample-public-data)도 일치.
- T-7(VOD 버튼): **자동으로 확정** (ADR-0010) — 비공식 API 허용, 서버 캐시·조용한 실패.
- T-8(하트 티어): **1차 보정 완료(2026-08-26)** — 실활동 모수 2,400(구독 4,800의 절반,
  사용자 지정) 기준 참여율 산출: 배지 최소 24(1%) / 🔥🔥 72(3%) / 🔥🔥🔥 192(8%) /
  👑 최소 48(2%). 실제 하트 분포가 쌓이면 ACTIVE_FAN_BASE·비율만 재보정(사용자 합의).

## Next Exact Steps

1. 사용자 프로덕션 검증 대기: 보안 탭(초기 비번 0724 변경)·메모 계정별 분리·
   '이 달 기록' 4파트(방송 시간은 다음 방송부터 쌓임)·색 밸런스.
2. 색: 전면 리팔레트('왁물원 피크닉', 리서치 문서)는 **보류** — 사용자가 택하면
   P1(바탕·표면)만 별도 계획으로(ADR-0013). P0 4종은 완료.
3. 백로그: T-7 VOD 버튼(ADR-0010) / T-8 하트 티어(구독 4,800 기준) / T-5 Playwright 정비 /
   T-4 하트 집계 실측 / ADR-0008 D+ 일자 확정 / 왁굳형 실계정 확정 시 OWNER_EMAIL 추가.

## Last Verified

- `npx tsc --noEmit` → PASS · `npx eslint . --max-warnings=0` → PASS
- `npx vitest run` → PASS 215/215 · `npx next build` → PASS (exit 0)
- 픽스처 스크린샷(웹 1600·모바일 390) — 색 부채 P0 후 렌더 동일 확인
- date: 2026-08-26 (색 부채 P0 완료 직후)
