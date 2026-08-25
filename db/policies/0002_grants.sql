-- "Automatically expose new tables"를 끈 프로젝트라, 새 테이블에 API 역할 권한을
-- 수동으로 부여한다. 행 단위 접근 제어는 여전히 RLS가 담당한다.
-- platform_admins는 의도적으로 제외(잠금 유지) — security-definer 함수/service_role로만 접근.
--
-- ⚠ 함정(VIC에서 두 번 당함): RLS를 켠 새 테이블은 service_role에게도 테이블 GRANT가 없으면
--   서버 쓰기가 "permission denied(42501)"로 조용히 죽는다. 새 테이블을 만들면 여기도 갱신할 것.

grant usage on schema public to anon, authenticated;

-- 공개 읽기 (anon + authenticated). 발행 전(draft) 행은 RLS가 걸러낸다.
grant select on
  public.calendars,
  public.broadcast_tags,
  public.color_palette,
  public.events,
  public.event_tags
to anon, authenticated;

-- owner/developer 쓰기 (authenticated; RLS가 행 단위로 owner/developer만 허용)
grant insert, update, delete on
  public.calendars,
  public.events,
  public.event_tags,
  public.broadcast_tags,
  public.color_palette
to authenticated;

-- service_role(서버 관리자 클라이언트)은 전체 접근. RLS는 우회하지만 테이블 권한은 필요.
grant all on all tables in schema public to service_role;
grant usage on schema public to service_role;
