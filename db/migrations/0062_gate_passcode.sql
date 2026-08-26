-- 0062: 최초공개(떡밥) 편집 게이트 비밀번호 (2026-08-26 사용자 결정)
--
-- 편집실에서 아직 안 풀린 떡밥 일정을 열 때 묻는 비밀번호의 저장소.
-- (fork 이후 검증 라우트가 없어 게이트를 통과할 방법이 없었다 — 이 마이그레이션과
--  /api/unlock-private-layer 라우트가 짝이다.)
-- 해시만 저장(sha256(calendar_id || passcode)). 초기값은 왁굳형 생일 '0724'.
-- 변경은 월별 인사이트 > 보안 탭에서. 멱등.

create extension if not exists pgcrypto;

alter table public.calendars
  add column if not exists gate_pass_hash text;

-- 초기 비밀번호 0724 — 아직 안 정해진 캘린더에만(이미 바꾼 비번은 건드리지 않는다).
update public.calendars
  set gate_pass_hash = encode(digest(id::text || '0724', 'sha256'), 'hex')
  where slug = 'wak' and gate_pass_hash is null;
