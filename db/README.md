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

## ⚠ 현재 상태 (2026-08-26)

**이 체인은 아직 어떤 실제 데이터베이스에도 적용된 적이 없다.** VIC(빅토리) 프로젝트의
검증된 64개 마이그레이션에서 이 프로젝트에 없는 기능을 걷어내고 다시 쓴 것이다.
새 Supabase에 처음 적용할 때 오류가 나면 그건 이 축소 과정의 흔적이지 데이터 문제가 아니다.
첫 적용 후 `verify-db.mjs`로 확인하고, 통과하면 이 경고 문단을 지운다.

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
