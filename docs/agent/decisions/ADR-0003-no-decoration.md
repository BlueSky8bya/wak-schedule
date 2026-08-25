# ADR-0003: 달력 꾸미기(스티커·도형·테마 UI) 전면 제거

Status: Accepted
Date: 2026-08-26 (백필, 커밋 f422a96)
Decision Owners: User + Agent-assisted

## Context

VIC의 꾸미기(스티커·이모지·도형·텍스트 스티커·에셋 업로드·테마 전환 UI)는 이
제품의 목적(일정 전달)에 불필요하고, 스키마·스토리지·편집 UI 전반에 무게를 더한다.

## Decision

꾸미기 계열 기능·테이블·스토리지 버킷을 전부 뺀다. 포스터의 시각 품질은 디자인
토큰과 레이아웃으로 낸다.

## Consequences

- (+) 스키마 6테이블, 스토리지 의존 없음.
- (−) 되살리려면 `db/_vic-legacy/` 마이그레이션+에셋 파이프라인 재이식 (비용 높음).

## Revisit Conditions

사용자가 포스터 커스터마이즈를 요구할 때 — 그때도 전체 이식이 아니라 필요한
최소 단위만.

## Validation

`CLAUDE.md` "이 프로젝트의 정체"의 금지 목록. 코드에 꾸미기 참조 없음(grep).
