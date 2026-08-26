-- 0063: 월별 메모 계정별 분리 + 게이트 비밀번호 변경시각 (2026-08-26 사용자 결정)
--
-- ① 메모는 (calendar, user, ym) 단위 — 개발자와 관리자, 그리고 관리자 계정끼리도
--    서로의 메모를 보지 않는다. RLS가 user_id = auth.uid()를 강제한다.
--    (기존 행은 테스트 데이터뿐이라 계정 미상 행은 지운다.)
-- ② calendars.gate_pass_updated_at — 보안 탭 '마지막 변경' 표기용.
-- 멱등.

alter table public.calendar_month_memos
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

delete from public.calendar_month_memos where user_id is null;

alter table public.calendar_month_memos
  alter column user_id set not null;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage k
      on k.constraint_name = tc.constraint_name and k.table_name = tc.table_name
    where tc.table_name = 'calendar_month_memos'
      and tc.constraint_type = 'PRIMARY KEY'
    group by tc.constraint_name
    having count(*) = 2 -- 옛 PK(calendar_id, ym)
  ) then
    alter table public.calendar_month_memos drop constraint calendar_month_memos_pkey;
    alter table public.calendar_month_memos
      add primary key (calendar_id, user_id, ym);
  end if;
end $$;

-- RLS: 관리자이면서 '자기 것'만.
drop policy if exists "admins manage month memos" on public.calendar_month_memos;
create policy "admins manage month memos"
  on public.calendar_month_memos
  for all
  using (public.is_calendar_admin(calendar_id) and user_id = auth.uid())
  with check (public.is_calendar_admin(calendar_id) and user_id = auth.uid());

alter table public.calendars
  add column if not exists gate_pass_updated_at timestamptz;
