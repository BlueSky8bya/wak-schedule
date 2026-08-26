-- 0065: 메모 개편 — 월별 단일 메모 → 여러 장의 붙임쪽지(calendar_memos) (ADR-0014)
--
-- (calendar, user) 스코프의 쪽지 목록. 서식은 쪽지 단위(배경색·글씨체·크기·굵기).
-- 기존 calendar_month_memos는 보존하고(파괴 없음) 1회만 이식한다(제목 'N월 메모').
-- RLS: 관리자이면서 자기 것만(user_id = auth.uid()) — 0063과 같은 문법.
-- 멱등.

create table if not exists public.calendar_memos (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  color text not null default 'yellow',
  font_family text not null default 'sans',
  font_size int not null default 15,
  bold boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_memos_user_idx
  on public.calendar_memos (calendar_id, user_id, updated_at desc);

alter table public.calendar_memos enable row level security;

drop policy if exists "admins manage own memos" on public.calendar_memos;
create policy "admins manage own memos"
  on public.calendar_memos
  for all
  using (public.is_calendar_admin(calendar_id) and user_id = auth.uid())
  with check (public.is_calendar_admin(calendar_id) and user_id = auth.uid());

-- 새 RLS 테이블 규칙: service_role GRANT를 반드시 같이 (없으면 서버 쓰기 42501).
grant select, insert, update, delete on public.calendar_memos to service_role;

-- 1회 이식: 쪽지가 하나도 없을 때만(재실행 안전). '2026-08' → '8월 메모'.
insert into public.calendar_memos (calendar_id, user_id, title, body, created_at, updated_at)
select
  m.calendar_id,
  m.user_id,
  ltrim(split_part(m.ym, '-', 2), '0') || '월 메모',
  m.body,
  coalesce(m.updated_at, now()),
  coalesce(m.updated_at, now())
from public.calendar_month_memos m
where m.body <> ''
  and not exists (select 1 from public.calendar_memos);
