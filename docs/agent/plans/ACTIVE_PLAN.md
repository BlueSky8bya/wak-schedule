# Active ExecPlan

Plan ID: PLAN-20260826-001
Status: In Progress
Task Risk: L2
Created: 2026-08-26
Updated: 2026-08-26
Protocol: project-initializing_260712.md (schema 1.1)

## Objective

이 저장소에 WHITEHAVEN Agent Harness를 **도입**한다(MODE B — Harness Introduction).
기존 코드를 재구성하지 않는다. 도중에 발견된 VIC 잔재 중 **동작에 영향을 주는 것**만 함께 정리한다.

## Verifiable End State

- `docs/agent/**`가 존재하고 내부 링크가 전부 실재 경로를 가리킨다.
- `agent-harness.yaml`에 protocol provenance와 BLOCKING 규칙 10개가 `MACHINE` 또는 `UNENFORCED`로 분류돼 있다.
- 직전 세션의 되돌리기 비싼 결정 8건(D-1~D-8)이 ADR로 존재한다.
- 배포해도 죽은 크론이 404를 내지 않고, 시청자 라이브 폴링이 미들웨어에서 GoTrue를 왕복하지 않는다.
- `tsc` · `eslint` · `vitest` · `next build` 넷 다 exit 0.

## Scope

- `docs/agent/**` 신규 생성
- 루트 `AGENTS.md` 신규, `CLAUDE.md`는 라우팅만 추가(기존 규칙 본문 유지)
- `NEXT_SESSION.md` → `docs/agent/handoffs/`로 정규화 이관
- VIC 잔재 중 **동작에 영향 있는 것**: `vercel.json` 크론, `.github/workflows/broadcast-poll.yml`, `middleware.ts` matcher
- VIC 잔재 중 **얕은 문자열**: `package-lock.json` name, `tests/visual/poster.spec.ts` 라우트 스텁, 죽은 vi.mock
- `.env.example`의 `SOOP_BJ_ID` 채우기
- `.github/workflows/ci.yml` 신규(BLOCKING 4건을 MACHINE으로 승격)

## Out of Scope

- T-1 Supabase 연결·DB 적용 (별도 L3 계획)
- T-2 태그 재설계 / T-3 그 달 메모 / T-4 트래픽 실측 / T-5 Playwright / T-6 팔레트·기념일
- `docs/deployment.md` 재작성 — T-1과 함께 (거기 적힌 env가 이 프로젝트에 없는 것 다수)
- 기존 코드 리팩터링, 폴더 구조 변경

## Relevant Context

- `CLAUDE.md` — 절대 규칙 6개, 이 프로젝트에 **없는** 기능 목록
- `.claude/rules/{export,public-private-boundary}.md`
- `db/README.md` — 축소 데이터 모델, SQL 체인 미적용 경고
- `tests/README.md` — Playwright 미정비 사유
- `git log` 커밋 4개 — 축소 사유가 본문에 있음
- `NEXT_SESSION.md` — 직전 세션 인수인계(이 계획의 입력)

## Assumptions

| Assumption | Impact | Evidence | Status |
|---|---|---|---|
| `npm test` 192개 통과가 현재 사실 | High | `npx vitest run` exit 0, 2026-08-26 재실행 | Confirmed |
| `/api/cron/broadcast-poll` 라우트가 없다 | High | `next build` 라우트 목록에 없음, `app/api/cron` 디렉터리 없음 | Confirmed |
| 시청자가 `/api/live`를 25초마다 폴링한다 | High | `components/poster/use-live.ts:19,29` | Confirmed |
| `api/soop-live`·`api/presence` 라우트가 없다 | High | `find app/api -type d` | Confirmed |
| 우왁굳 SOOP BJ 아이디 = `ecvhao` | Medium | 사용자 진술(2026-08-26) | Confirmed (사용자) |
| 기념일 날짜 출처가 위키 | Medium | 직전 세션 진술 | Open — D-8 ADR은 Proposed로 둔다 |

## Ambiguity Register

| ID | Question | Materiality | Resolution |
|---|---|---|---|
| A-01 | 작업 순서 | Critical | 잔재 정리 → Harness → T-1 (사용자 승인 2026-08-26) |
| A-02 | Risk Profile 범위 | Critical | GENERAL·AUTH·SECURITY·PRIVACY·DESTRUCTIVE_DATA 활성, PRODUCTION_INFRA는 첫 배포 트리거 (사용자 승인) |
| A-03 | BLOCKING 강제 장치 | Critical | GitHub Actions CI 추가 (사용자 승인) |
| A-04 | 개인 도구(caveman 스킬·copilot-instructions)를 저장소에 계속 둘지 | Low | 미해결 — Harness에 기록만 하고 건드리지 않는다 |
| A-05 | T-3 '그 달 메모'가 공개인지 관리자 전용인지 | Critical (T-3) | 미해결 — T-3 착수 전 ADR 필요. 이 계획 범위 밖 |

## Plan Reversal Log

| ID | Previous Plan / Assumption | New Evidence | Invalidated Scope | Replacement Plan | Preserved Work |
|---|---|---|---|---|---|
| PR-01 | `NEXT_SESSION.md` §3-3: 공개 경계·캐시·토큰·페이지네이션 4건이 "이미 vitest로 기계 강제 중" | `.claude/settings.json`={} (훅 0), `.github/workflows/`에 테스트 CI 없음, pre-commit 훅 없음 → 테스트 파일은 있으나 자동 트리거 부재 | 그 4건을 `MACHINE`으로 등록하려던 계획 | 초기 등록은 전부 `UNENFORCED`. M3에서 `ci.yml`을 추가하고 실행 확인된 뒤에만 4건을 `MACHINE`으로 승격 | 테스트 파일 자체는 그대로 유효 |

