# Active ExecPlan

Plan ID: PLAN-20260826-002
Status: Completed
Task Risk: L3 (DESTRUCTIVE_DATA — 실 DB 첫 적용)
Created: 2026-08-26
Updated: 2026-08-26

## Objective

T-1: 새 Supabase(서울)에 SQL 체인 첫 적용. 오류를 잡아 체인을 검증된 상태로 만든다.

## Verifiable End State

- migrations 26개 + policies 4개 + platform_admins 시드가 오류 없이 적용됨 (멱등 재실행도 OK)
- `verify-db.mjs`: 테이블·RLS 정책·보안 함수·platform_admins 확인
- `db/README.md` ⚠ 미적용 경고 문단 삭제
- 캘린더 시드(0002)는 소유자 첫 구글 로그인 후에만 가능 — 별도 단계로 명시

## Scope

- `db/seeds/*.sql`의 `slug='vic'` → `'wak'` 수정 (8개 파일) + 재유입 방지 테스트
- DB 적용·오류 수정·verify
- Out: 태그 내용 재설계(T-2), Google OAuth 설정(사용자, 5단계), Vercel 배포

## Risk / Rollback

- 새 빈 DB — 파괴할 기존 데이터 없음. 모든 SQL 멱등이라 재실행 안전.
- 최악의 경우 Supabase 프로젝트를 지우고 다시 만들면 원점 (비용 0).
- 코드 변경은 커밋 revert.

## Milestones

M1. 시드 slug 수정 + 테스트 → 게이트 4종
M2. migrations 26개 ascending 적용 (오류 시 그 자리에서 수정, 멱등 유지)
M3. policies 4개 + platform_admins 적용
M4. verify-db + 멱등 재실행 확인 → README 경고 삭제 → 커밋
M5. (사용자 로그인 후) 0002 + 0013 시드 → 재verify

## Progress Log

### 2026-08-26 (적용)

- M1 완료: 시드 slug vic→wak 9파일, seed-slug.test.ts 11개 통과.
- M2 완료: migrations 26개 첫 적용 전부 OK.
- M3 완료: policies 4 + platform_admins OK.
- 잡은 버그 3건: ① 시드 slug 'vic' ② verify-db pooler aws-1 하드코딩(ENOTFOUND) →
  후보 폴백(CHG-005) ③ 0001·정책 파일 멱등 가드 누락 → duplicate_object 가드 +
  if not exists + drop policy if exists(CHG-006).
- M4 완료: 전 체인 31/31 재실행 오류 0, verify-db 통과(테이블 11·정책 12·함수 3·
  admins=blackspace665). db/README ⚠ 삭제. dev 스모크: /=200, /api/public/wak/events가
  실 DB 빈 캘린더 응답, /api/live=200.
- M5 완료: Google OAuth 설정(사용자) → whiteheaven231233 첫 로그인 → 시드 8개
  (0002 + 팔레트 0006~0012 + 0013) 전부 OK. DB 확인: calendars 1(wak, 소유자 일치),
  palette 13, tags 10(플레이스홀더 — T-2 대상), events 3(샘플), co_owners 1.
  공개 API의 빈 응답은 시드 전 300초 캐시 — 재시작/TTL로 해소.

### 2026-08-26 (준비)

- .env.local 확인(키 4종 채워짐, OWNER_EMAIL=whiteheaven231233@gmail.com).
- 발견: seeds 8개가 slug='vic' 참조 — 적용 전 수정 필요 (M1).
