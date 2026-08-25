# 우왁굳 일정표 (wak-schedule)

스트리머 우왁굳님의 방송 일정을 관리하고 공개하는 사이트.
관리자가 편집실에서 일정을 짜면, 시청자는 공개 포스터에서 그 달 일정을 본다.

VIC(빅토리) 스케줄 스튜디오에서 갈라져 나왔지만 **다른 제품**이다 —
비공개 레이어·달력 꾸미기·매니저/작업자·업 도움이 전부 없고, 역할은 관리자와 시청자 둘뿐이다.

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # 값 채우기 (Supabase, OWNER_EMAIL, SOOP_BJ_ID)
npm run dev
```

Supabase 없이도 뜬다 — 샘플 데이터로 폴백한다(`lib/schedules/sample-public-data.ts`).

## 검사

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint --max-warnings=0
npm run build       # next build
npm test            # vitest (192개)
```

## 구조

- `app/` — 라우트. `/` = 공개 포스터(비로그인 허용), `(studio)/studio/*` = 편집실(시청자는 `/`로 리다이렉트)
- `components/` — UI. `poster/public-poster.tsx`(시청자 화면)와 `studio/studio-shell.tsx`(편집실)가 두 축
- `lib/` — 도메인·로더·서버 액션. `lib/config/site.ts`가 이름·슬러그의 단일 출처
- `db/` — SQL 스키마/정책/시드 (`db/README.md` 먼저 읽을 것)
- `tests/` — Vitest(통과) + Playwright(아직 미정비, `tests/README.md` 참고)

## 규칙

`CLAUDE.md`에 이 저장소에서 지켜야 할 것들이 정리돼 있다. 시간은 항상 KST,
공개 API에는 공개 데이터만, 일정 편집은 관리자만.
