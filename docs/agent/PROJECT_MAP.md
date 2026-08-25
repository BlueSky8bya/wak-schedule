# Project Map — 라우팅 지도

새 에이전트는 전체 스캔 대신 이 표로 이동한다. 폴더별 상세는 각 폴더 README.

| Path | Role | 주 진입점 | Local Docs | Risk |
|---|---|---|---|---|
| `app/(public)` (루트 `/`) | 공개 포스터. 비로그인 허용 | `app/page.tsx` | `.claude/rules/public-private-boundary.md` | SECURITY |
| `app/api/public/[calendarSlug]/events` | 공개 API — **정보 경계** | `route.ts` | 위와 동일 | SECURITY |
| `app/api/live` | 라이브 상태(서버 20초 캐시 폴링). 미들웨어 제외 경로 | `route.ts` | 주석 참조 | GENERAL |
| `app/api/studio-write` | 편집 쓰기 창구(op 스위치) | `route.ts` | `tests/unit/public-cache-revalidate.test.ts` | AUTH, SECURITY |
| `app/(auth)` + `app/api/auth` | Google OAuth 로그인/콜백 | — | — | AUTH |
| `app/(studio)/studio` | 편집실. viewer는 `/`로 리다이렉트 | `layout.tsx` | — | AUTH |
| `app/visual-fixture` | Playwright 시각 테스트용 고정 화면 | — | `tests/README.md` | GENERAL |
| `middleware.ts` | 인증 쿠키 갱신만. matcher 제외 목록이 성능 경계 | — | `tests/unit/middleware-matcher.test.ts` | AUTH |
| `components/poster/` | 시청자 화면. 편집 컨트롤 렌더 금지 | `public-poster.tsx` | `.claude/rules/export.md` | SECURITY |
| `components/studio/` | 편집실 UI | `studio-shell.tsx` | — | GENERAL |
| `lib/schedules/` | 도메인 액션·로더. public-loader가 공개 경계 심장 | `README.md` | 있음 | SECURITY, PRIVACY |
| `lib/auth/` + `lib/permissions/` | 액터 해석·역할 게이트 | `actor.ts`, `roles.ts` | — | AUTH |
| `lib/live/` | 플랫폼 어댑터(soop/chzzk/none). 단일 출처 | `index.ts` | ADR-0005 | GENERAL |
| `lib/config/site.ts` | 이름·슬러그·키 접두사 단일 출처 | — | ADR-0006 | GENERAL |
| `lib/db/paginate.ts` | 1000행 cap 우회 단일 해법 | — | BR-PAGING-001 | GENERAL |
| `lib/calendar/` | KST 헬퍼·기념일 | `holidays.ts` | ADR-0008 (기념일 출처) | GENERAL |
| `db/migrations` `db/policies` `db/seeds` | 수동 적용 SQL(멱등). **아직 미적용** | `db/README.md` | 있음 | DESTRUCTIVE_DATA |
| `db/_vic-legacy/` | 제거 기능 SQL 보관. **적용 금지** | `db/README.md` | ADR-0007 | — |
| `scripts/apply-db.mjs` · `verify-db.mjs` | DB 적용/검증 | — | `db/README.md` | DESTRUCTIVE_DATA |
| `tests/unit/` | Vitest 197개 — BLOCKING 규칙의 실체 다수 | — | `tests/README.md` | — |
| `tests/e2e` `tests/visual` | Playwright. **미정비 — VIC 기준 스펙** | — | `tests/README.md` | — |
| `docs/agent/` | Harness (이 문서들) | `CURRENT_STATE.md` | — | — |
| `docs/` (agent 외) | 물려받은 설계 문서 — VIC 흔적 있음, 전제 갖고 읽기 | `docs/README.md` | 있음 | — |

## 경계 메모

- **Generated**: `.next/`, `node_modules/`, `tsconfig.tsbuildinfo` — 수정 금지.
- **공개 경계**: `app/api/public/*`와 루트 포스터는 `public-loader`만 import
  (`tests/unit/public-boundary.test.ts`가 정적 검사).
- **미들웨어 성능 경계**: matcher가 `api/live`·`api/public` 제외 — 새 공개 폴링
  라우트를 만들면 matcher와 `middleware-matcher.test.ts` 둘 다 갱신.
- **편집실 월 라우트**는 콜드 진입 전용 — 런타임 월 이동은 상태로만.
