# 새 세션 이니셜 프롬프트

> `C:\Projects\wak-schedule`에서 Claude Code를 새로 열고, 아래 블록을 그대로 붙여넣으면 된다.

---

이 저장소(`C:\Projects\wak-schedule`)는 스트리머 **우왁굳**님의 방송 일정 사이트다.
`C:\Projects\VIC Schedule studio`(스트리머 빅토리님 사이트)에서 갈라져 나왔고, 이식과 정제는
끝난 상태다. `CLAUDE.md`와 `README.md`를 먼저 읽어라. 특히 CLAUDE.md의 "이 프로젝트의 정체"
절에 **여기 없는 기능 목록**이 있다 — 그걸 되살리는 코드를 짓지 마라.

## 지금 상태 (직접 확인한 것)

- `npx tsc --noEmit` / `npx eslint . --max-warnings=0` / `npx next build` / `npx vitest run`(192개)
  **네 개 모두 통과**한다. 이 상태를 깨지 말고 작업할 것.
- Supabase는 **아직 안 붙었다.** `.env.local`이 없어서 샘플 데이터로 폴백해 뜬다.
- Playwright(e2e·visual)는 **한 번도 안 돌렸다.** VIC 기준 스펙이라 없는 기능을 검사한다
  (`tests/README.md`).
- DB SQL 체인은 **실제 DB에 적용된 적이 없다.** VIC의 검증된 64개 마이그레이션에서 축소해
  다시 쓴 것이다 (`db/README.md`).
- git: `main` 브랜치, 원격 `https://github.com/BlueSky8bya/wak-schedule.git`에 푸시돼 있다.

## 해야 할 일 (사용자가 정한 순서 없음 — 상의해서 정할 것)

### 1. Supabase 붙이고 DB 세우기 (다른 모든 일의 전제)
새 Supabase 프로젝트를 만들고 `.env.example`을 `.env.local`로 복사해 채운 뒤,
`db/README.md`의 순서대로 `node scripts/apply-db.mjs`로 적용하고 `node scripts/verify-db.mjs`로
확인한다. 축소 과정에서 손댄 파일이라 오류가 날 수 있다 — 나면 그게 첫 작업이다.
성공하면 `db/README.md`의 ⚠ 경고 문단을 지운다.

### 2. 태그를 우왁굳 콘텐츠로 다시 짜기
지금 태그는 **VIC(빅토리) 콘텐츠 기준**이거나, 내가 임의로 추정해 넣은 플레이스홀더다
(`lib/schedules/sample-public-data.ts`의 `defaultTags`, `db/seeds/`의 태그 시드).
왁굳형 실제 방송 콘텐츠(종겜·마크·합방·시참·대회·노가리…)를 사용자와 함께 확정하고,
2계층 구조(대분류=색 보유 / 세부=부모 색 상속)에 맞춰 시드를 다시 쓴다.
참고: `docs/tags/tag-taxonomy-classification.md`, `docs/tags/tag-hierarchy-plan.md`.

### 3. 아바타 자리를 "그 달 메모"로 바꾸기 (사용자 요청 기능)
왁굳형은 버츄얼이 아니라 아바타 자리가 필요 없다. 지금 포스터/편집실에는 VIC에서 물려받은
**아바타 자리**(`avatarSlot`/`avatar-scene`, 화면 옆 1/4를 비워 두는 영역)가 그대로 있다.
그 자리에 **그 달 할 일을 마인드스토밍하는 메모** 기능을 넣는다.
- 기존 자산: `calendars.public_memo` / `public_memo_lines`(줄별 정렬·들여쓰기) 스키마와
  `MemoLine` 타입이 이미 있다 — 새로 만들지 말고 이걸 쓸지 먼저 검토할 것.
- 결정할 것: 시청자에게도 보이는 공개 메모인가, 관리자 전용 작업 메모인가.
  (공개면 공개 DTO를 타고 나가고, 관리자 전용이면 편집실에만 남아야 한다 — 경계 문제다.)

### 4. 대형 방송 트래픽 대비 (사용자가 명시적으로 요청)
왁굳형 방송은 동시 5,000~20,000명 규모다. 지금 구조에서 확인/보강할 것:
- 공개 스케줄은 `unstable_cache` + 태그 무효화로 300초 캐시된다. 쓰기마다 revalidate 3줄이
  붙어 있는지 확인(`tests/unit/public-cache-revalidate.test.ts`가 정적으로 잡는다).
- 라이브 상태는 서버가 20초 캐시로 대신 폴링한다(`app/api/live/route.ts`) — 시청자 수와
  무관하게 외부 API 호출이 고정된다. 이 원칙을 깨는 코드를 넣지 말 것.
- 하트 집계는 캐시 밖에서 매 요청 읽는다(`loadLiveEventHeartCounts`) — 여기가 첫 병목 후보다.
  실제 부하를 재고 필요하면 짧은 캐시/집계 테이블을 검토.
- 요청마다 DB에 쓰는 기능(방문 로그·프레즌스·성능 표본)은 이 규모에서 그 자체가 병목이라
  **일부러 뺐다.** 다시 넣자는 얘기가 나오면 집계형/샘플링으로 설계할 것.
- Vercel 함수 지역, Supabase 커넥션 풀, 공개 API의 CDN 캐시 헤더도 배포 전에 점검.

### 5. Playwright 정비
`tests/README.md` 참고. dev 서버 + Supabase가 뜬 뒤 스펙을 분류한다:
지금도 유효한 것(달력 렌더·공개 API 경계·반응형)은 고쳐 살리고, 사라진 기능 것은 지운다.
스냅샷은 VIC 픽셀이라 전부 지웠으니 새로 뜬다.

### 6. 브랜딩 마감
- `.env.example`의 `SOOP_BJ_ID`가 비어 있다 — **우왁굳님 SOOP BJ 아이디**를 받아 채워야
  라이브 배지가 동작한다.
- `app/globals.css`의 색 팔레트는 아직 VIC(빅토리×빅타민)에서 물려받은 값이다.
  왁굳형/왁타버스에 맞는 색으로 다시 잡을지 사용자와 상의.
- `lib/calendar/holidays.ts`의 기념일은 채워 넣었지만 출처가 위키다 — 사용자 확인 필요.
  트위치 이적일은 "2016년 8월"까지만 확인돼 1일로 넣어 뒀다.

## 작업 규칙

- 변경마다 tsc → lint → build → vitest 넷을 다시 통과시킨 뒤 커밋한다. `next build`는 **exit
  code를 확인**할 것(tail만 보면 실패를 놓친다 — Vercel이 lint 에러로 배포를 막는다).
- 커밋 메시지는 "무엇을 왜"를 한국어로. 되돌리기 비싼 결정은 이유를 본문에 남긴다.
- VIC 원본이 필요하면 `C:\Projects\VIC Schedule studio`(읽기 전용으로 참고)와
  `db/_vic-legacy/`에 있다.

먼저 `CLAUDE.md`를 읽고, 위 6개 중 무엇부터 할지 나에게 물어봐라.
