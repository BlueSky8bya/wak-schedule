-- 0066: 메모 수동 순서(ADR-0015) — updated_at 정렬의 '수정하면 점프' 문제 해소.
-- sort_order가 유일한 기본 정렬 진실이 된다(수정 시간은 정보 표시만).
-- 재정렬은 단일 UPDATE(RPC)로 원자 적용. 멱등.

alter table public.calendar_memos
  add column if not exists sort_order integer;

-- backfill: 계정·캘린더별 현재 보이는 순서(updated_at desc)를 0부터.
update public.calendar_memos m
set sort_order = t.ord
from (
  select id,
    row_number() over (
      partition by calendar_id, user_id
      order by updated_at desc, created_at desc, id
    ) - 1 as ord
  from public.calendar_memos
) t
where m.id = t.id and m.sort_order is null;

alter table public.calendar_memos
  alter column sort_order set default 0;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'calendar_memos' and column_name = 'sort_order' and is_nullable = 'YES'
  ) then
    alter table public.calendar_memos alter column sort_order set not null;
  end if;
end $$;

create index if not exists calendar_memos_order_idx
  on public.calendar_memos (calendar_id, user_id, sort_order);

-- 재정렬 RPC — 본인 메모만, 한 문장 UPDATE(원자). RLS는 invoker 권한으로 그대로 적용.
create or replace function public.reorder_calendar_memos(p_calendar uuid, p_ids uuid[])
returns void
language sql
as $$
  update public.calendar_memos m
  set sort_order = t.ord - 1
  from unnest(p_ids) with ordinality as t(id, ord)
  where m.id = t.id
    and m.calendar_id = p_calendar
    and m.user_id = auth.uid();
$$;

grant execute on function public.reorder_calendar_memos(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_calendar_memos(uuid, uuid[]) to service_role;
