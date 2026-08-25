# ADR-0010: VOD(다시보기) 연동은 자동 — 비공식 API 허용

Status: Accepted (방향 결정 — 상세 설계는 T-7 계획에서)
Date: 2026-08-26
Decision Owners: User

## Context

방종된 날짜의 팝오버에 VOD 버튼을 띄워 시청자가 다시보기로 바로 가게 한다(T-7).
링크 수동 입력안은 기각 — 운영자(사용자)가 매일 확인할 수 없고, 왁굳형은 새벽 5시
방종도 잦다. 사람 손을 타면 안 붙는 기능이다.

## Decision

- VOD 매칭은 **자동**. SOOP 비공식 API(채널 VOD 목록,
  https://www.sooplive.com/station/ecvhao/vod/review 이면의 조회 API)를 써도 된다.
- 단 기존 원칙 유지:
  - 외부 호출은 서버가 캐시로 대신 — 시청자 수와 무관하게 고정 (ADR-0004)
  - 비공식 API 실패는 조용히 — VOD 버튼이 안 뜰 뿐, 포스터는 흔들리지 않는다 (ADR-0005와 동일 철학)
  - 어댑터는 lib/live처럼 플랫폼 중립 구조로
- 수동 오버라이드(관리자가 특정 일정에 링크 직접 지정)는 자동의 보조로 열어둘 수 있다 — 설계에서 결정.

## Consequences

- (+) 운영 부담 0. 새벽 방종도 자동으로 따라간다.
- (−) 비공식 API 파손 리스크 — 조용한 실패 + 어댑터 격리로 흡수.

## Revisit Conditions

SOOP가 공식 API를 열거나, VOD 응답 형식이 바뀌어 매칭 정확도가 떨어질 때.