## Milestones

### M1 — VIC 잔재 정리 (동작 영향)

Goal: 배포·트래픽에 실제로 해를 끼치는 잔재 제거.

Files:
- `vercel.json` — 존재하지 않는 `/api/cron/broadcast-poll` 크론 제거
- `.github/workflows/broadcast-poll.yml` — 삭제(대상 라우트 없음, VIC 도메인 하드코딩)
- `middleware.ts` — matcher 제외 목록의 죽은 이름(`api/soop-live`·`api/presence`)을 실제 `api/live`로 교체
- `tests/unit/middleware-matcher.test.ts` — 신규 회귀 테스트
- `tests/unit/public-cache-revalidate.test.ts` — 없는 모듈 vi.mock 제거
- `tests/visual/poster.spec.ts` — `**/api/soop-live` → `**/api/live`
- `package-lock.json` — name `vic-schedule-studio` → `wak-schedule`
- `.env.example` — `SOOP_BJ_ID=ecvhao`

Why (핵심): 시청자마다 25초 폴링이 미들웨어를 통과하며 `supabase.auth.getUser()`를 왕복한다.
동접 20,000이면 초당 약 800건의 GoTrue 호출이 **아무도 읽지 않는** 사용자 조회에 쓰인다.
`api/public`은 이미 제외돼 있으나 `api/live`는 빠져 있다.

Validation: `npx tsc --noEmit` · `npx eslint . --max-warnings=0` · `npx vitest run` · `npx next build` (전부 exit 0)

Rollback: 이 마일스톤의 커밋 하나를 `git revert`

Status: In Progress

### M2 — Harness 생성

Goal: 저장소가 기억 장치가 된다.

Files:
- `agent-harness.yaml`
- `docs/agent/CONSTITUTION.md` · `CURRENT_STATE.md` · `PROJECT_MAP.md` · `RISK_PROFILE.md` · `DEFINITION_OF_DONE.md` · `CHANGELOG_AGENT.md` · `DECISION_INDEX.md`
- `docs/agent/decisions/ADR-0001..0008` (D-1~D-8 백필. D-8은 Proposed)
- `docs/agent/handoffs/2026-08-26_1530_초기이식.md` (`NEXT_SESSION.md` 정규화 이관 후 원본 삭제)
- 루트 `AGENTS.md` 신규
- `CLAUDE.md` — 라우팅 6줄 추가(기존 규칙 본문은 그대로)
- `docs/sop.md` → `docs/agent/archive/2026-08/` (374줄 중 91곳이 VIC. Constitution이 대체)

Validation: 문서 내 상대 링크가 전부 실재 경로인지 확인 + 위 4개 명령 재통과

Rollback: `docs/agent/` 삭제 + `AGENTS.md` 삭제 + `CLAUDE.md`·`docs/sop.md` 되돌리기

Status: Pending

### M3 — CI로 BLOCKING 4건 MACHINE 승격

Goal: 문서로만 있던 규칙에 실제 강제 장치를 붙인다.

Files:
- `.github/workflows/ci.yml` — push/PR에서 typecheck · lint · test · build
- `agent-harness.yaml` — 실행 확인된 규칙만 `UNENFORCED` → `MACHINE`으로 변경

⚠ 정직성 게이트: GitHub Actions에서 **초록 실행을 확인하기 전에는** `MACHINE`으로 올리지 않는다.
푸시 후 실행 결과는 `INDIRECT`(에이전트가 `gh run list`로 확인) 또는 `DELEGATED`(사용자 확인).

Validation: `gh run list --workflow=ci.yml` 최신 실행이 success

Rollback: `ci.yml` 삭제 + manifest의 4건을 `UNENFORCED`로 환원

Status: Pending

## Final Acceptance Criteria

- [ ] M1 4개 명령 통과
- [ ] `/api/live`가 미들웨어 matcher에서 제외되고 회귀 테스트가 그것을 검사한다
- [ ] 죽은 크론 참조가 저장소에 없다
- [ ] Harness 필수 문서 8종 존재
- [ ] ADR 8건 존재, `DECISION_INDEX.md`에서 찾을 수 있다
- [ ] BLOCKING 규칙 10건이 전부 `MACHINE` 또는 `UNENFORCED`로 분류됨(`UNKNOWN` 없음)
- [ ] `DEFINITION_OF_DONE.md`에 Verification Capability Boundary 표가 있다
- [ ] `NEXT_SESSION.md`가 handoff로 이관되고 루트에서 사라졌다
- [ ] provenance 3줄이 `agent-harness.yaml`에 있다

## Validation Commands

```text
npx tsc --noEmit
npx eslint . --max-warnings=0
npx vitest run
npx next build          # exit code 확인 — tail만 보지 말 것
```

## Rollback Strategy

마일스톤당 커밋 1개. 되돌릴 때는 해당 커밋만 `git revert`.
M1은 코드 변경이라 revert 시 즉시 원복. M2는 신규 파일 위주라 삭제로 원복.
파괴적 명령(`reset --hard`·`clean -fd`·force push)은 쓰지 않는다.

## Progress Log

### 2026-08-26 — 조사·승인

- 저장소 read-only 조사 완료. `tsc`/`eslint`/`vitest`(192)/`next build` 전부 exit 0 재확인.
- Discovery Notes 정정 7건 보고. 그중 C-1(죽은 크론)·C-2(middleware GoTrue)가 배포 영향.
- 사용자 승인: 순서(A-01), Risk Profile(A-02), CI 강제(A-03).
- PR-01 기록: BLOCKING 4건은 강제 장치 없음 — 초기 등록 전부 `UNENFORCED`.
- SOOP BJ 아이디 `ecvhao` 수령.
