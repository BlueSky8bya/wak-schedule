create type public.event_status as enum ('draft', 'scheduled', 'live', 'done', 'cancelled');
-- 이 프로젝트의 일정은 전부 공개다(비공개 레이어 없음). enum 값을 'public' 하나로 두면
-- "비공개 행이 DB에 존재할 수 없다"가 애플리케이션이 아니라 DB에서 강제된다.
create type public.visibility_scope as enum ('public');

-- 플랫폼 레벨 개발자 / 슈퍼관리자. 캘린더 소유자(스트리머)와 구분된다.
-- 개발자는 시스템을 유지보수하며 모든 캘린더를 읽고/편집할 수 있다.
-- 개발자 구글 이메일을 시드로 넣는다 (db/seeds/platform_admins.sql 참고).
create table public.platform_admins (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  title text not null,
  timezone text not null default 'Asia/Seoul',
  is_public boolean not null default true,
  theme_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  public_changed_at timestamptz
);

create table public.color_palette (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  key text not null,
  name text not null,
  bg_color text not null,
  text_color text not null,
  border_color text not null,
  sort_order integer not null,
  unique (calendar_id, key)
);

create table public.broadcast_tags (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  tag_key text not null,
  display_name text not null,
  color_key text not null,
  sort_order integer not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calendar_id, tag_key)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  date_key date not null,
  start_time time,
  end_time time,
  is_all_day boolean not null default false,
  public_title text not null,
  public_description text,
  visibility_scope public.visibility_scope not null default 'public',
  status public.event_status not null default 'scheduled',
  is_public boolean generated always as (visibility_scope = 'public') stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  public_changed_at timestamptz
);

create table public.event_tags (
  event_id uuid not null references public.events(id) on delete cascade,
  tag_id uuid not null references public.broadcast_tags(id) on delete cascade,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  primary key (event_id, tag_id)
);

