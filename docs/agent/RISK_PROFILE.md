# Risk Profile

Default: GENERAL
판정일: 2026-08-26 (사용자 승인)

## Active Profiles

- **GENERAL** — 전체.
- **AUTH** — Google OAuth, 역할 게이팅(owner/developer/viewer), `(studio)` 접근 가드.
  경로: `lib/auth/`, `lib/permissions/`, `app/(auth)/`, `app/api/auth/`, `middleware.ts`.
- **SECURITY** — 공개/비공개 경계(발행 전·떡밥 내용 비노출), service-role 키(서버 전용),
  RLS. 경로: `lib/schedules/public-loader.ts`, `app/api/public/`, `db/policies/`,
  `lib/auth/admin.ts`.
- **PRIVACY** (좁게) — 소유자 이메일(`OWNER_EMAIL`), 비로그인 하트의 `device_token`
  (지속 가명 식별자). 경로: `lib/schedules/heart-actions.ts`, `hope-actions.ts`.
- **DESTRUCTIVE_DATA** — 수동 적용 마이그레이션(멱등이지만 실 DB 대상), tombstone 삭제
  (`0058`), 소유자 이전(`seeds/0003`). 경로: `db/migrations/`, `db/seeds/`,
  `scripts/apply-db.mjs`. 규칙: 실 DB 적용 전 dry-run·백업·롤백 경로 확인, 명시 승인.

## Inactive Profiles Reviewed

- PRODUCTION_INFRA: **보류** — 아직 미배포. Vercel 첫 배포 시 활성화한다.
- RESEARCH / HEALTH / FINANCE / PAYMENTS / LEGAL_COMPLIANCE / SAFETY_CRITICAL /
  ML_EVALUATION: 해당 없음 — 이 프로젝트에 그런 기능이 없다.

## Re-evaluation Triggers

- Vercel 첫 배포 → PRODUCTION_INFRA 활성화
- 결제·후원 연동 추가 → PAYMENTS 검토
- 시청자 개인정보 수집 확대(현재는 device_token뿐) → PRIVACY 범위 재검토
- 방문/행동 로그 재도입 논의(ADR-0004 Revisit) → PRIVACY + 성능 재검토
