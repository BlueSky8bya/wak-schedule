# 새 세션 이니셜 프롬프트

> `C:\Projects\wak-schedule`에서 Claude Code를 새로 열고,
> `project-initializing_260712.md`(WHITEHAVEN 프로토콜)를 **첨부한 뒤**
> 아래 `---` 사이 블록을 그대로 붙여넣는다.

---

이 저장소(`C:\Projects\wak-schedule`)는 스트리머 **우왁굳**님의 방송 일정 사이트다.
첨부한 `project-initializing_260712.md`를 초기화 프로토콜로 사용해라.

## 0. 모드 판정 — MODE B (Existing Project Without Harness)

코드는 이미 있고 **동작한다.** Agent Harness는 없다.

- 있는 것: `CLAUDE.md`(도구 어댑터 겸 규칙), `README.md`, `db/README.md`,
  `tests/README.md`, `docs/README.md`, `.claude/rules/*`
- 없는 것: `AGENTS.md`, `agent-harness.yaml`, `docs/agent/**`(CONSTITUTION ·
  CURRENT_STATE · PROJECT_MAP · RISK_PROFILE · DEFINITION_OF_DONE ·
  CHANGELOG_AGENT · decisions · handoffs)

따라서 **Harness Introduction**이다. 다음을 하지 마라:

- 기존 코드 재구성 · 대규모 리팩터링 · 폴더 구조 변경
- 초기화 명세에 맞추려고 기존 파일을 무작위 재배치
- 이미 통과 중인 검증(tsc/lint/build/vitest)을 깨는 변경

먼저 read-only로 저장소를 조사하고, **현재 코드에 Harness를 적응**시켜라.

## 1. 이미 확인된 사실 (Project Discovery Notes 씨앗)

아래는 직전 세션(2026-08-26)이 **실제로 실행해 확인한 것**이다.
프로토콜 §15에 따라 그대로 믿지 말고 재확인하되, 처음부터 다시 탐색하느라 턴을 낭비하지는 마라.

```text
Project Type:        Next.js 15 (App Router) web application
Stack:               React 19, TypeScript, Supabase(Postgres+RLS), Vercel
Package Manager:     npm
Git:                 clean, branch main, 커밋 3개
Remote:              https://github.com/BlueSky8bya/wak-schedule.git (푸시 완료)
Tests:               Vitest 192개 통과 / Playwright(e2e·visual) 미실행
Deployment:          Vercel 예정 (아직 배포 안 함)
Existing Agent Docs: CLAUDE.md, .claude/rules/{export,public-private-boundary}.md
Protocol Provenance: 없음 (이번에 기록해야 함)
```

**직접 실행해 통과 확인한 검증 (DIRECT):**

| 명령 | 결과 | 시점 |
|---|---|---|
| `npx tsc --noEmit` | PASS (오류 0) | 2026-08-26 |
| `npx eslint . --max-warnings=0` | PASS (경고 0) | 2026-08-26 |
| `npx next build` | PASS (exit 0) | 2026-08-26 |
| `npx vitest run` | PASS (192/192) | 2026-08-26 |

**실행하지 못한 것 — 완료로 취급하지 마라:**

| 항목 | 이유 | 현재 상태 |
|---|---|---|
| Playwright e2e·visual | dev 서버 + Supabase 없음. 스펙이 VIC 기준이라 없는 기능을 검사 | NOT RUN |
| DB 스키마 적용 | Supabase 프로젝트 없음 | NEVER APPLIED |
| 실제 브라우저 렌더 | 위와 동일 | NOT VERIFIED |
| 라이브 배지 동작 | `SOOP_BJ_ID`가 비어 있음 | NOT VERIFIED |

## 2. Project-Owned Evidence — 외부 조사보다 먼저 읽어라

프로토콜 §15(Project-Owned Evidence First)를 지켜라. 이 저장소는 다음 근거를 이미 갖고 있다.

