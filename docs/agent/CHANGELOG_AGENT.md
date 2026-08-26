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

### CHG-20260826-010 — FEAT — 이 달 메모·월별 인사이트·포스터 아바타 제거

Change (사용자 지시, ADR-0009 2차·ADR-0011):
- 편집실 아바타 자리 → '이 달 메모'(calendars.public_memo, 디바운스 자동저장,
  canEditSchedule 게이트+서버 재검사, 무효화 3줄).
- 포스터 아바타 기능 전면 제거(왁굳형은 버츄얼 아님).
- 관리 = 버튼 2개 나란히: [태그 편집][월별 인사이트](드롭다운 해체).
- 월별 인사이트 신설 — 일정 파생 통계만(방송/휴뱅 일수·태그 순위·하트·기대·전월 비교).
- VIC 잔재: 에러/404/로그인 페이지 "VIC Studio" → SITE_NAME.
Files: `lib/schedules/{memo,insights}-actions.ts`, `components/studio/{month-memo,month-insights}.tsx`,
`components/studio/studio-shell.{tsx,css}`, `components/poster/public-poster.tsx`,
`app/{error,global-error,not-found}.tsx`, `app/(auth)/login/page.tsx`, `app/visual-fixture/poster/page.tsx`
Validation: 게이트 4종 exit 0(214), 프로덕션 빌드 fixture 스크린샷으로 편집실·포스터 확인.
Rollback: 커밋 revert (DB 변경 없음).

### CHG-20260826-011 — FIX — 태그 필터 칩 렌더 깨짐(사용자 실측)

Root Cause: 칩 스타일(.tag-legend-filter 일가)이 VIC의 insights-charts.css에 살았는데,
분기 때 인사이트를 걷어내며 그 파일째 사라졌다. studio-shell.css에는 주석만 남아 있었다.
칩이 브라우저 기본 버튼으로 떨어지고 색 견본 <i>(inline)는 width 무시 → 2px 실선.
Change: VIC 원본에서 규칙 복원(+modifier 원형 견본·hover·tag-legend-clear).
Files: `components/studio/studio-shell.css`
Validation: 게이트 4종 + fixture 스크린샷(견본·켜짐 악센트 바) 확인

### CHG-20260826-012 — STYLE — 왁굳형 브랜딩 1차: 🌿·잎빛 배경·노란 메모지

Change (사용자 요청):
- 제목 장식 ✨ → 🌿 (TITLE_SPARK 상수, site.ts 단일 출처 — 포스터·편집실·스켈레톤·
  로그인·월 카드 장식). 근거: 팬덤 유래의 '나무'(침팬치 vs 가만히 선 나무=왁굳형),
  숲(SOOP)·왁물원·페리도트 그린 연결.
