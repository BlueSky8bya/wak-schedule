# ADR-0002: 역할은 owner / developer / viewer 셋뿐

Status: Accepted
Date: 2026-08-26 (백필, 커밋 f422a96)
Decision Owners: User + Agent-assisted

## Context

VIC에는 매니저·작업자(신뢰 멤버) 역할과 그 승인 흐름이 있었다. 이 프로젝트 운영
주체는 우왁굳님 측 소수라 중간 역할이 불필요하다.

## Decision

owner(UI 표기 "관리자", 구글 계정 여러 개 가능: `OWNER_EMAIL` 콤마 + `calendar_co_owners`)
/ developer(시스템 유지보수 + 읽기 전용 역할 미리보기) / viewer(공개 포스터만) 셋만 둔다.

## Consequences

- (+) 권한 매트릭스가 단순 — 서버 액션 검사(`canEditSchedule`)가 한 줄로 끝난다.
- (−) 매니저 위임이 필요해지면 역할 체계+RLS+UI 재작업 (되돌리기 비용 높음).

## Revisit Conditions

운영 인원이 늘어 편집 위임이 필요할 때.

## Validation

`lib/permissions/roles.ts` + RLS(`db/policies/0001_rls.sql`, T-1 후 실검증). (BR-EDIT-001)
