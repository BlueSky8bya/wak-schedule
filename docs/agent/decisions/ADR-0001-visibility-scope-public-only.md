# ADR-0001: visibility_scope enum을 'public' 하나로 축소

Status: Accepted
Date: 2026-08-26 (결정 자체는 커밋 f422a96, 이 문서는 백필)
Decision Owners: User + Agent-assisted
Related Change IDs: f422a96

## Context

VIC 원본에는 비공개 레이어(엠바고·작업자 범위·잠금 비밀번호·본문 AES 암호화)가 있었다.
이 프로젝트는 운영자가 사실상 한 명이라 "누가 볼 수 있나"를 판정할 자리가 없다.

## Decision

`visibility_scope` enum 값을 `'public'` 하나로 줄인다. 비공개 행이 DB에
**존재할 수 없게** 한다 — 애플리케이션이 아니라 DB 타입이 강제한다.
유일한 정보 경계는 발행 전(draft)과 시각 미도래 떡밥의 '내용' 비노출이며,
이는 행의 비공개가 아니라 공개 DTO 조립 단계에서 처리한다.

## Rationale

경계를 앱 코드에 두면 코드 경로 하나만 빠뜨려도 유출된다. 타입 층에서 막으면
우회 자체가 불가능하다.

## Consequences

- (+) 공개 경계 감사 범위가 DTO 조립부로 좁아진다.
- (−) 비공개 레이어를 되살리려면 enum 확장 + RLS + 앱 전면 재작업 (되돌리기 비용 높음).

## Revisit Conditions

운영자가 늘어 작업자 범위가 필요해질 때. 그 경우 `db/_vic-legacy/` 참고하되
축소된 0001 스키마와의 정합을 재검토한다(ADR-0007).

## Validation

T-1에서 DB 적용 후 `verify-db.mjs` + enum 값 조회. 그 전까지 코드층은
`tests/unit/public-dto.test.ts`가 부분 검증. (BR-ENUM-001)
