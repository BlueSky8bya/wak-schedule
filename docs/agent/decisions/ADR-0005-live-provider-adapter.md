# ADR-0005: 라이브 연동은 플랫폼 중립 어댑터

Status: Accepted
Date: 2026-08-26 (백필, 커밋 f422a96)
Decision Owners: User + Agent-assisted

## Context

방송 플랫폼은 현재 SOOP이지만 과거 트위치→아프리카TV 이력이 있고 이적 가능성은
항상 있다. 플랫폼 API는 비공식이라 깨질 수 있다.

## Decision

`lib/live/`에 `LiveProvider` 인터페이스(soop/chzzk/none). `LIVE_PROVIDER` env로
선택(기본 soop), 채널 id 비면 조용히 꺼짐. 실패 시 throw 없이 오프라인 폴백
(라이브 배지는 부가 정보 — 포스터의 전제조건이 아니다). 서버가 20초 캐시로 대신
폴링, 브라우저는 `/api/live`만 본다.

SOOP 채널 id: `ecvhao` (사용자 제공, 2026-08-26. `.env.example` 기본값).

## Consequences

- (+) 플랫폼 이적 = env 변경 + 어댑터 파일 하나.
- (−) 비공식 API 파손은 조용한 오프라인으로 나타난다 — 알림 없음.

## Revisit Conditions

플랫폼 이적, 또는 SOOP 응답 형식 변경 감지 시.
