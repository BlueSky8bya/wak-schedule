# 배포 — Vercel + Supabase

첫 배포: 2026-08-26. 프로덕션: **https://wak-schedule.vercel.app**
(배포별 `wak-schedule-<hash>-....vercel.app` 주소는 1회용 — 링크 공유는 항상 고정 주소로.)

## 구조

- **Vercel** (region `icn1`, vercel.json): main 브랜치 push마다 자동 배포.
  lint 에러는 배포를 막는다 — CI(`.github/workflows/ci.yml`)가 같은 게이트를 먼저 돈다.
- **Supabase** (서울): Postgres + RLS + Google 인증. 스키마는 `db/README.md` 순서로
  `scripts/apply-db.mjs` 수동 적용(멱등).

## Vercel 환경 변수 (프로덕션)

`.env.local`과 동일 — 단 세 가지 차이:

| 변수 | 프로덕션 값 |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://wak-schedule.vercel.app` (도메인 바꾸면 갱신) |
| `SUPABASE_DB_PASSWORD` | **넣지 않는다** — 마이그레이션 스크립트 전용 |
| `CHZZK_CHANNEL_ID` | 미사용(soop) — 넣지 않는다 |

나머지: `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` ·
`SUPABASE_SERVICE_ROLE_KEY`(비밀) · `OWNER_EMAIL`(콤마 목록, 첫 번째=주 소유자) ·
`NEXT_PUBLIC_CALENDAR_SLUG=wak` · `LIVE_PROVIDER=soop` · `SOOP_BJ_ID=ecvhao` · `PERF_LOG=on`

env 변경은 **Redeploy 해야 반영**된다(Settings → Environment Variables 저장 후
Deployments → 최신 → ⋯ → Redeploy).

## Supabase 인증 URL (로그인 리다이렉트)

Authentication → URL Configuration:

- **Site URL** = `https://wak-schedule.vercel.app`
- **Redirect URLs**:
  - `https://wak-schedule.vercel.app/**`
  - `http://localhost:3000/**` (로컬 개발용 유지)

Google Cloud 쪽 OAuth 콜백은 Supabase 주소(`https://<ref>.supabase.co/auth/v1/callback`)라
도메인이 바뀌어도 손댈 것 없다.

⚠ OAuth 동의 화면이 테스트 모드인 동안은 **테스트 사용자로 등록된 계정만** 로그인된다
(Google Cloud → OAuth 동의 화면 → 대상 → 테스트 사용자). 시청자는 로그인이 없으니 무관.

## 배포 후 점검 (스모크)

```text
curl -s -o /dev/null -w "%{http_code}" https://wak-schedule.vercel.app/            # 200
curl -s https://wak-schedule.vercel.app/api/public/wak/events | head -c 200       # 실 DB 데이터
curl -s https://wak-schedule.vercel.app/api/live                                  # {"isLive":...}
```

- 로그인 → 편집실 저장 → 포스터 반영(캐시 300초 내 무효화) 1회 왕복.
- 대형 방송 대비 점검 항목: `docs/agent/CURRENT_STATE.md`의 T-4.

## 도메인을 바꿀 때

1. Vercel → Settings → Domains에서 추가/전환
2. `NEXT_PUBLIC_SITE_URL` env 갱신 + Redeploy
3. Supabase Site URL·Redirect URLs 갱신
