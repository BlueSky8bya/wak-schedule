# Constitution — 우왁굳 일정표

이 문서는 이 프로젝트의 불변 원칙이다. 세부 규칙·경로별 지침은 여기 없다
(→ `PROJECT_MAP.md`, `CLAUDE.md`, `.claude/rules/`).

## 1. Mission

스트리머 우왁굳님의 방송 일정 사이트. 관리자(우왁굳님 측)가 편집실에서 일정을 짜고,
시청자는 공개 포스터에서 본다. 시청자용 화면은 **팬에게 보여주는 포스터**다 —
관리 도구가 아니라 제품이다.

## 2. Product Philosophy

- 시청자 표면이 우선이다. 편집실은 관리자 몇 명, 포스터는 시청자 수천~수만 명.
- 모든 일정은 공개다. 발행 전(draft)과 시각 미도래 최초공개(떡밥)의 **내용**만
  공개 표면에서 숨긴다 — 이것이 이 제품의 유일한 정보 경계다.
- VIC(빅토리) 스케줄 스튜디오에서 갈라졌지만 **다른 제품**이다. 제거된 기능
  (비공개 레이어·꾸미기·매니저/작업자·업 도움·행동 로그·프레즌스 등)을 되살리는
  코드를 짓지 않는다. 목록은 `CLAUDE.md` "이 프로젝트의 정체".

## 3. Architecture Philosophy

- 공개/비공개 분리는 **서버에서**. CSS로 감추는 것은 분리가 아니다.
- 공개 경계: `app/(public)`·`app/api/public/*`은 `lib/schedules/public-loader`만 쓴다.
- 대형 방송 트래픽(동접 5,000~20,000)이 설계 기준이다:
  - 외부 API 호출·DB 부하는 **시청자 수와 무관하게 고정**한다(서버 캐시가 흡수).
  - 요청당 DB 쓰기 기능은 이 규모에서 병목이라 일부러 뺐다(ADR-0004).
- 결정 강제는 앱 코드보다 낮은 층이 우선: DB enum > RLS > 서버 액션 > UI 게이트.

## 4. Critical Invariants

1. 시간은 항상 KST. (BR-KST-001)
2. `visibility_scope` enum 값은 `'public'` 하나. (BR-ENUM-001, ADR-0001)
3. 일정·태그 편집은 owner(+developer)만. (BR-EDIT-001, ADR-0002)
4. 서버 액션은 항상 권한 재검사. (BR-AUTHZ-001)
5. 공개 DTO는 필드 명시 조립 — spread 금지. (BR-DTO-001)
6. 공개-영향 쓰기마다 revalidate 3줄. (BR-CACHE-001)
7. 포스터 표면 기하 고정 — scale로만 화면 맞춤. (BR-EXPORT-001)

## 5. Agent Operating Principles

- 최소 변경. 요청 밖 리팩터링 금지.
- L2/L3 작업은 `plans/ACTIVE_PLAN.md` 먼저.
- 실행하지 않은 검증을 성공이라 말하지 않는다. `next build`는 exit code 확인.
- material 결정은 같은 턴에 저장소에 기록한다(ADR 또는 CURRENT_STATE).
- Accepted ADR과 충돌하는 변경은 조용히 하지 않는다 — Supersede 절차를 밟는다.
- 파괴적 Git/DB 명령은 명시적 승인 필요.
- 커밋 메시지는 "무엇을 왜"를 한국어로.

## 6. Change Boundary

- `db/_vic-legacy/` — 적용 금지, 참고만.
- `C:\Projects\VIC Schedule studio` — 읽기 전용 참고, 수정 금지.
- 사용자 uncommitted 변경 — 보존. 정리·normalize 금지.

## 7. Verification Philosophy

- `npm run typecheck` → `lint` → `test` → `build` 네 개가 기본 게이트. 전부 exit 0.
- 검증 능력 구분(DIRECT/INDIRECT/DELEGATED/SHARED)은 `DEFINITION_OF_DONE.md`.
- Supabase·브라우저·라이브 방송이 필요한 검증은 실행 전까지
  `EXTERNAL-VERIFICATION-PENDING`이다 — 완료라 부르지 않는다.

## 8. Conflict Priority

1) 보안/정보 경계 2) KST 3) 관리자 전용 편집 4) 역할별 UX 5) 포스터 품질 6) 유지보수성
