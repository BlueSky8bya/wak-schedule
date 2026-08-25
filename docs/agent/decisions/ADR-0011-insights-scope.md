# ADR-0011: 월별 인사이트 재도입 — 일정 파생 데이터만

Status: Accepted
Date: 2026-08-26
Decision Owners: User (재도입 지시) + Agent (범위 경계)

## Context

사용자가 VIC의 '월별 인사이트'를 관리 영역에 되살리라고 지시했다. 그러나 VIC 인사이트의
데이터 원천 중 방문/체류(visit_session)·방송시간 추적·비공개 레이어는 이 프로젝트에서
ADR-0004로 제거됐다(동접 5천~2만에서 요청당 쓰기 병목).

## Decision

월별 인사이트를 **일정 파생 데이터만으로** 새로 만든다(ADR-0004는 유지 — 수집 재도입 없음):

- 원천: events · event_tags · broadcast_tags · event_hearts · teaser_hope (전부 기존 테이블)
- 지표: 그 달 방송/휴뱅 일수, 카테고리·태그(대분류) 분포와 순위, 하트 합계·상위 일정,
  기대돼요 합계, 전월 대비 증감
- 접근: canEditSchedule(owner+developer)만 — 편집실 관리 영역 버튼
- 읽기 전용 집계(서버 액션 select만) — 쓰기 없음, 캐시 무효화 불필요

**불가 지표(원천 없음, 요구 시 별도 ADR):** 방문자 수·체류시간·동접, 실제 방송 시간,
시청자 행동 로그. Vercel Analytics 대시보드가 방문 지표를 부분 대체한다.

## Consequences

- (+) 요청당 쓰기 0 유지 — 트래픽 원칙 불변.
- (−) VIC 인사이트의 방문·방송시간 패널은 재현 불가 — 사용자에게 고지됨.
