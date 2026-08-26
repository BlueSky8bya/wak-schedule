# Decision Index

| Record | Status | Area | Decision | Revisit Trigger |
|---|---|---|---|---|
| [ADR-0001](decisions/ADR-0001-visibility-scope-public-only.md) | Accepted | DB/보안 | visibility_scope = 'public' 하나 | 운영자 확대 |
| [ADR-0002](decisions/ADR-0002-three-roles.md) | Accepted | 권한 | 역할 owner/developer/viewer 셋 | 편집 위임 필요 |
| [ADR-0003](decisions/ADR-0003-no-decoration.md) | Accepted | 제품 | 꾸미기 전면 제거 | 커스터마이즈 요구 |
| [ADR-0004](decisions/ADR-0004-no-per-request-writes.md) | Accepted | 성능 | 요청당 DB 쓰기 기능 제거 | 통계 요구(집계형 재설계) |
| [ADR-0005](decisions/ADR-0005-live-provider-adapter.md) | Accepted | 연동 | 라이브 = 플랫폼 중립 어댑터, soop=ecvhao | 플랫폼 이적 |
| [ADR-0006](decisions/ADR-0006-site-config-single-source.md) | Accepted | 구조 | site.ts 단일 출처 | — |
| [ADR-0007](decisions/ADR-0007-vic-legacy-archive.md) | Accepted | DB | _vic-legacy 보관·적용 금지 | 기능 재도입 |
| [ADR-0008](decisions/ADR-0008-dplus-epoch.md) | Accepted | 달력 | 기념일=생일뿐, D+ 기준 2008-11-01(일자 임시) | 실제 첫 방송 일자 확인 |
| [ADR-0009](decisions/ADR-0009-monthly-memo.md) | Accepted(2차 수정) | 제품 | 그 달 메모 — 편집실 전용, 포스터 아바타 제거, public_memo 재사용 | 시청자 쓰기 요구(별개 L3) |
| [ADR-0010](decisions/ADR-0010-auto-vod.md) | Accepted | 연동 | VOD 연동 자동(비공식 API 허용, 서버 캐시·조용한 실패) | SOOP 공식 API / 형식 변경 |
| [ADR-0011](decisions/ADR-0011-insights-scope.md) | Accepted | 제품 | 월별 인사이트 = 일정 파생 데이터만(수집 재도입 없음) | 방문 지표 요구 시 |
| [ADR-0012](decisions/ADR-0012-broadcast-hours.md) | Accepted | 제품 | 방송시간 추적 재도입 — 라이브 캐시 피기백(고정 부하) | 표본 공백 문제 시 |

열림: A-04(개인 도구 저장소 잔류 여부). A-05는 ADR-0009로 해소.
