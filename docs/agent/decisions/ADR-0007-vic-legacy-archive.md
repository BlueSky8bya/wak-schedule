# ADR-0007: 제거 기능 마이그레이션은 삭제하지 않고 db/_vic-legacy/에 보관

Status: Accepted
Date: 2026-08-26 (백필, 커밋 f422a96)
Decision Owners: Agent-assisted

## Context

제거 기능(스티커·비공개 레이어·업 도움·신뢰 멤버·로그·프레즌스·성능 표본·방송
세션)의 SQL을 지우면 재도입 시 VIC 원본 저장소에 다시 의존해야 한다.

## Decision

`db/_vic-legacy/`에 참고용으로 보관한다. **적용 금지.** 재도입 시 축소된 0001
스키마와의 정합을 반드시 재검토한다.

## Consequences

- (+) 이력 보존, 재도입 시 출발점 존재.
- (−) 실수로 적용하면 스키마 오염 — `db/README.md`와 이 ADR이 금지를 명시한다.
