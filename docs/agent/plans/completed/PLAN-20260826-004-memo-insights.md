# Active ExecPlan

Plan ID: PLAN-20260826-004
Status: Completed
Task Risk: L2
Created: 2026-08-26

## Objective (사용자 지시 2026-08-26)

1. T-3: 아바타 자리 → '그 달 메모' — **편집실 전용**. 포스터(시청자 화면)의 아바타
   기능은 제거(왁굳형은 버츄얼 아님).
2. 관리 영역: 드롭다운 대신 **버튼 2개 나란히** — [태그 편집] [월별 인사이트].
3. 월별 인사이트 재도입 — 단 **일정 파생 데이터만**(events·tags·hearts·hope).
   VIC의 방문/체류·방송시간·비공개 기반 지표는 데이터 원천이 없어 불가(ADR-0004 유지).
4. 병행: 사용자가 "렌더 깨짐"이라 한 부분 식별(fixture 스크린샷) 후 수정.

## 결정 (이 계획에서 확정)

- ADR-0009 수정: 메모 공개 렌더 조항 폐기 → 편집실 전용. 판단 3개 확정:
  ① 아바타 코드 걷어내고 그 자리에 메모 패널 신설(포스터 쪽은 삭제)
  ② 편집 UX = 단순 멀티라인 텍스트(calendars.public_memo 하나, 줄별 정렬·MemoLine 미사용
     — 마인드스토밍 용도에 구조화는 과함. 필드·마이그레이션은 존치)
  ③ 저장 = 디바운스 자동저장 + blur 저장, 직렬(마지막 승리), 낙관적 로컬 상태
- ADR-0011 신규: 월별 인사이트 범위 = 일정 파생 통계만.

## Milestones

M1. 결정 기록(ADR-0009 amend·ADR-0011) + 이 계획
M2. lib/schedules/memo-actions.ts (canEditSchedule 재검사 + revalidate 3줄)
    + components/studio/month-memo.tsx + studio-shell 아바타 자리 대체
M3. 포스터 아바타 기능 제거(public-poster.tsx, 토글 키 포함)
M4. lib/schedules/insights-actions.ts (읽기 전용 집계) + components/studio/month-insights.tsx
    + 관리 버튼 2개(드롭다운 해체)
M5. fixture 스크린샷으로 시각 확인(+"렌더 깨짐" 식별·수정) → 게이트 4종 → 커밋·배포

## Rollback

커밋 단위 revert. DB 변경 없음(기존 public_memo 컬럼 사용).

## Progress Log

### 2026-08-26

- VIC 인사이트 조사: lib/insights/actions.ts 2280줄이 visit_session·private-layer·방송시간
  RPC 의존 — 이식 불가 판정, wak 네이티브로 새로 작성(일정 파생만).
- studio-shell 6110줄: 관리 드롭다운 5077~, 아바타 컨트롤 5114~, 아바타 상태 650~700.

### 2026-08-26 — 완료

- M2: memo-actions(무효화 3줄) + MonthMemo(디바운스 1.2s+blur, 직렬 마지막 승리) +
  아바타 rail 내용 교체(CSS 클래스는 유산 이름 유지, pointer-events auto로).
- M3: 포스터 아바타 전면 제거 — props·상태·컨트롤·scene·slot·side-rail. 라이브 카드
  조건 단순화. fixture avatar 파라미터 제거.
- M4: insights-actions(읽기 전용 집계 — BR-CACHE-001 스윕이 .rpc( 패턴으로 잡아
  EXCEPT에 사유와 함께 등록) + MonthInsightsPanel(타일·태그 순위 바·하트 TOP3·전월
  비교) + 관리 버튼 2개(드롭다운 상태·이펙트 제거) + 모달 죽은 분기 정리.
- M5: "렌더 깨짐" 식별 — 사용자가 본 것은 ① 옛 빌드(webhook 누락) ② VIC Studio
  문구(에러/404/로그인 eyebrow — SITE_NAME으로 교체) ③ 빈 아바타 점선 상자(메모로
  대체됨). fixture 스크린샷(프로덕션 빌드)으로 편집실·포스터 시각 확인 완료.
  로컬 스크린샷 삽질 원인: 포트 3100 좀비 dev 서버(taskkill로 정리).
- 인사이트 모달 실클릭은 owner 로그인 필요 — EXTERNAL-VERIFICATION-PENDING(사용자).
