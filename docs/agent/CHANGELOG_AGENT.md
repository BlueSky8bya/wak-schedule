# Agent Change Log

## v0.1.0 — 2026-08-26

### CHG-20260826-001 — FIX — middleware matcher의 VIC 잔재 (M1, 커밋 6dc3aff)

Problem: matcher 제외 목록이 존재하지 않는 라우트(api/soop-live·api/presence)를
막고, 실제 시청자 폴링 대상 /api/live는 통과시켰다. 폴링(25초)마다
supabase.auth.getUser()가 GoTrue를 왕복 — 동접 20,000이면 초당 ~800건.

Change: 제외 목록을 실재 라우트(api/live·api/public)로 교체.
Files: `middleware.ts`, `tests/unit/middleware-matcher.test.ts`(신규 — 죽은 이름
재유입도 검사, 옛 matcher로 되돌려 실패 2건 확인함)
Validation: vitest 197/197, build exit 0
Rollback: 커밋 6dc3aff revert
Related: ADR-0004

### CHG-20260826-002 — FIX — 죽은 크론 제거 (M1, 커밋 6dc3aff)

Problem: vercel.json과 GH 워크플로우가 존재하지 않는 /api/cron/broadcast-poll을
호출(배포 시 404 반복). 워크플로우는 VIC 도메인 하드코딩. 방송시간 추적은
ADR-0004로 제거된 기능.
Change: vercel.json 크론 삭제, `.github/workflows/broadcast-poll.yml` 삭제.
Rollback: 커밋 revert (재도입하려면 라우트부터 만들어야 한다)

### CHG-20260826-003 — CHORE — Harness 도입 (M2)

Change: `agent-harness.yaml`, `docs/agent/**` 생성, ADR-0001~0008 백필,
`NEXT_SESSION.md` → handoff 이관, `AGENTS.md` 신규, `docs/sop.md` 아카이브.
Rollback: M2 커밋 revert.

### CHG-20260826-004 — FIX — 기념일·D+ 사용자 확정 반영

Problem: 초안(fcde3c6)이 위키 추정 — 연례 표기 과다, D+ 기준이 숲 복귀일(2024)이라
방송 인생 전체를 못 셌다.
Change: STREAMER_ANNUAL=생일만, STREAMER_ONCE 비움, DEBUT_ISO=2008-11-01(일자 임시).
오늘 D+6508, 11-01=방송 N주년.
Files: `lib/calendar/holidays.ts`
Validation: tsc·eslint·vitest 197 PASS
Rollback: 이 커밋 revert
Related: ADR-0008 (Accepted)

### CHG-20260826-005 — FIX — verify-db pooler 호스트 하드코딩

Problem: aws-1 풀러 하드코딩 — 프로젝트가 aws-0 클러스터면 ENOTFOUND로 죽음(실측).
Change: apply-db와 같은 후보 폴백(aws-0→aws-1→직접연결).
Files: `scripts/verify-db.mjs`

### CHG-20260826-006 — FIX — SQL 멱등 계약 위반 수정 + 시드 slug 잔재

Problem: 첫 실 DB 적용(T-1)에서 ① 시드 9파일이 slug 'vic' 참조(캘린더 오생성/시드
no-op) ② 0001 재실행 시 "type event_status already exists" ③ 정책 파일 재실행 시
"policy ... already exists" — db/README의 "모든 파일 멱등" 계약 위반.
Change: 시드 slug 'wak'화 + `tests/unit/seed-slug.test.ts`(재유입 차단), 0001 enum
duplicate_object 가드 + create table if not exists, 정책 drop policy if exists 선행.
Validation: 전 체인 31/31 멱등 재실행 오류 0, verify-db 통과, vitest 208.
Files: `db/seeds/*.sql`, `db/migrations/0001_initial_schema.sql`,
`db/policies/{0001_rls,0003_event_tags}.sql`, `scripts/verify-db.mjs`
