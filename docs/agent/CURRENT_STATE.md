# Current State

Last Updated: 2026-08-26
Project Version: 0.1.0
Harness Protocol: project-initializing_260712.md (schema 1.1)

## Current Objective

T-1: Supabase 연결 + DB 첫 적용 (L3). Harness 도입은 완료(PLAN-20260826-001).

## Current Status

- **동작함**: 코드 전체 — tsc·eslint·vitest(197)·next build 전부 exit 0 (2026-08-26).
  Supabase 없이 샘플 데이터 폴백으로 dev가 뜬다.
- **한 번도 안 됨**: DB 적용(SQL 체인 미검증, `db/README.md` ⚠), Playwright(e2e·visual,
  VIC 기준 스펙), Vercel 배포, 라이브 배지 실동작.
- **확정 반영(2026-08-26)**: 기념일=생일(7/24)뿐, D+ 기준 2008-11-01 임시 (ADR-0008 Accepted).
- **정리됨(M1, 커밋 6dc3aff)**: 죽은 크론(vercel.json·workflow), middleware matcher
  VIC 이름, 죽은 vi.mock, package-lock name, `SOOP_BJ_ID=ecvhao`.

## Active Work

없음. 직전: PLAN-20260826-001 완료(`plans/completed/`) — M1 6dc3aff, M2 516432a, M3 a0b966f.
CI 초록 확인 → BLOCKING 4건 MACHINE (BR-PUBLIC·CACHE·DESIGN·PAGING).

## Known Issues

### ISSUE-001 — DB SQL 체인 미검증
Status: Open · Evidence: `db/README.md` ⚠ 문단
VIC 64개 마이그레이션에서 축소 재작성 — 첫 적용 시 오류 가능. T-1의 본 작업.

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
- T-7(VOD 버튼): VOD 링크 출처 — 관리자 수동 입력 vs SOOP API 자동 (착수 전 결정)
- T-8(하트 티어): 왁굳형 시청자 규모 기준 임계값 — 사용자 숫자 필요

## Next Exact Steps

1. T-1: 사용자가 Supabase 프로젝트 생성 → `.env.local` → `db/README.md` 순서로 적용 → verify
2. T-3 메모(사양 확정 — ADR-0009, 남은 판단 3개는 구현 계획에서)
3. 이후: T-2 태그 / T-4 트래픽 / T-5 Playwright / T-6 브랜딩 / T-7 VOD 버튼 / T-8 하트 티어

## Last Verified

- `npx tsc --noEmit` → PASS · `npx eslint . --max-warnings=0` → PASS
- `npx vitest run` → PASS 197/197 · `npx next build` → PASS (exit 0)
- date: 2026-08-26 (M1 직후)
