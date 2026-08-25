# ADR-0004: 요청당 DB 쓰기 기능(방문 로그·프레즌스·인사이트·성능 표본) 제거

Status: Accepted
Date: 2026-08-26 (백필, 커밋 f422a96)
Decision Owners: User + Agent-assisted

## Context

우왁굳님 방송 동접은 5,000~20,000명(사용자 명시). VIC의 방문/행동 로그·프레즌스
비콘·인사이트 대시보드·서버 성능 표본은 요청·비콘마다 DB에 쓴다 — 이 규모에서
쓰기 자체가 병목이 된다.

## Decision

해당 기능의 DB 기록을 전부 뺀다. Server-Timing 계측(`lib/perf`)은 남기되 콘솔
로그만(`PERF_LOG`). 외부/저장소 부하는 시청자 수와 무관하게 고정한다:
- 라이브 상태: 서버 20초 캐시 폴링(`app/api/live`) — 외부 API 호출 고정
- 공개 스케줄: `unstable_cache` 300초 + 태그 무효화
- 미들웨어: `api/live`·`api/public`은 matcher 제외 (CHG-20260826-001)

## Consequences

- (+) 시청자 수 스파이크가 DB 쓰기량에 전달되지 않는다.
- (−) 방문 통계·프레즌스 UI 없음. 재도입하려면 집계형/샘플링으로 재설계해야 한다.

## Revisit Conditions

통계 요구가 생길 때 — 요청당 쓰기가 아니라 집계 테이블/샘플링/외부 애널리틱스로
설계하고 새 ADR을 남긴다. (현재 Vercel Analytics 패키지가 그 자리를 일부 대신한다.)

## Validation

첫 병목 후보는 `public-loader`의 `loadLiveEventHeartCounts`(캐시 밖 매 요청 읽기) —
배포 후 실측 대상 (T-4).
