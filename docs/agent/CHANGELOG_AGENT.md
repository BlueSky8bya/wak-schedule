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

### CHG-20260826-007 — FEAT — 태그 확정 시드 + 소유자 선등록 (T-2)

Change: 사용자 확정 분류(콘텐츠 12+세부 9+형식 9=30)를 0014 시드로 DB 적용,
플레이스홀더 9개 제거(dayoff 재사용). 폴백 defaultTags 동기화(샘플 일정 태그 재매핑,
modifier는 primary 불가 원칙 적용). OWNER_EMAIL에 wakmoolwon 선등록(주 소유자는
whiteheaven 유지). wakmoolwon 첫 로그인 후 0013 재실행 필요(RLS 공동 소유자).
Files: `db/seeds/0014_wak_tags.sql`, `lib/schedules/sample-public-data.ts`
Related: docs/tags/wak-tags-draft-2026-08.md (확정), PLAN-20260826-003

### CHG-20260826-008 — FEAT — OWNER_EMAIL 계정 로그인 시 공동 소유자 자동 등록

Problem: RLS는 auth.users UUID 기준이라 이메일만으로 미리 권한을 줄 수 없고, 첫
로그인 후 seeds/0013을 수동 재실행해야 저장이 됐다 — "왁굳형이 로그인 한 번에 다
되게" 하려는 조공 시나리오와 어긋남. 덤: 콜백이 VIC 잔재 unlock_sessions(없는
테이블)를 매 로그인 쿼리하고 있었다.
Change: 로그인 콜백에서 OWNER_EMAIL 매칭 시 calendar_co_owners upsert(멱등,
실패해도 로그인 안 막음). 신뢰 기준은 기존과 동일 — env 목록 하나. 제거 동기화는
0013 유지. unlock_sessions 죽은 쿼리 삭제.
Files: `lib/auth/owner-sync.ts`(신규), `app/(auth)/auth/callback/route.ts`,
`tests/unit/owner-auto-coowner.test.ts`(5개)
Validation: vitest 214, 게이트 4종 exit 0
Rollback: 커밋 revert (등록된 co_owners 행은 무해 — 0013이 정리 가능)

### CHG-20260826-009 — FIX — 사이트 이름·태그 2차 수정 (사용자 결정)

Change: 브라우저 탭 제목 "VIC Schedule Studio"(VIC 잔재) → SITE_NAME "Wak Schedule"
(site.ts 단일 출처에 상수 추가, layout.tsx는 참조만). 태그: 노가리 삭제,
서버→대형서버 — 시드·DB·폴백 3곳 동기화. site.ts 주석의 오기(VIC=우왁굳→빅토리) 정정.
Files: `lib/config/site.ts`, `app/layout.tsx`, `db/seeds/0014_wak_tags.sql`,
`lib/schedules/sample-public-data.ts`
Validation: DB 확인(대분류 11: …대형서버·게임·기타), 게이트 4종 exit 0
