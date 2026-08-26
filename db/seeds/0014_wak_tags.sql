-- 우왁굳 태그 확정 시드 (2026-08-26, 사용자 확정 — docs/tags/wak-tags-draft-2026-08.md)
--
-- 구조: 콘텐츠 대분류 12(색 보유) + 세부 9(부모 색 상속) + 형식 modifier 9(색 없음·점 표시).
-- 0002의 플레이스홀더 태그를 대체한다. 멱등: 여러 번 실행해도 안전.
-- ⚠ owner가 편집기에서 직접 만든 태그(is_default=false)는 건드리지 않는다.

do $$
declare
  v_cal uuid;
begin
  select id into v_cal from public.calendars where slug = 'wak';
  if v_cal is null then
    raise exception '캘린더(wak)가 없습니다. seeds/0002를 먼저 적용하세요.';
  end if;

  -- 1) 구 플레이스홀더 제거(dayoff는 재사용). is_default=true인 것만 — 커스텀 태그 보호.
  delete from public.broadcast_tags
  where calendar_id = v_cal
    and is_default = true
    and tag_key in ('worldcup','collab','big_server','full_track','calm','variety_game','song','hype','easy',
                    -- 2026-08-26 사용자 결정: 노가리 태그 제거
                    'nogari');

  -- 2) 콘텐츠 대분류 11 (parent 없음, 색 보유 — 전부 파스텔 팔레트)
  --    색 클러스터(2026-08-26 사용자 결정: 비슷한 콘텐츠끼리 인접 색):
  --    사람·멤버=핑크/보라(이세돌·고멤·동아리) · 팬=웜(왁물원·조공) ·
  --    가상·상영=블루(VR챗·시네티) · 방송 포맷=옐로/라임(게임·대형서버) · 중립(휴뱅·기타)
  insert into public.broadcast_tags
    (calendar_id, tag_key, display_name, color_key, sort_order, is_default, is_active, kind, parent_id)
  values
    (v_cal, 'dayoff',     '휴뱅',   'gray',     1,  true, true, 'content', null),
    (v_cal, 'isedol',     '이세돌', 'pink',     2,  true, true, 'content', null),
    (v_cal, 'gomem',      '고멤',   'lavender', 3,  true, true, 'content', null),
    (v_cal, 'club',       '동아리', 'indigo',   4,  true, true, 'content', null),
    (v_cal, 'wakmoolwon', '왁물원', 'beige',    5,  true, true, 'content', null),
    (v_cal, 'vrchat',     'VR챗',   'sky',      6,  true, true, 'content', null),
    (v_cal, 'cinety',     '시네티', 'blue',     7,  true, true, 'content', null),
    (v_cal, 'jogong',     '조공',   'orange',   8,  true, true, 'content', null),
    (v_cal, 'server',     '대형서버', 'lime',   9,  true, true, 'content', null),
    (v_cal, 'game',       '게임',   'yellow',   10, true, true, 'content', null),
    (v_cal, 'etc',        '기타',   'teal',     12, true, true, 'content', null)
  on conflict (calendar_id, tag_key) do update
    set display_name = excluded.display_name,
        color_key    = excluded.color_key,
        sort_order   = excluded.sort_order,
        kind         = excluded.kind,
        parent_id    = null,
        is_default   = true,
        is_active    = true;

  -- 3) 세부 9 (부모 색 상속 — color_key는 부모와 같게 적어두지만 렌더는 상속이 정본)
  insert into public.broadcast_tags
    (calendar_id, tag_key, display_name, color_key, sort_order, is_default, is_active, kind, parent_id)
  values
    (v_cal, 'haru_gomem',   '하루고멤',   'lavender', 21, true, true, 'content',
      (select id from public.broadcast_tags where calendar_id = v_cal and tag_key = 'gomem')),
    (v_cal, 'wakchidong',   '왁치동',     'indigo',     22, true, true, 'content',
      (select id from public.broadcast_tags where calendar_id = v_cal and tag_key = 'club')),
    (v_cal, 'sinsmalgedong','신스멀게동', 'indigo',     23, true, true, 'content',
      (select id from public.broadcast_tags where calendar_id = v_cal and tag_key = 'club')),
    (v_cal, 'jandidong',    '잔디동',     'indigo',     24, true, true, 'content',
      (select id from public.broadcast_tags where calendar_id = v_cal and tag_key = 'club')),
    (v_cal, 'minecraft',    '마인크래프트','yellow',  25, true, true, 'content',
      (select id from public.broadcast_tags where calendar_id = v_cal and tag_key = 'game')),
    (v_cal, 'lol',          '롤',         'yellow',   26, true, true, 'content',
      (select id from public.broadcast_tags where calendar_id = v_cal and tag_key = 'game')),
    (v_cal, 'fifa',         '피파',       'yellow',   27, true, true, 'content',
      (select id from public.broadcast_tags where calendar_id = v_cal and tag_key = 'game')),
    (v_cal, 'arma',         '아르마',     'yellow',   28, true, true, 'content',
      (select id from public.broadcast_tags where calendar_id = v_cal and tag_key = 'game')),
    (v_cal, 'racing',       '레이싱',     'yellow',   29, true, true, 'content',
      (select id from public.broadcast_tags where calendar_id = v_cal and tag_key = 'game'))
  on conflict (calendar_id, tag_key) do update
    set display_name = excluded.display_name,
        color_key    = excluded.color_key,
        sort_order   = excluded.sort_order,
        kind         = excluded.kind,
        parent_id    = excluded.parent_id,
        is_default   = true,
        is_active    = true;

  -- 4) 형식 modifier 9 — 진채도 커스텀 색(bg_hex). 콘텐츠(파스텔)와 한눈에 구분되는
  --    VIC 문법(2026-08-26 사용자 결정). color_key는 bg_hex 실패 시 폴백.
  insert into public.broadcast_tags
    (calendar_id, tag_key, display_name, color_key, bg_hex, sort_order, is_default, is_active, kind, parent_id)
  values
    (v_cal, 'hapbang', '합방',   'mint',   '#15803d', 41, true, true, 'modifier', null),
    (v_cal, 'naejeon', '내전',   'red',    '#dc2626', 42, true, true, 'modifier', null),
    (v_cal, 'daehoe',  '대회',   'indigo', '#4338ca', 43, true, true, 'modifier', null),
    (v_cal, 'sicham',  '시참',   'sky',    '#0284c7', 44, true, true, 'modifier', null),
    (v_cal, 'yeyeol',  '예열',   'yellow', '#ea580c', 45, true, true, 'modifier', null),
    (v_cal, 'huyeol',  '후열',   'orange', '#92400e', 46, true, true, 'modifier', null),
    (v_cal, 'janjan',  '잔잔뱅', 'teal',   '#0f766e', 47, true, true, 'modifier', null),
    (v_cal, 'gupl',    '구플뱅', 'lime',   '#4d7c0f', 48, true, true, 'modifier', null),
    (v_cal, 'ck',      'CK',     'pink',   '#be185d', 49, true, true, 'modifier', null)
  on conflict (calendar_id, tag_key) do update
    set display_name = excluded.display_name,
        color_key    = excluded.color_key,
        bg_hex       = excluded.bg_hex,
        sort_order   = excluded.sort_order,
        kind         = excluded.kind,
        parent_id    = null,
        is_default   = true,
        is_active    = true;
end $$;
