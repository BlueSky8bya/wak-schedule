# ADR-0009: 아바타 자리 → '그 달 메모' (공개 렌더, 편집은 canEditSchedule)

Status: Accepted
Date: 2026-08-26 (사용자 확정 사양)
Decision Owners: User

## Context

왁굳형은 버츄얼이 아니라 VIC에서 물려받은 아바타 자리(avatarSlot/avatar-scene,
화면 옆 약 1/4)가 필요 없다. 그 자리에 그 달 할 일을 마인드스토밍하는 메모를 넣는다.
A-05(공개/비공개 결정)가 이 ADR로 해소됐다.

## Decision

**성격** — 편집실에서 일정을 짜면서 옆에 아이디어를 적는 '기획 동반 도구'.
일정 카드와 메모를 오가며 한 화면에서 작업하는 흐름이 핵심.
시청자는 주로 방송 화면 공유로 본다 — **공개돼도 괜찮다. 공개 포스터에 그대로 렌더한다.**

**권한**
- 쓰기 게이트는 `canEditSchedule`(= owner + developer). 일정·태그 편집과 정확히
  같은 게이트. `role === "owner"`로 직접 좁히지 않는다 — developer가 잠기면
  유지보수·검증이 불가능해진다.
- 서버 액션에서 `canEditSchedule`을 반드시 재검사(클라 게이트는 UX일 뿐, BR-AUTHZ-001).
- developer 역할 미리보기 중에는 기존 `blockedByPreview()` 규칙 그대로(쓰기 차단).
  새 예외 금지.
- viewer는 읽기만. **시청자 쓰기 없음** — 익명 쓰기 API·도배 방어·신고/모더레이션
  전부 불필요, 만들지 않는다. (동접 2만에서 시청자 쓰기는 별개 L3 과제 — 범위 아님)

**구현 — 기존 자산 재사용. 새 테이블·새 공개 쓰기 엔드포인트 금지**
- `calendars.public_memo` / `public_memo_lines` + `MemoLine` 타입이 이미 있다
  (마이그레이션 0003·0017·0018, 활성 체인 포함).
- 공개 로더가 이미 `publicMemo`·`memoAlign`·`memoVAlign`·`memoLines`를 DTO로
  내보낸다(`lib/schedules/public-loader.ts`, CalendarMeta) — 경계 작업 사실상 완료.
- 쓰기는 서버 액션 하나. `canEditSchedule` + 캐시 무효화 3줄(BR-CACHE-001).

**표면 제약** — 포스터 표면 기하(고정 폭 1840, 세로로 자람)는 건드리지 않는다
(BR-EXPORT-001).

## 남은 판단 (구현 계획에서 에이전트가 정해 제안)

1. 아바타 자리 마크업(avatarSlot/avatar-scene/.avatar-rail)을 메모 UI로 교체 vs
   아바타 코드 걷어내고 새로 작성
2. 편집 UX — MemoLine 줄별 정렬·들여쓰기 유지 vs 단순 텍스트
3. 낙관적 쓰기 큐 태울지

## Validation

구현 시: vitest 게이트 + 공개 DTO 검사. 화면 흐름은 사용자 확인(DELEGATED).