| Path | Type | 왜 중요한가 |
|---|---|---|
| `CLAUDE.md` | 규칙 | "이 프로젝트의 정체" 절에 **여기 없는 기능 목록**이 있다 |
| `db/README.md` | 스키마 문서 | 축소된 데이터 모델과 미적용 경고 |
| `tests/README.md` | 검증 문서 | Playwright 미정비 사유 |
| `db/_vic-legacy/` | 참고 SQL | 제거된 기능의 원본 마이그레이션 (적용 금지) |
| `docs/` | 설계 문서 | 태그 분류 · 모션/햅틱 · 반응형 (본문에 VIC 흔적 남아 있음) |
| `git log` | 결정 근거 | 커밋 3개 본문에 **왜 그렇게 축소했는지**가 적혀 있다 |
| `C:\Projects\VIC Schedule studio` | 원본 저장소 | 갈라져 나온 곳. **읽기 전용 참고**, 수정 금지 |

## 3. 이번 세션의 첫 작업 — Harness 도입 (L2)

`ACTIVE_PLAN.md`를 먼저 쓰고 시작해라. 생성 순서는 프로토콜 §57을 따르되,
**이 프로젝트에 실제로 필요한 것만** 만든다.

### 3-1. Decision Write-Through 백필 (§1, §63.13)

직전 세션이 내린 아래 결정들은 **커밋 메시지와 CLAUDE.md 산문에만** 있다.
되돌리기 비싼 구조 결정이므로 ADR로 승격해라.
(이건 새 결정이 아니라 기존 결정의 기록화다 — 결정 자체를 다시 논쟁하지 마라.)

| # | 결정 | 되돌리기 비용 |
|---|---|---|
| D-1 | `visibility_scope` enum을 `'public'` 하나로 축소 → 비공개 행이 DB에 존재 불가 | 높음 (스키마+RLS+앱 전면) |
| D-2 | 역할을 owner / developer / viewer 셋으로 축소 (매니저·작업자 제거) | 높음 |
| D-3 | 꾸미기·스티커 전면 제거 | 높음 |
| D-4 | 방문/행동 로그·프레즌스·인사이트·성능 표본 DB기록 제거 (사유: 5k~20k 동접에서 요청당 쓰기가 병목) | 중간 |
| D-5 | 라이브 연동을 플랫폼 중립 어댑터로 (`LIVE_PROVIDER`, 기본 soop) | 중간 |
| D-6 | `lib/config/site.ts`를 이름·슬러그·키 접두사 단일 출처로 | 낮음 |
| D-7 | 제거 기능 마이그레이션을 삭제하지 않고 `db/_vic-legacy/`에 보관 | 낮음 |
| D-8 | D+ 기준일 = 숲 복귀 첫 방송 2024-02-04 (2008년 실제 시작일 미공개) | 낮음 |

D-8은 사실 정확도가 위키 출처다. 사용자 확인 전까지 `Proposed` 상태로 둬라.

### 3-2. Risk Profile 판정 (§13, §36 — 과적합 금지)

**후보만 제시한다. 네가 저장소를 보고 직접 판정해라.**
연구·의료 규칙은 이 프로젝트에 해당 없다. 만들지 마라(§63.10).

| Profile | 근거 후보 | 관련 경로 |
|---|---|---|
| GENERAL | 기본 | 전체 |
| AUTH | Google OAuth + 역할 게이팅 + `(studio)` 접근 가드 | `lib/auth/`, `app/(auth)/`, `middleware.ts` |
| SECURITY | 공개/비공개 경계, service-role 키, RLS | `lib/schedules/public-loader.ts`, `db/policies/` |
| PRIVACY | 소유자 이메일, 익명 하트 기기 토큰 | `lib/schedules/{heart,hope}-actions.ts` |
| DESTRUCTIVE_DATA | 수동 적용 마이그레이션, tombstone 삭제 | `db/migrations/`, `scripts/apply-db.mjs` |
| PRODUCTION_INFRA | Vercel 배포 (아직 미배포) | `vercel.json`, `next.config.ts` |

### 3-3. BLOCKING 규칙 정직성 (§12, §63.14)

`CLAUDE.md`의 "절대 규칙" 6개와 `.claude/rules/*`는 지금 **문서로만 존재한다.**
`BR-<AREA>-<NNN>` ID를 붙이고 `agent-harness.yaml`에서 각각을
`MACHINE`(실제 script/hook/CI 존재 + 활성 확인) 또는
`UNENFORCED`(manual gate · owner · evidence 기재)로 분류해라.

실제로 기계 강제되고 있는 것부터 확인해봐라 — 이미 vitest로 돌고 있다:

