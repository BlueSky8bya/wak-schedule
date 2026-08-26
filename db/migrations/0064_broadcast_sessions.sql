-- 0064: 방송 세션(방송 시간 집계 원천) — 고정 부하 방식 재도입 (2026-08-26, ADR-0012)
--
-- VIC의 방송시간 추적은 요청/크론 조합이었고 fork 때 통째로 빠졌다(ADR-0004). 사용자가
-- '이 달 기록'의 방송 시간 카드를 원해 재도입하되, 쓰기 부하를 고정한다:
-- 시청자 폴링이 아니라 /api/live의 서버 20초 캐시 갱신에 피기백 → 분당 최대 3회 쓰기,
-- 시청자 수와 무관. 시작시각은 SOOP BTIME 기반(startedAt)이라 폴링이 늦어도 정확하다.
-- 방송 시간은 공개 정보 — anon 읽기 허용(공개 API가 집계해 내보낸다). 멱등.

create table if not exists public.broadcast_sessions (
  started_at timestamptz primary key, -- SOOP BTIME 기반 시작시각(세션 안정 키)
  last_seen_at timestamptz not null,  -- 마지막으로 '방송 중'을 본 시각
  ended_at timestamptz                -- 종료 감지 시각(열려 있으면 null)
);

alter table public.broadcast_sessions enable row level security;

drop policy if exists "public can read broadcast sessions" on public.broadcast_sessions;
create policy "public can read broadcast sessions"
  on public.broadcast_sessions
  for select
  using (true);

grant select on public.broadcast_sessions to anon, authenticated;
grant all on public.broadcast_sessions to service_role;
