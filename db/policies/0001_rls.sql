-- [WH-CHANGE v0.1.0 | FIX | 2026-08-26 | CHG-20260826-006]
-- Reason: 멱등 계약(db/README.md) 위반 — create policy는 재실행에서 already exists로
--   실패한다. 각 create policy 앞에 drop policy if exists를 둔다(정의 변경도 안전).
-- 행 수준 보안(RLS) — 축소 모델.
--
-- 이 프로젝트의 데이터 모델은 VIC(빅토리) 원본보다 훨씬 단순하다:
--   · 모든 일정이 공개다(비공개 레이어·엠바고·작업자 없음 → visibility_scope enum 값이 'public' 하나뿐).
--   · 쓰기 주체는 소유자(스트리머·공동 소유자)와 플랫폼 개발자뿐이다(매니저·작업자 없음).
-- 그래서 "누가 볼 수 있나"를 판정할 자리가 없고, 남는 규칙은 두 줄이다:
--   1) 공개 행은 누구나 읽는다(draft 제외).
--   2) 쓰기는 캘린더 관리자(소유자 또는 개발자)만.
--
-- ⚠ 이 파일은 아직 어떤 실제 데이터베이스에도 적용된 적이 없다. 새 Supabase 프로젝트에 처음
--   적용한 뒤 `node scripts/verify-db.mjs`로 반드시 확인할 것.

alter table public.calendars enable row level security;
alter table public.color_palette enable row level security;
alter table public.broadcast_tags enable row level security;
alter table public.events enable row level security;
alter table public.event_tags enable row level security;
alter table public.platform_admins enable row level security;

-- platform_admins에는 허용 정책이 없다: anon/auth 클라이언트로는 읽기/쓰기가 불가능하며
-- 아래의 security-definer 헬퍼 함수와 service-role 클라이언트로만 접근된다. 이렇게 해서
-- 개발자 허용목록을 모든 일반 쿼리에서 제외한다.

create or replace function public.is_developer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
  );
$$;

-- 주 소유자(calendars.owner_id) 또는 공동 소유자(calendar_co_owners).
-- 공동 소유자 절은 0020 마이그레이션이 그 테이블을 만든 뒤 0007_calendar_co_owners.sql이 덧댄다.
create or replace function public.is_calendar_owner(target_calendar_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendars c
    where c.id = target_calendar_id
      and c.owner_id = auth.uid()
  );
$$;

-- 캘린더 관리자 = 이 캘린더를 소유한 스트리머, 또는 플랫폼 개발자 누구든.
create or replace function public.is_calendar_admin(target_calendar_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_calendar_owner(target_calendar_id) or public.is_developer();
$$;

drop policy if exists "public can read public calendars" on public.calendars;
create policy "public can read public calendars"
  on public.calendars for select
using (is_public = true);

drop policy if exists "owners can manage calendars" on public.calendars;
create policy "owners can manage calendars"
  on public.calendars for all
using (public.is_calendar_admin(id))
with check (public.is_calendar_admin(id));

-- 공개 읽기의 유일한 조건: 발행된(draft 아닌) 행. visibility_scope는 값이 하나뿐이라
-- 조건에 넣지 않아도 같은 의미지만, 의도를 문서화하려고 명시해 둔다.
drop policy if exists "public can read public events" on public.events;
create policy "public can read public events"
  on public.events for select
using (visibility_scope = 'public' and status <> 'draft');

drop policy if exists "owners can manage events" on public.events;
create policy "owners can manage events"
  on public.events for all
using (public.is_calendar_admin(calendar_id))
with check (public.is_calendar_admin(calendar_id));

drop policy if exists "public can read active tags" on public.broadcast_tags;
create policy "public can read active tags"
  on public.broadcast_tags for select
using (is_active = true);

drop policy if exists "public can read palette" on public.color_palette;
create policy "public can read palette"
  on public.color_palette for select
using (true);

drop policy if exists "owners can manage tags" on public.broadcast_tags;
create policy "owners can manage tags"
  on public.broadcast_tags for all
using (public.is_calendar_admin(calendar_id))
with check (public.is_calendar_admin(calendar_id));

drop policy if exists "owners can manage palette" on public.color_palette;
create policy "owners can manage palette"
  on public.color_palette for all
using (public.is_calendar_admin(calendar_id))
with check (public.is_calendar_admin(calendar_id));
