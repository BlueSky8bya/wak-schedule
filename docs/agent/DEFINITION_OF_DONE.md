# Definition of Done

작업 완료 판정 기준. "코드를 썼다"와 "작업을 완료했다"는 다르다.

## 기본 게이트 (모든 코드 변경)

```text
npm run typecheck   # exit 0
npm run lint        # exit 0 (max-warnings=0)
npm test            # exit 0 (vitest, 현재 197개)
npm run build       # exit 0 — tail이 아니라 exit code를 본다
```

넷 다 통과 후 공개/비공개 경계 재확인 → 커밋.

## Verification Capability Boundary

| Criterion | Capability | Executor | Required Environment | Evidence | Blocking |
|---|---|---|---|---|---|
| typecheck / lint / vitest / build | DIRECT | Agent | 현 환경 | 명령 출력 + exit code | Yes |
| Playwright e2e·visual | INDIRECT | Agent + dev 서버 | Supabase 연결 후 (`tests/README.md`) | 테스트 리포트 | T-5 전 No |
| DB 스키마 적용·RLS 동작 | DELEGATED→SHARED | 사용자(Supabase 계정) + Agent(`verify-db.mjs`) | Supabase 프로젝트, `.env.local` | `apply-db`/`verify-db` 출력 | T-1에서 Yes |
| 실 브라우저/모바일 체감 | DELEGATED | 사용자 | 기기·눈 | 사용자 확인/스크린샷 | UI 작업 시 |
| 라이브 배지 실동작 | DELEGATED | 사용자 | `SOOP_BJ_ID=ecvhao` + 실제 방송 중 | 화면 확인 | No |
| 기념일 날짜 정확성 | DELEGATED | 사용자(팬 지식) | — | 사용자 확정 (ADR-0008) | No |
| GitHub Actions CI 초록 | INDIRECT | Agent(`gh run list`) 또는 사용자 | push 후 | 실행 결과 링크 | M3에서 Yes |
| Vercel 배포 | DELEGATED | 사용자 | Vercel 계정 | 배포 URL 응답 | 배포 시 Yes |

## 상태 어휘 (혼용 금지)

- `IMPLEMENTED` — 코드 작성됨, 검증 전
- `AGENT-VERIFIED` — DIRECT/INDIRECT 검증 통과
- `EXTERNAL-VERIFICATION-PENDING` — DELEGATED 검증 대기 (완료처럼 표현 금지)
- `ACCEPTED` — 외부 검증 주체가 확인함

## 영역별 추가 기준

### 공개 표면 (포스터·공개 API)
- draft·시각 미도래 떡밥 내용이 응답에 없는가 (`public-dto.test`, `public-boundary.test`)
- 새 공개 라우트 → `public-boundary.test.ts`의 `publicSurfaceFiles`에 추가했는가
- 새 폴링 라우트 → `middleware.ts` matcher + `middleware-matcher.test.ts` 갱신했는가

### 쓰기 액션
- 권한 재검사 존재 (BR-AUTHZ-001)
- revalidate 3줄 (BR-CACHE-001 — 테스트가 소스 스윕으로 잡는다)
- 낙관적 쓰기면 직렬 큐·canonId 규칙 (`CLAUDE.md#낙관적-쓰기`)

### UI
- 웹/모바일 두 네이티브 레이아웃 (같은 DOM 배율 축소는 결함)
- 토큰 참조(하드코딩 금지), `:active`·`var(--ease)` 모션, 햅틱
- 로딩 스켈레톤은 실제 내용 자리

### DB (DESTRUCTIVE_DATA)
- 멱등성 유지, service_role GRANT 동반(새 RLS 테이블), 롤백 경로 기술
- 실 DB 적용은 사용자 승인 후 → `verify-db.mjs`

## Done Report 형식

프로토콜 §35 축약형 — Task / Risk / Acceptance Status / Changed+Why / Files /
Validation Executed(명령→결과) / External Validation Required / Rollback / Next.
