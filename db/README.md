# db/ — 스키마와 정책

새 Supabase 프로젝트에 **순서대로** 적용한다:

```bash
node scripts/apply-db.mjs db/migrations/0001_initial_schema.sql
# ... migrations/ 를 파일명 오름차순으로 전부
node scripts/apply-db.mjs db/policies/0001_rls.sql
node scripts/apply-db.mjs db/policies/0002_grants.sql
node scripts/apply-db.mjs db/policies/0003_event_tags.sql
node scripts/apply-db.mjs db/policies/0007_calendar_co_owners.sql
node scripts/apply-db.mjs db/seeds/0002_calendar_and_defaults.sql
# ... seeds/ 중 필요한 것
node scripts/verify-db.mjs
```

`apply-db.mjs`는 `.env.local`을 읽고, 모든 파일은 멱등(여러 번 적용해도 안전)하다.

## 적용 상태

2026-08-26 실 Supabase(서울)에 첫 적용 완료 — 전 체인(마이그레이션 26 + 정책 4 +
platform_admins) 멱등 재실행 오류 0, `verify-db.mjs` 통과. 첫 적용에서 잡은 것:
시드 slug `vic` 잔재(→`wak`, `tests/unit/seed-slug.test.ts`가 재유입 차단),
0001·정책 파일 멱등 가드 누락(CHG-20260826-006).

캘린더 시드(`seeds/0002`)는 **소유자 계정이 앱에 구글 로그인을 1회 완료한 뒤**에만
적용 가능하다(auth.users 참조).

## 데이터 모델 (축소판)

테이블 6개뿐이다: `platform_admins` · `calendars` · `color_palette` · `broadcast_tags` ·
`events` · `event_tags`. 여기에 마이그레이션이 얹는 것: `calendar_co_owners`(0020),
`calendar_hearts`(0011), `event_hearts`(0016) + 익명 하트(0040), `teaser_hope`(0060).

핵심 불변식:
- `visibility_scope` enum 값이 **`'public'` 하나뿐**이다 → 비공개 행이 DB에 존재할 수 없다
  (애플리케이션이 아니라 DB가 강제한다). 비공개 레이어를 되살리려면 enum부터 늘려야 한다.
- 쓰기는 `is_calendar_admin`(소유자 · 공동 소유자 · 플랫폼 개발자)만.
- `event_category`는 `stream | collab | notice | dayoff` (VIC의 `support`는 없다).

## `_vic-legacy/`

VIC에만 있는 기능(스티커·비공개 레이어·업 도움·신뢰 멤버·방문/행동 로그·프레즌스·
서버 성능 표본·방송 세션)의 마이그레이션·정책·시드를 **참고용으로만** 보관한다.
적용하지 않는다. 나중에 그 기능이 필요해지면 여기서 꺼내 쓰되, 축소된 0001 스키마와
맞물리는지 다시 확인해야 한다.