- 공개 경계 정적 검사 → `tests/unit/public-boundary.test.ts`
- 캐시 무효화 3줄 누락 → `tests/unit/public-cache-revalidate.test.ts`
- 디자인 토큰 하드코딩 → `tests/unit/apple-redesign-token-usage.test.ts`
- 페이지네이션 재구현 → `tests/unit/paginate.test.ts`
- 나머지(KST · 서버 권한 재검사 · DTO 명시 조립)는 현재 강제 장치 없음 → 정직하게 `UNENFORCED`

⚠ `.claude/settings.json`은 지금 `{}`(빈 설정)이다. VIC의 SessionStart/Stop 훅이
삭제된 스크립트를 가리켜서 비웠다. 훅을 새로 넣을지는 네가 판단하되,
**파일만 만들어 두고 `MACHINE`이라고 주장하지 마라.**
활성 상태를 확인하지 못하면 `UNENFORCED`로 내려라.

### 3-4. Verification Capability Boundary (§34)

`DEFINITION_OF_DONE.md`에 아래 구분을 반드시 넣어라.

| Criterion | Capability | Executor | 비고 |
|---|---|---|---|
| tsc / lint / build / vitest | DIRECT | Agent | 지금 환경에서 실행됨 |
| Playwright e2e · visual | INDIRECT | Agent + dev 서버 | Supabase 붙은 뒤 가능 |
| DB 스키마 적용 · RLS 동작 | DELEGATED | 사용자 (Supabase 계정) | 계정 접근 필요 |
| 실제 브라우저/모바일 체감 | DELEGATED | 사용자 | 기기·눈 필요 |
| 라이브 배지 실동작 | DELEGATED | 사용자 (BJ 아이디 + 실제 방송 중) | 외부 API |
| 기념일 날짜 정확성 | DELEGATED | 사용자 | 위키 출처, 팬 확인 필요 |

`IMPLEMENTED` / `AGENT-VERIFIED` / `EXTERNAL-VERIFICATION-PENDING` / `ACCEPTED`를
구분해서 보고해라.

### 3-5. Handoff 이관

이 파일(`NEXT_SESSION.md`)이 사실상 직전 세션의 Handoff Snapshot이다.
`docs/agent/handoffs/2026-08-26_1530_초기이식.md`로 정규화해 옮기고,
루트에는 `AGENTS.md`(Entry Point)를 새로 둬라. 옮긴 뒤 이 파일은 지워도 된다.

### 3-6. Provenance 기록

`agent-harness.yaml`에 반드시 남겨라.

```yaml
protocol_source: "project-initializing_260712.md"
protocol_date: "2026-07-12"
harness_schema_version: "1.1"
```

## 4. Harness 이후 — 남은 기능 작업

순서는 사용자와 상의해 정해라. 위험 등급은 제안이다.

### T-1. Supabase 연결 + DB 세우기 — **L3**

다른 모든 작업의 전제. 새 Supabase 프로젝트 생성 → `.env.example`을 `.env.local`로
복사해 채움 → `db/README.md` 순서대로 `node scripts/apply-db.mjs` →
`node scripts/verify-db.mjs`.

⚠ 이 SQL 체인은 **한 번도 실제 DB에 적용된 적이 없다.** VIC의 검증된 64개 마이그레이션에서
축소해 다시 쓴 것이라 오류가 날 수 있다. 나면 그게 첫 작업이다.
통과하면 `db/README.md`의 ⚠ 문단을 지워라.
DESTRUCTIVE_DATA 프로파일 대상 — dry-run · 롤백 경로를 먼저 확보해라.

### T-2. 태그를 우왁굳 콘텐츠로 재설계 — **L2**

현재 태그는 VIC 콘텐츠거나 직전 세션이 **임의로 추정해 넣은 플레이스홀더**다
(`lib/schedules/sample-public-data.ts`의 `defaultTags`, `db/seeds/`).
왁굳형 실제 콘텐츠를 사용자와 확정하고 2계층(대분류=색 보유 / 세부=부모 색 상속)으로
시드를 다시 써라.
참고: `docs/tags/tag-taxonomy-classification.md`, `docs/tags/tag-hierarchy-plan.md`.

### T-3. 아바타 자리 → "그 달 메모" — **L2, 공개 여부 결정 시 L3**

