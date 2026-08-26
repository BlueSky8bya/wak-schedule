-- 0061: 월별 메모 (ADR-0009 3차, 2026-08-26 사용자 결정)
--
-- '이 달 메모'는 달력의 달을 넘기면 그 달의 메모로 갱신되어야 한다 — 전역 텍스트
-- (calendars.public_memo)가 아니라 (calendar, 연-월) 단위 저장이 맞다.
-- public_memo 컬럼은 남긴다(과거 호환·포스터 메모 기능이 다시 생기면 그쪽 몫).
-- 편집실 전용 데이터 — 공개 API에 실리지 않는다.
-- 멱등. 적용: node scripts/apply-db.mjs db/migrations/0061_month_memos.sql

create table if not exists public.calendar_month_memos (
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  ym text not null check (ym ~ '^[0-9]{4}-[0-9]{2}$'), -- 'YYYY-MM' (KST 달력 기준)
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (calendar_id, ym)
);

alter table public.calendar_month_memos enable row level security;

-- 읽기·쓰기 모두 관리자(소유자·공동 소유자·플랫폼 개발자)만 — 편집실 전용.
drop policy if exists "admins manage month memos" on public.calendar_month_memos;
create policy "admins manage month memos"
  on public.calendar_month_memos
  for all
  using (public.is_calendar_admin(calendar_id))
  with check (public.is_calendar_admin(calendar_id));

-- ⚠ 새 RLS 테이블은 service_role GRANT를 반드시 같이 준다(CLAUDE.md — 없으면 서버 쓰기가
--   permission denied(42501)로 조용히 죽는다).
grant select, insert, update, delete on public.calendar_month_memos to authenticated;
grant all on public.calendar_month_memos to service_role;