- 배경: VIC 크림 → 연한 페리도트 잎빛. 원색 페리도트(#B4C424)는 강렬해 배경 부적합 —
  채도 낮춘 톤(globals 토큰 + 포스터 페이지·판·그리드·셀·요일줄 + 편집실 바탕).
  이벤트 색 대비 유지 확인(fixture 스크린샷).
- 메모: 흰 판 → 노란 스티키 노트(#fdf3bd 판 + #fff9d8 입력).
Files: `lib/config/site.ts`, `app/globals.css`, `components/poster/public-poster.{tsx,css}`,
`components/studio/studio-shell.{tsx,css}`, `components/skeleton/calendar-skeleton.tsx`,
`app/(auth)/login/page.tsx`
Validation: 게이트 4종(214) + fixture 스크린샷(포스터·편집실)
Rollback: 커밋 revert

### CHG-20260826-013 — FEAT — 편집기 간소화·월별 메모·인사이트 4탭·그린 크롬 (PLAN-005)

Change: 미정 토글 제거+옵션 접기 해체(최초공개 직노출) · 메모 월별화(0061 테이블,
'N월 메모', 상태 배지 칩, 중앙 좌/우 토글) · 인사이트 4탭(일정·참여·트렌드·하이라이트,
6개월 트렌드 바·하이라이트 카드) · D+ 호버 안내 · 태그 색 클러스터+형식 진채도 bg_hex ·
편집실 크롬 보라→그린 432건 자동 이동.
Files: studio-shell.{tsx,css}, month-memo.tsx, month-insights.tsx, memo-actions.ts,
insights-actions.ts, db/{migrations/0061,seeds/0014}, sample-public-data.ts, public-poster.tsx
Related: ADR-0009(3차), ADR-0011, PLAN-20260826-005

### CHG-20260826-014 — STYLE — 배색 레이어링 + 메모 토글 액션바 중앙

Change: 전부 초록 계열로 맞춰 층이 없다는 피드백 → 페이지(잎빛 그린)는 유지하고
표면(달력 판·셀·요일줄·카드 토큰)을 웜 크림으로 — '초록 바탕 위 크림 카드'.
올리브 배경+크림 표면+머스터드 액센트 정석 배색. 메모 좌/우 토글은 액션바
(태그 편집·인사이트·단축키 줄) 정중앙 absolute 고정으로 이동(사용자 의도 재확인).
Files: `app/globals.css`, `components/poster/public-poster.css`,
`components/studio/{studio-shell.tsx,studio-shell.css,month-memo.tsx}`

### CHG-20260826-015 — FEAT/FIX — 게이트 비밀번호·보안 탭·이 달 기록 복구·VIC 인사이트 디자인

- FIX: 최초공개(떡밥) 게이트가 fork 이후 /api/unlock-private-layer 라우트 부재로
  통과 불가였다(fetch 404). 라우트 복구 + 비밀번호 저장(0062: calendars.gate_pass_hash,
  sha256(calendar_id||pass), 초기값 0724=왁굳형 생일).
- FEAT: 인사이트 보안 탭 — 게이트 비밀번호 변경(현재 확인 후 교체, 초기값 힌트).
  VIC의 실시간·방문·시스템은 계속 없음(ADR-0011) — 보안 탭만 이 프로젝트 실체에 맞게.
- FIX: 시청자 '이 달 기록' 버튼 무반응 — 시트 본체가 fork 때 삭제되고 상태만 남아
  있었다. 클라이언트 즉석 집계 시트로 복구(서버 호출 0 — ADR-0004 유지).
- STYLE: 인사이트 디자인을 VIC insights-charts.css에서 이식(탭 알약·슬라이드 트랙·
  화살표+점 네비·insight-grid/tile/bars) — 사용자 결정 "디자인은 VIC 그대로".
  편집실 요일줄의 연보라 그라데이션 제거(웜 크림 톤온톤).
Files: db/migrations/0062, app/api/unlock-private-layer/route.ts,
lib/schedules/security-actions.ts, components/studio/{month-insights.tsx,insights.css},
components/poster/public-poster.{tsx,css}, components/studio/studio-shell.css
Related: PLAN-20260826-005(연장), ADR-0009·0011

### CHG-20260826-016 — STYLE/FEAT — 인사이트·기록 시트 전면 VIC 충실 이식 + 아이보리 배경

사용자 피드백 "모든 탭·시청자 시트 디자인이 VIC과 다르다" → 어설픈 재해석 폐기, 원본 이식:
- 일정 탭: insight-next(다음 방송+제목 칩)·5타일(컨텐츠/있는 날/휴뱅/바쁜·한가한 요일,
  ▲▼ 증감 배지)·컨텐츠 순위 바 — VIC renderContent 구조 그대로.
- 참여 탭: 하트 2타일·월별 하트 vt-chart·인기 TOP 목록 — VIC renderEngagement.
- 트렌드 탭: 컨텐츠·하트 스파크(TrendDeltaBadge·진행 중 달 빗금) + 콘텐츠별·형식별·
  하트 받은 태그 StackTrendChart(호버 분해 박스 포함) — VIC renderTrend.
  방송시간 차트만 부재(수집 없음).
- 하이라이트: HighlightCards 이식(이모지 톤 카드 4장).
- 시청자 '이 달 기록': VIC public-insights.tsx 통째 이식(pi-* 시트) — 임시 recap 폐기.
  방송시간 카드만 없음, "빅타민들"→"팬치들".
- 이식 컴포넌트: stack-trend-chart·trend-delta-badge·highlight-cards·month-progress +
  insights.css에 VIC 규칙 94블록 추가(보라→잎빛 hue 이동).
- 배경: 연두 과함 피드백 → 아이보리+그린 힌트로 톤 다운(--paper·포스터·편집실 그라데이션).
- 액션 확장: nextBroadcast·바쁜/한가한 요일·tagRank(색·비율)·6개월 시리즈/스택 3종.
Files: components/studio/{month-insights.tsx,insights.css,stack-trend-chart.tsx,
trend-delta-badge.tsx,highlight-cards.tsx}, components/poster/{public-insights.tsx,
public-poster.tsx,public-poster.css}, lib/insights/month-progress.ts,
lib/schedules/insights-actions.ts, app/globals.css, studio-shell.css

### CHG-20260826-017 — STYLE/UX — 4탭·보안 폼 비율·색 타협·계정 클러스터 이사·문구 축약

- 인사이트 하이라이트 탭 제거(일정·참여·트렌드·보안 4탭, 4열 그리드).
- 보안 탭 폼: 중앙 정렬 max-width 400, 입력 전폭 — 비율 어색함 해소. 설명 한 줄로.
- 색 타협: 편집실의 밝은 연두 표면을 아이보리 쪽으로(hue 66% 이동·채도 절반),
  시청자 표면엔 그린 힌트 살짝, 페이지 배경 그라데이션은 양쪽 동일값으로 통일.
- 관리자(?) 배지·로그아웃을 헤더→액션바 우측(단축키 오른쪽)으로, 높이 30px 통일.
- 문구 축약: D+ 툴팁 "2008년 11월 1일 기준", 떡밥 힌트·트렌드 노트·보안 설명 압축.
Files: month-insights.tsx, insights.css, studio-shell.{tsx,css}, public-poster.{tsx,css}, globals.css

### CHG-20260826-018 — FEAT/STYLE — 보안 탭 VIC 구조·계정별 메모·시청자 하이라이트 제거·화사한 파스텔

- 보안 탭: 자작 폼 폐기 → VIC SecurityPanel 구조(상태 배너 ok/warn + KPI 3타일
  [상태/마지막 변경/잠금 대상] + 비밀번호 변경 버튼→폼 + 관리자·개발자 접근 자격자
  카드). 데이터만 이 프로젝트 실체(떡밥 게이트). 0063: gate_pass_updated_at.
- 메모 계정별 분리(0063): (calendar, user, ym) PK + RLS user_id=auth.uid() —
  개발자/관리자, 관리자 계정끼리도 서로 안 보인다. 액션도 uid 스코프(이중 방어).
- 시청자 '이 달 기록'에서 하이라이트 카드 제거(4탭 정합).
- 색: 페이지·표면 전반 밝고 화사하게(칙칙한 회녹 탈출), 인사이트 활성 탭은 쨍한
  그라데이션 → 파스텔 필+진한 글자. 역할 배지 ? 원 14px로 축소.
Files: db/migrations/0063, lib/schedules/{memo,security}-actions.ts,
components/studio/{month-insights.tsx,insights.css,studio-shell.css},
components/poster/{public-insights.tsx,public-poster.css}, app/globals.css
Related: ADR-0009(4차 — 계정별)

### CHG-20260826-019 — FIX — 보안 목록 내부 계정 숨김·역할 팝오버 잘림

- 보안 탭 접근 자격자에서 운영·테스트 계정(whiteheaven·blackspace) 숨김 —
  권한은 그대로, 표시만 제외(HIDDEN_GATE_EMAILS). 개발자 섹션은 표시할 계정이
  있을 때만 렌더.
- 역할 배지 팝오버: 배지가 액션바 오른쪽 끝으로 이사한 뒤 화면 밖으로 잘림 —
  오른쪽 기준 정렬 + 긴 이메일 overflow-wrap.
Files: lib/schedules/security-actions.ts, components/studio/{month-insights.tsx,studio-shell.css}

### CHG-20260826-020 — FEAT — 방송 시간 추적 재도입 + '이 달 기록' 4파트 완성 (ADR-0012)

- broadcast_sessions(0064) + /api/live 캐시 갱신 피기백 도장(분당 ≤3회 고정 부하,
  BTIME 시작·last_seen 종료). 공개 집계 라우트 /api/public/<slug>/broadcast
  (public-loader만 — BR-PUBLIC-001, 경계 테스트 등록 → 215개).
- VIC BroadcastHours 차트 이식 — 시청자 '이 달 기록' 방송 시간 카드 + 편집실
  트렌드 탭. '팬치들이 많이 누른 일정'은 하트 0이어도 빈 문구로 항상 표시.
- public-loader의 죽은 VIC 방송 함수(존재하지 않는 RPC 0049/0050 호출) 제거.
Files: db/migrations/0064, lib/live/record.ts, app/api/live/route.ts,
app/api/public/[calendarSlug]/broadcast/route.ts, lib/schedules/public-loader.ts,
components/studio/{broadcast-hours.tsx,insights.css,month-insights.tsx},
components/poster/public-insights.tsx, tests/unit/public-boundary.test.ts

### CHG-20260826-021 — REFACTOR — 색 부채 P0 4종 (ADR-0013)

- 죽은 스타일 제거(~2,900줄): 스티커·포스터 테마·월드컵·업도움·포스터 아바타/캡쳐/
  단축키도움말·member-role. 죽은 파일 theme-switch.tsx, theme-actions.ts 삭제.
  근거: tsx/ts 전수 감사에서 클래스 방출 0 확인. 렌더 불변(픽스처 스크린샷).
- 보라 수렴: 상호작용 보라 6종 → --violet(#6b5bd6)/--violet-strong/--violet-rgb.
  떡밥 저채도 보라는 --teaser로 분리(합치지 않음).
- 의미 토큰 선언: --interactive/--today/--heart/--live/--teaser(+짝). live·teaser 실소비 시작.
- 표면 스냅: 근사중복 크림 화이트 74곳 → --surface/--surface-2/--paper (채널 합 Δ≤8만).
- 부수 수정: 단축키 안내 칩 2개 제거, 메모 위치 토글 '왼쪽·메모·오른쪽' 재배치.
Files: app/globals.css, components/poster/public-poster.{css,tsx},
components/studio/{studio-shell.css,studio-shell.tsx,insights.css},
docs/agent/decisions/ADR-0013-color-debt-p0.md

### CHG-20260826-022 — STYLE — '구름빛 클린' 전환 + 달력 한색 층 (ADR-0013 후속)

- 눈 편한 테마(전역 sepia) 기본 ON → 옵트인: 시청자 화면 색 왜곡의 숨은 원인 제거.
- 달력 그리드 한색 층: --cal-*(surface/dim/line/frame/head/head-ink) 토큰 신설,
  포스터·편집실 동일 적용. 일/토 색·오늘 금테·태그색 불변.
- 사용자 '다른 편안하고 깔끔' 요청 → 중립 토큰 쿨 전환(--paper/--surface/--surface-2/
  --line/--studio-workbench) + 포스터/모바일 아젠다 웜 크림 리터럴 쿨 치환(60여 곳).
  골드는 포인트(오늘·화살표·선택·D+)로 유지. 캡쳐-판단 반복으로 검증.
Files: app/globals.css, lib/ui/motion.ts, app/layout.tsx,
components/poster/public-poster.css, components/studio/studio-shell.css

### CHG-20260826-023 — STYLE — 기본 토글: 동작 줄이기 OFF · 눈 편한 테마 ON (사용자 지정)

- reduce motion: 미설정 시 OS prefers-reduced-motion을 따르던 것을 **무조건 OFF**로
  (명시적 "on"만 켬). eye comfort: 옵트인으로 바꿨던 것을 **기본 ON**으로 복귀("off"만 끔).
- 눈 편한 테마가 기준 화면이 되므로 필터 강도 완화: sepia 0.1 → 0.045(+sat .9/br .97) —
  0.1은 밝은 톤 청색을 상한까지 눌러 달력 한색 층이 물리적으로 못 살아남음(행렬 역산 확인).
  달력 --cal-* 토큰은 필터 통과 후 목표색이 나오도록 선보정.
Files: lib/ui/motion.ts, app/layout.tsx, app/globals.css, components/poster/public-poster.css

### CHG-20260826-024 — FIX/UX — 태그 순서 변경 P0/P1 수술 (감사 문서 §9의 1~6)

- 순수 모델 lib/tags/reorder.ts: reorderAtEdge(행+edge, 같은 결과=같은 참조 no-op,
  휴뱅 머리 고정은 클램프) + edgeForPointer(중앙선±데드존, 직전 edge 히스테리시스).
  단위 테스트 12개(감사 §8 표 — '마지막 둘 못 바꾸던' P0 재현 포함) → 총 227.
- 에디터: 유령 1:1 추적(관성·회전·랜덤 흔들림 제거), 동일 목적지 무렌더,
  콘텐츠↔형식 경계 드래그 차단, 자동 스크롤 중에도 판정 갱신(맨 끝 드롭 가능),
  Esc/pointercancel/창 blur 시 시작 스냅샷 복구, 리스너 4종 대칭 해제.
- 자리표시자: 들린 행을 점선 슬롯(보라 6%)으로 — 놓일 자리가 읽힌다.
- 닫기 경고: 에디터 dirty를 부모에 통지(렌더 단계 ref-guard, 콜백은 ref 대입만),
  태그 모달 X·배경·Esc 닫기 시 '계속 편집/버리고 닫기' 확인 레이어.
- applyTagUpdates에 kind/parentId 반영(감사 P2 — 종류 변경이 세션 상태에 안 실리던 것).
- 별건: 팝오버 태그 칩 3열 고정(auto-fill 출렁임 — 사용자 지적).
Files: lib/tags/reorder.ts, tests/unit/tag-reorder.test.ts,
components/tags/tag-legend-editor.tsx, components/studio/{studio-shell.tsx,studio-shell.css}

### CHG-20260826-025 — TUNE — 하트 배지 임계값 규모 보정 (T-8 1차)

- VIC 임시값(5/12/25/10) → 실활동 2,400명(구독 4,800의 절반, 사용자 지정) 참여율 기준:
  ACTIVE_FAN_BASE(2400) × 1%/3%/8%/2% = 24/72/192/48. 판정은 여전히 절대 수(단조 원칙).
- 재보정 계약: 실분포 확인 후 모수·비율만 수정(lib/schedules/heart-tiers.ts 단일 출처).
Files: lib/schedules/heart-tiers.ts

### CHG-20260826-026 — FEAT — 메모 개편: 붙임쪽지 런처 + 떠 있는 쪽지 창 (ADR-0014)

- calendar_memos(0065, 라이브 적용) — (calendar, user) 스코프 여러 장, 월 구속 제거.
  기존 월별 메모는 보존 + 1회 이식(제목 'N월 메모'). RLS 자기 것만 + service_role GRANT.
- 액션 4종(list/create/update/delete, memo-actions.ts 동거 — 캐시 EXCEPT 승계),
  한도 30장/4000자/제목 100자, 서식 화이트리스트 검증.
- memo-notes.tsx: 레일 런처(+ 새 메모, 행 클릭 열기, 2단 삭제 확인) + 쪽지 창
  (body 포털, 헤더 드래그 이동 + 위치 localStorage, 모서리 resize, 배경색 4·굵게·
  글씨체 3·크기 4, 디바운스+직렬 저장, Esc 닫기). month-memo.tsx 제거.
Files: db/migrations/0065_memo_notes.sql, lib/schedules/memo-actions.ts,
components/studio/{memo-notes.tsx,studio-shell.tsx,studio-shell.css},
docs/agent/decisions/ADR-0014-memo-notes.md

