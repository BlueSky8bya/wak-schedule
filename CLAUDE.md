# 우왁굳 일정표 (wak-schedule) — 에이전트 가이드

스트리머 우왁굳님의 방송 일정 사이트. 관리자가 편집실에서 일정을 짜고, 시청자는 공개 포스터에서 본다.

**WHITEHAVEN Harness 사용.** 시작 순서와 불변 원칙은 `AGENTS.md` → `docs/agent/` 참조:
현재 상태 `docs/agent/CURRENT_STATE.md` · 라우팅 `docs/agent/PROJECT_MAP.md` ·
결정 `docs/agent/DECISION_INDEX.md` · 완료 기준 `docs/agent/DEFINITION_OF_DONE.md` ·
BLOCKING 규칙 분류 `agent-harness.yaml`. L2/L3는 `docs/agent/plans/ACTIVE_PLAN.md` 먼저.

**핵심 약속:** 시청자에게 나가는 것은 공개 일정 데이터뿐이다. 발행 전(draft) 일정과 아직 시각이
안 된 최초공개(떡밥)의 내용은 공개 API·공개 화면에 절대 실리지 않는다.

## 이 프로젝트의 정체 (VIC와 다른 점)

VIC(빅토리) 스케줄 스튜디오를 갈라 만들었지만 **기능 집합이 다르다.** 아래는 여기 **없다**:

- 비공개 레이어(엠바고·작업자 범위, 잠금 비밀번호, 본문 암호화) — 모든 일정이 공개다
- 달력 꾸미기(스티커·이모지·도형·텍스트 스티커·테마 전환 UI)
- 매니저·작업자(신뢰 멤버) — 역할은 owner / developer / viewer 셋뿐
- 업 도움(support) 기간·링크, 공지 쓰기 모달, 방송 판서(그림판)
- 방문/행동 로그, 프레즌스, 인사이트 대시보드, 서버 성능 표본, 방송시간 추적
- 월드컵 시즌 기능과 축구 시뮬레이션

**이것들을 "되살리는" 코드를 짓지 말 것.** VIC 원본이 필요하면 `C:\Projects\VIC Schedule studio`와
`db/_vic-legacy/`에 있다. 되살리려면 스키마(특히 `visibility_scope` enum)부터 손대야 한다.

## 스택 & 배치

- Next.js 15 (App Router) + React 19 + TypeScript · Supabase(Postgres + RLS; service-role은 서버에서만)
  · Vercel · 테스트는 Vitest(unit) + Playwright(e2e/visual, **아직 미정비**)
- 명령: `npm run dev` · `npm run typecheck` · `npm run lint` · `npm run build` · `npm test`
- 라우트: `/` = 공개 포스터(비로그인 허용). `(studio)/studio/{,calendar/[year]/[month],tags}` = 편집실
  (시청자는 `(studio)/layout.tsx`가 `/`로 돌려보낸다). `api/public/[calendarSlug]/events` = 공개 경계.
  `api/{studio-write,live,auth/*}`.
- 편집실 월 라우트는 북마크/콜드 진입 전용 — 런타임 월 이동은 라우트 없이 상태로만 한다.

## 절대 규칙

1. 시간은 항상 KST(Asia/Seoul).
2. 공개/비공개 분리는 **서버에서** 한다 — CSS로 감추지 않는다.
3. 일정·태그의 생성/수정/삭제는 `owner`(와 시스템 유지보수자 `developer`)만.
4. 서버 액션은 클라이언트 게이트와 **별개로** 항상 권한을 다시 검사한다.
5. 공개 응답 DTO는 명시적으로 조립한다 — 스튜디오 객체를 spread 하지 않는다.
6. `visibility_scope` enum은 값이 `'public'` 하나다. 이 불변식을 코드에서 우회하지 말 것.

## 역할

- **viewer** — 공개 포스터만(필터·하트·기대돼요·월 이동). 편집실 진입 불가.
- **owner** (UI 표기 "관리자") — 전체 편집. 구글 계정 여러 개를 소유자로 둘 수 있다
  (`OWNER_EMAIL` 콤마 구분 + `calendar_co_owners`).
