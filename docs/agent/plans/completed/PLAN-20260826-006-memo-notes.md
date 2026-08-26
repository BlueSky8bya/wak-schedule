# PLAN-20260826-006 — 메모 개편: 런처 + 붙임쪽지 팝오버 (사용자 요청)

Status: In Progress · 2026-08-26

## 요구(사용자, 스크린샷 3장)

1. 레일의 단일 '이 달 메모' 텍스트영역 → **메모 런처**(목록 + `+` 새 메모, 행별 삭제).
2. 행 클릭 → **떠 있는 붙임쪽지 창**: 마우스로 위치 이동 가능.
3. 쪽지 설정: 글자 크기·글씨체 + (참고 이미지의) B/색상 → 쪽지 배경색·굵기.

## 설계 결정

- 데이터: 새 테이블 `calendar_memos`(id PK, calendar+user 스코프, title/body/color/
  font_family/font_size/bold). 월(ym) 구속 제거 — 참고 이미지의 "[매 달 방향성]"처럼
  달을 넘는 메모가 자연스러움. 기존 `calendar_month_memos`는 **보존**하고 1회 이식
  (제목 "N월 메모"). ADR-0009는 ADR-0014로 대체.
- 서식은 **쪽지 단위**(전체 굵기/크기/글씨체/배경색) — contentEditable 리치텍스트는
  범위 밖(부분 서식 없음). 본문은 plain text 유지(각주: XSS 표면 없음).
- 위치는 localStorage(기기 편의) — 서버엔 내용·서식만.
- 액션은 memo-actions.ts에 추가(관리자 전용 데이터 — BR-CACHE-001 EXCEPT 기존 사유 승계).
- 창은 body 포털(fixed가 scene transform에 안 깨지게), 한 번에 하나.
- 게이트: 목록·열람은 로그인 관리자/개발자, 쓰기는 canWrite(미리보기 중 읽기 전용).

## 단계

1. 0065 마이그레이션(멱등, service_role GRANT, RLS user_id=auth.uid()) + 라이브 적용
2. 액션 4종(list/create/update/delete) + 한도(쪽지 30, 본문 4000, 제목 100)
3. components/studio/memo-notes.tsx(런처+창) + CSS, month-memo.tsx 대체
4. 게이트(tsc/lint/vitest/build) → ADR-0014·CHANGELOG → 커밋
