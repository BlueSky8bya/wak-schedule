# ADR-0006: lib/config/site.ts — 이름·슬러그·키 접두사 단일 출처

Status: Accepted
Date: 2026-08-26 (백필, 커밋 f422a96)
Decision Owners: Agent-assisted

## Context

VIC에서 "vic"/"빅토리"가 20여 곳에 하드코딩돼 있어 분기 이식 자체가 지뢰밭이었다.

## Decision

사이트명·달력 슬러그(`wak`)·스토리지 키 접두사를 `lib/config/site.ts` 한 곳에 모은다.
새 코드는 이 모듈만 참조한다.

## Consequences

- (+) 리브랜딩·재분기 비용 최소화.

## Validation

`grep`으로 하드코딩 재유입 확인. `tests/unit/public-boundary.test.ts`도
`CALENDAR_SLUG`를 여기서 가져온다.