- **developer** — 시스템 유지보수 + 역할 미리보기(읽기 전용, 새로고침하면 풀림).

## 자주 쓰는 사실

- 모바일 = `≤640px` (`BREAKPOINTS.mobile` / `MOBILE_QUERY`).
- 디자인 토큰은 `app/globals.css :root` (`--space-*`/`--r-*`/`--shadow-*`/`--ease`) — 단일 출처.
  하드코딩하지 말고 항상 참조.
- 이름·슬러그·스토리지 키 접두사는 `lib/config/site.ts` 한 곳에서 나온다.
- 공개 캐시 300초. **쓰기 액션마다 `revalidatePath("/")` + `revalidatePath("/studio")` +
  `revalidatePublicSchedule()` 3줄이 필수** — 빠뜨리면 방금 고친 일정이 최대 5분간 시청자에게 안 보인다.

## 디자인 규칙 (모든 UI 작업의 합격 기준)

- **두 개의 네이티브 레이아웃, 하나를 축소한 게 아니다.** 웹(`@media (min-width: 641px)`)은 가로를
  쓴다 — 다단·정렬된 행·hover lift·넉넉한 활자. 모바일(`≤640px`)은 단일 열·촘촘함·엄지 타깃·
  바텀시트, 문구를 줄이고 절대 가로로 넘치지 않는다. 같은 DOM을 배율만 바꾼 건 결함이다.
- **디자인 통일:** 좌우 패딩 대칭, 토큰·컴포넌트 재사용, 공유된 모션 어휘. 일회용 스타일·비대칭·
  형제 요소 높이 들쭉날쭉은 결함.
- **빈 공간은 내용으로 채운다** — 값/아이콘을 키우거나 재배치한다. 이미 좁은 상자를 늘리지 않는다.
- **모션과 피드백은 기본값:** `:active` scale, `var(--ease)` 전환, 의미 있는 등장/퇴장. 정적이면 회귀.
- **햅틱:** 토글·선택·확인에 `hapticTick()`. 누름→서버확정은 톡 두 번(사이 간격 = 실제 왕복).
- 동작 줄이기는 `html[data-reduce-motion]`으로만 건다 — CSS에서 OS 미디어쿼리에 직접 걸지 말 것.
- **HCI:** 시선·포인터 이동을 줄이고, 관련된 것을 가까이 두고, 상태가 바뀌어도 위치를 지킨다
  (로딩 스켈레톤은 실제 내용이 올 자리에 둔다).

## 낙관적 쓰기

- 낙관적 쓰기는 **직렬 큐**로 보낸다(경쟁시키지 않는다) — 마지막 동작이 저장된 진실.
  서버 리밸리데이션이 진행 중인 로컬 상태를 덮어쓰지 않게 한다.
- 제스처/비동기 콜백은 배열을 ref로 읽고, id는 `canonId`(temp↔실제 동일시)로 비교한다.
- 게이트는 **좁게**: 전역 `pending` 같은 넓은 플래그로 버튼을 비활성화하지 말 것 —
  배경 저장이 무관한 동작(새 카드 만들기 등)을 막으면 안 된다.

## 작업 절차

각 변경마다: TypeScript + lint + `next build` 통과 → 공개/비공개 경계 재확인 → 커밋.
`npm run build`는 **exit code를 확인**한다(tail만 보지 말 것) — lint 에러로 Vercel 배포가 막히면
프로덕션이 옛 빌드에 갇힌다.

DB 스키마는 `db/migrations/*` SQL이고 수동 적용한다:
`node scripts/apply-db.mjs db/migrations/<file>.sql` (멱등, `.env.local`을 읽는다).
새 RLS 테이블을 만들면 **service_role 테이블 GRANT를 반드시 같이 준다** — 없으면 서버 쓰기가
`permission denied(42501)`로 조용히 죽는다.

## 폴더에 들어가면 그 폴더의 README.md를 먼저 읽는다

`docs/` · `db/` · `tests/` · `app/` · `components/` · `lib/` · `scripts/`

**충돌 시 우선순위:** 1) 보안/정보 경계 2) KST 3) 관리자 전용 편집 4) 역할별 UX 5) 포스터 품질 6) 유지보수성
