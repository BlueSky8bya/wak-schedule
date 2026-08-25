-- [WH-CHANGE v0.1.0 | FIX | 2026-08-26 | CHG-20260826-006]
-- Reason: 멱등 계약(db/README.md) 위반 — create policy는 재실행에서 already exists로
--   실패한다. 각 create policy 앞에 drop policy if exists를 둔다(정의 변경도 안전).
-- event_tags RLS 정책.
-- (0001에서 RLS는 켰지만 정책을 빠뜨리면 모든 접근이 차단된다 → 태그 저장 실패의 원인이었다.)

-- 부모 이벤트를 볼 수 있으면 그 이벤트의 태그도 읽을 수 있다.
drop policy if exists "read event tags for visible events" on public.event_tags;
create policy "read event tags for visible events"
  on public.event_tags for select
using (
  exists (
    select 1
    from public.events e
    where e.id = event_tags.event_id
      and (
        (e.visibility_scope = 'public' and e.status <> 'draft')
        or public.is_calendar_admin(e.calendar_id)
      )
  )
);

-- owner/developer는 자기 캘린더 이벤트의 태그를 생성/수정/삭제할 수 있다.
drop policy if exists "admins manage event tags" on public.event_tags;
create policy "admins manage event tags"
  on public.event_tags for all
using (
  exists (
    select 1 from public.events e
    where e.id = event_tags.event_id and public.is_calendar_admin(e.calendar_id)
  )
)
with check (
  exists (
    select 1 from public.events e
    where e.id = event_tags.event_id and public.is_calendar_admin(e.calendar_id)
  )
);
