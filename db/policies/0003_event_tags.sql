-- event_tags RLS 정책.
-- (0001에서 RLS는 켰지만 정책을 빠뜨리면 모든 접근이 차단된다 → 태그 저장 실패의 원인이었다.)

-- 부모 이벤트를 볼 수 있으면 그 이벤트의 태그도 읽을 수 있다.
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
