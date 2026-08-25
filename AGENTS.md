# Agent Entry Point — 우왁굳 일정표

This repository uses the WHITEHAVEN Agent Harness
(protocol: project-initializing_260712.md, schema 1.1 — see `agent-harness.yaml`).

코드를 수정하기 전에, 순서대로:

1. `docs/agent/CONSTITUTION.md` — 불변 원칙
2. `docs/agent/CURRENT_STATE.md` — 지금 어디까지 왔나
3. `docs/agent/PROJECT_MAP.md` — 작업 대상 경로 찾기
4. 대상 폴더의 README / `.claude/rules/*` 중 해당 규칙
5. 관련 Accepted ADR (`docs/agent/DECISION_INDEX.md`)
6. L2/L3 작업이면 `docs/agent/plans/ACTIVE_PLAN.md` 먼저 작성/갱신

Non-negotiables:

- 질문 전에 저장소 먼저 조사한다.
- 구조적·고위험 변경은 중요 모호성 해소 후에.
- 최소 변경. 요청 밖 리팩터링 금지.
- 사용자 uncommitted 변경 보존.
- Accepted ADR을 조용히 뒤집지 않는다 (Supersede 절차).
- 실행하지 않은 검증을 성공이라 말하지 않는다. `next build`는 exit code 확인.
- material 결정은 같은 턴에 저장소에 기록한다.
- BLOCKING 규칙(`agent-harness.yaml`)은 MACHINE 확인 전엔 UNENFORCED로 취급.
- 문서가 낡으면 코드와 같은 변경에서 갱신한다.
- 파괴적 Git/DB 명령은 명시적 승인 없이 금지.

검증 게이트: `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` (전부 exit 0).