왁굳형은 버츄얼이 아니라 아바타 자리가 필요 없다. 지금 포스터/편집실에는 VIC에서
물려받은 아바타 자리(`avatarSlot` / `avatar-scene`, 화면 옆 약 1/4)가 그대로 있다.
그 자리에 **그 달 할 일을 마인드스토밍하는 메모**를 넣는다.

- 기존 자산부터 검토해라: `calendars.public_memo` / `public_memo_lines`(줄별 정렬·들여쓰기)와
  `MemoLine` 타입이 **이미 있다.** 새로 만들기 전에 이걸 쓸 수 있는지 먼저 본다.
- **먼저 결정해야 할 것:** 시청자에게 보이는 공개 메모인가, 관리자 전용 작업 메모인가.
  공개면 공개 DTO를 타고 나가고, 관리자 전용이면 편집실에만 남아야 한다 —
  **정보 경계 문제**라 결정 전에 구현하지 마라. 이건 ADR감이다.

### T-4. 대형 방송 트래픽 대비 — **L2**

왁굳형 방송은 동시 5,000~20,000명 규모다(사용자 명시).

- 공개 스케줄은 `unstable_cache` + 태그 무효화로 300초 캐시. 쓰기마다 revalidate 3줄 필수.
- 라이브 상태는 서버가 20초 캐시로 대신 폴링(`app/api/live/route.ts`) — 외부 호출이 시청자
  수와 무관하게 고정된다. **이 원칙을 깨는 코드를 넣지 마라.**
- 하트 집계는 캐시 밖에서 매 요청 읽는다(`public-loader`의 `loadLiveEventHeartCounts`) —
  **첫 병목 후보다.** 실측 후 짧은 캐시 / 집계 테이블 검토.
- 요청마다 DB에 쓰는 기능(방문 로그·프레즌스·성능 표본)은 이 규모에서 병목이라
  **일부러 뺐다**(D-4). 다시 넣자는 얘기가 나오면 집계형/샘플링으로 설계하고 ADR을 남겨라.
- 배포 전 점검: Vercel 함수 지역, Supabase 커넥션 풀, 공개 API CDN 캐시 헤더.

### T-5. Playwright 정비 — **L1~L2**

`tests/README.md` 참고. dev 서버 + Supabase가 뜬 뒤 스펙을 분류: 지금도 유효한 것
(달력 렌더 · 공개 API 경계 · 반응형)은 고쳐 살리고, 사라진 기능 것은 지운다.
스냅샷은 VIC 픽셀이라 전부 지웠으니 새로 뜬다(`--update-snapshots`).

### T-6. 브랜딩 마감 — **L1**

- `.env.example`의 `SOOP_BJ_ID`가 **비어 있다.** 우왁굳님 SOOP BJ 아이디를 받아야 라이브 배지 동작.
- `app/globals.css` 팔레트는 아직 VIC(빅토리×빅타민) 값이다. 왁굳형/왁타버스 색으로 갈지 상의.
- `lib/calendar/holidays.ts` 기념일은 채웠지만 출처가 위키다(D-8). 사용자 확인 필요.
  트위치 이적일은 "2016년 8월"까지만 확인돼 1일로 넣어 뒀다.

## 5. 작업 규칙

- 변경마다 tsc → lint → build → vitest 넷을 다시 통과시킨 뒤 커밋.
  `next build`는 **exit code를 확인**해라(tail만 보면 실패를 놓친다 — Vercel이 lint 에러로 배포를 막는다).
- L2/L3는 `docs/agent/plans/ACTIVE_PLAN.md`를 먼저 쓴다.
- 최소 변경. 요청 범위 밖 리팩터링 금지.
- 실행하지 않은 검증을 성공이라고 말하지 마라.
- 파괴적 Git/DB 명령은 명시적 승인 없이 쓰지 마라.
- 커밋 메시지는 "무엇을 왜"를 한국어로.

## 6. 첫 응답에서 할 것

1. `CLAUDE.md` · `README.md` · `db/README.md` · `tests/README.md` · `git log`를 읽어라.
2. 위 §1의 Discovery Notes를 재확인하고 **틀린 부분이 있으면 지적해라.**
3. Harness 도입(§3)과 남은 작업(§4) 중 무엇부터 할지, 그리고 §3-2 Risk Profile 판정안을
   나에게 제시하고 승인을 받아라.

구현은 그 다음이다.

---
