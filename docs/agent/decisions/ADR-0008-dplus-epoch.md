# ADR-0008: D+ 기준일 = 숲 복귀 첫 방송 2024-02-04

Status: Proposed  # 사용자(팬 지식) 확인 전까지 Accepted 금지
Date: 2026-08-26 (백필, 커밋 fcde3c6)
Decision Owners: Agent-proposed, User 확정 대기

## Context

D+ 카드의 기준일이 필요하다. 실제 방송 시작은 2008년 말이지만 정확한 날짜가
공개돼 있지 않다.

## Decision (제안)

출처가 분명한 SOOP 복귀 첫 방송 **2024-02-04**를 `DEBUT_ISO`로 쓴다. 기준 변경은
`lib/calendar/holidays.ts`의 `DEBUT_ISO` 한 곳 — 레일 D+ 카드와 100일 마일스톤이
함께 따라간다.

## 미확정 사실 (사용자 확인 필요)

- 출처가 위키백과·나무위키(2026-08 확인) — 팬 확인 필요.
- 트위치 이적일은 "2016년 8월"까지만 확인돼 1일로 임시 기입.
- 기타 기념일: 생일 7/24, 이세돌 데뷔 12/17(2021).

## Validation

사용자 확정 → Status를 Accepted로 올리고 필요 시 날짜 수정.
