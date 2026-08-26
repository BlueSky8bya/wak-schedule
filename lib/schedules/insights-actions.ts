"use server";

import { resolveCurrentActor } from "@/lib/auth/actor";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { canEditSchedule } from "@/lib/permissions/roles";
import { CALENDAR_SLUG } from "@/lib/config/site";

// 월별 인사이트 — 일정 파생 데이터만 (ADR-0011).
// 원천: events · event_tags · broadcast_tags · 하트/기대 집계 RPC. 전부 읽기 전용(select) —
// 쓰기 없음이므로 캐시 무효화 대상이 아니다. 방문자·방송시간류는 데이터 원천이 없어 다루지 않는다.

// VIC StackTrendChart와 같은 형태 — cats(표시 순서·색) + 월별 counts.
export type TrendStack = {
  cats: { key: string; label: string; color: string }[];
  months: { ym: string; counts: Record<string, number>; total: number }[];
};

export type MonthInsights = {
  year: number;
  month: number;
  broadcastDays: number; // 방송이 잡힌 날 수(휴뱅·취소·draft 제외, 시작일 기준)
  dayoffDays: number; // 휴뱅 날 수
  totalEvents: number; // draft·취소 제외 일정 수
  draftCount: number; // 아직 발행 전
  tagRank: { id: string; name: string; color: string; count: number; ratio: number }[];
  heartsTotal: number; // 이 달 일정들에 눌린 하트 합(누적)
  heartsTop: { title: string; dateKey: string; count: number }[]; // 상위 3
  hopeTotal: number; // 이 달 떡밥 '기대돼요' 합
  prev: { broadcastDays: number; heartsTotal: number }; // 전월 비교
  // VIC 일정 패널 동등 필드.
  nextBroadcast: { dateKey: string; titles: string[] } | null; // 오늘(KST) 이후 첫 방송일
  busiestWeekday: number | null; // 0=일 … 6=토 (이 달 컨텐츠 기준)
  quietestWeekday: number | null;
  // 트렌드 탭(VIC 문법): 6개월 시리즈 + 태그별 누적 스택.
  trend: {
    months: string[]; // YYYY-MM, 오래된→최신(보는 달로 끝)
    content: number[]; // 휴뱅 제외 일정 수
    hearts: number[]; // 하트 합
    contentByTag: TrendStack; // 콘텐츠 대분류별(휴뱅 포함)
    modifierByTag: TrendStack; // 형식(합방·시참 등)별
    heartsByTag: TrendStack; // 하트 받은 태그 — 일정당 평균 하트
  };
  // 하이라이트 탭.
  highlight: {
    topHeart: { title: string; dateKey: string; count: number } | null;
    topTag: { name: string; count: number } | null;
    longestStreak: number; // 이 달 최장 연속 방송일
  };
};

export type MonthInsightsResult = { ok: true; data: MonthInsights } | { ok: false; error: string };

function monthRange(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  const nextY = month === 12 ? year + 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  return {
    start: `${year}-${mm}-01`,
    end: `${nextY}-${String(nextM).padStart(2, "0")}-01`
  };
}

type EvRow = {
  id: string;
  date_key: string;
  public_title: string;
  category: "stream" | "collab" | "notice" | "dayoff";
  status: "draft" | "scheduled" | "live" | "done" | "cancelled";
};

function summarize(rows: EvRow[]) {
  const active = rows.filter((r) => r.status !== "cancelled" && r.status !== "draft");
  const broadcastDays = new Set(
    active.filter((r) => r.category !== "dayoff").map((r) => r.date_key)
  ).size;
  const dayoffDays = new Set(
    active.filter((r) => r.category === "dayoff").map((r) => r.date_key)
  ).size;
  return { active, broadcastDays, dayoffDays };
}

export async function getMonthInsightsAction(input: {
  year: number;
  month: number;
}): Promise<MonthInsightsResult> {
  const actor = await resolveCurrentActor();
  if (!canEditSchedule(actor.role)) {
    return { ok: false, error: "owner 또는 developer만 인사이트를 볼 수 있습니다." };
  }
  const year = Math.trunc(input.year);
  const month = Math.trunc(input.month);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return { ok: false, error: "연·월이 올바르지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "저장소 연결이 설정되지 않았습니다." };
  }

  const { data: calendar } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", CALENDAR_SLUG)
    .maybeSingle();
  if (!calendar) {
    return { ok: false, error: "캘린더를 찾을 수 없습니다." };
  }

  const cur = monthRange(year, month);
  // 트렌드(6개월)까지 한 쿼리로 — 6개월 전 1일부터 다음 달 1일까지.
  const mIndex = year * 12 + (month - 1);
  const startIdx = mIndex - 5;
  const windowStart = `${Math.floor(startIdx / 12)}-${String((startIdx % 12) + 1).padStart(2, "0")}-01`;

  const [allRes, heartRes, hopeRes, tagsRes, palRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, date_key, public_title, category, status")
      .eq("calendar_id", calendar.id)
      .gte("date_key", windowStart)
      .lt("date_key", cur.end)
      .is("deleted_at", null),
    supabase.rpc("get_event_heart_counts", { p_calendar_id: calendar.id }),
    supabase.rpc("get_teaser_hope_counts", { p_calendar_id: calendar.id }),
    supabase
      .from("broadcast_tags")
      .select("id, display_name, color_key, bg_hex, parent_id, kind")
      .eq("calendar_id", calendar.id),
    supabase
      .from("color_palette")
      .select("key, bg_color")
      .eq("calendar_id", calendar.id)
  ]);
  if (allRes.error) {
    return { ok: false, error: "일정 조회에 실패했습니다." };
  }

  const allRows = (allRes.data ?? []) as EvRow[];
  const inMonth = (r: EvRow, y: number, m: number) =>
    r.date_key.startsWith(`${y}-${String(m).padStart(2, "0")}-`);
  const curRows = allRows.filter((r) => inMonth(r, year, month));
  const prevY = month === 1 ? year - 1 : year;
  const prevM = month === 1 ? 12 : month - 1;
  const prevRows = allRows.filter((r) => inMonth(r, prevY, prevM));
  const curSum = summarize(curRows);
  const prevSum = summarize(prevRows);

  // 하트/기대 집계(달력 전체, 이벤트별) → 이 달 일정으로 좁힌다.
  const heartByEvent = new Map<string, number>(
    ((heartRes.data as { event_id: string; count: number }[] | null) ?? []).map((r) => [
      r.event_id,
      Number(r.count)
    ])
  );
  const hopeByEvent = new Map<string, number>(
    ((hopeRes.data as { event_id: string; count: number }[] | null) ?? []).map((r) => [
      r.event_id,
      Number(r.count)
    ])
  );
  const heartsTotal = curSum.active.reduce((n, r) => n + (heartByEvent.get(r.id) ?? 0), 0);
  const hopeTotal = curSum.active.reduce((n, r) => n + (hopeByEvent.get(r.id) ?? 0), 0);
  const prevHearts = prevSum.active.reduce((n, r) => n + (heartByEvent.get(r.id) ?? 0), 0);
  const heartsTop = [...curSum.active]
    .map((r) => ({
      title: r.public_title.split("\n")[0] || "일정",
      dateKey: r.date_key,
      count: heartByEvent.get(r.id) ?? 0
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 태그 순위 — 이 달 일정에 붙은 콘텐츠 태그를 최상위 대분류로 접어 센다(색은 대분류 것).
  type TagRow = {
    id: string;
    display_name: string;
    color_key: string;
    bg_hex: string | null;
    parent_id: string | null;
    kind: "content" | "modifier";
  };
  const tagRows = ((tagsRes.data ?? []) as TagRow[]) ?? [];
  const tagById = new Map(tagRows.map((t) => [t.id, t]));
  const topOf = (id: string): TagRow | null => {
    let t = tagById.get(id) ?? null;
    let hop = 0;
    while (t && t.parent_id && hop < 4) {
      t = tagById.get(t.parent_id) ?? null;
      hop += 1;
    }
    return t;
  };
  const palByKey = new Map(
    (((palRes.data ?? []) as { key: string; bg_color: string }[]) ?? []).map((p) => [
      p.key,
      p.bg_color
    ])
  );
  const colorOf = (t: TagRow) => t.bg_hex ?? palByKey.get(t.color_key) ?? "#cfd6bb";

  const activeIds = curSum.active.map((r) => r.id);
  const rankCount = new Map<string, number>();
  if (activeIds.length > 0) {
    const { data: linkRows } = await supabase
      .from("event_tags")
      .select("event_id, tag_id")
      .in("event_id", activeIds);
    // 같은 일정에 같은 대분류의 세부가 여럿 붙어도 1회로 센다(일정 단위 순위).
    const seen = new Set<string>();
    for (const link of (linkRows ?? []) as { event_id: string; tag_id: string }[]) {
      const top = topOf(link.tag_id);
      if (!top || top.kind !== "content") continue;
      const key = `${link.event_id}:${top.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rankCount.set(top.id, (rankCount.get(top.id) ?? 0) + 1);
    }
  }
  const rankMax = Math.max(1, ...rankCount.values());
  const tagRank = [...rankCount.entries()]
    .map(([id, count]) => {
      const t = tagById.get(id)!;
      return {
        id,
        name: t.display_name,
        color: colorOf(t),
        count,
        ratio: count / rankMax
      };
    })
    .sort((a, b) => b.count - a.count);

  // 트렌드(VIC 문법): 6개월 시리즈 + 태그별 누적 스택. 링크는 이미 이 달 범위의
  // event_tags를 갖고 있지만 스택은 6개월 전체가 필요해 별도로 한 번 더 읽는다.
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const idx = mIndex - i;
    monthKeys.push(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`);
  }
  const ymOf = (r: EvRow) => r.date_key.slice(0, 7);
  const activeAll = allRows.filter((r) => r.status !== "cancelled" && r.status !== "draft");
  const contentSeries = monthKeys.map(
    (ym) => activeAll.filter((r) => ymOf(r) === ym && r.category !== "dayoff").length
  );
  const heartsSeries = monthKeys.map((ym) =>
    activeAll.filter((r) => ymOf(r) === ym).reduce((n, r) => n + (heartByEvent.get(r.id) ?? 0), 0)
  );

  // 6개월 전체 이벤트의 태그 링크(스택용).
  const allActiveIds = activeAll.map((r) => r.id);
  const linksAll: { event_id: string; tag_id: string }[] = [];
  for (let off = 0; off < allActiveIds.length; off += 150) {
    const slice = allActiveIds.slice(off, off + 150);
    const { data: rows } = await supabase
      .from("event_tags")
      .select("event_id, tag_id")
      .in("event_id", slice);
    linksAll.push(...(((rows ?? []) as { event_id: string; tag_id: string }[]) ?? []));
  }
  const evById = new Map(activeAll.map((r) => [r.id, r]));

  type StackAgg = Map<string, Map<string, number>>; // ym -> topTagId -> value
  const contentAgg: StackAgg = new Map();
  const modifierAgg: StackAgg = new Map();
  const heartAggSum: StackAgg = new Map();
  const heartAggCnt: StackAgg = new Map();
  const usedContent = new Map<string, TagRow>();
  const usedModifier = new Map<string, TagRow>();
  const bump = (agg: StackAgg, ym: string, id: string, v: number) => {
    const m = agg.get(ym) ?? new Map<string, number>();
    m.set(id, (m.get(id) ?? 0) + v);
    agg.set(ym, m);
  };
  const seenPer = new Set<string>();
  for (const link of linksAll) {
    const ev = evById.get(link.event_id);
    if (!ev) continue;
    const ym = ymOf(ev);
    if (!monthKeys.includes(ym)) continue;
    const raw = tagById.get(link.tag_id);
    if (!raw) continue;
    if (raw.kind === "modifier") {
      const dk = `m:${ev.id}:${raw.id}`;
      if (seenPer.has(dk)) continue;
      seenPer.add(dk);
      usedModifier.set(raw.id, raw);
      bump(modifierAgg, ym, raw.id, 1);
      continue;
    }
    const top = topOf(link.tag_id);
    if (!top || top.kind !== "content") continue;
    const dk = `c:${ev.id}:${top.id}`;
    if (seenPer.has(dk)) continue;
    seenPer.add(dk);
    usedContent.set(top.id, top);
    bump(contentAgg, ym, top.id, 1);
    const h = heartByEvent.get(ev.id) ?? 0;
    bump(heartAggSum, ym, top.id, h);
    bump(heartAggCnt, ym, top.id, 1);
  }

  const buildStack = (
    agg: StackAgg,
    used: Map<string, TagRow>,
    avgOf?: StackAgg
  ): TrendStack => {
    const totals = new Map<string, number>();
    for (const m of agg.values()) {
      for (const [id, v] of m) totals.set(id, (totals.get(id) ?? 0) + v);
    }
    const cats = [...used.values()]
      .sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0))
      .map((t) => ({ key: t.id, label: t.display_name, color: colorOf(t) }));
    const months = monthKeys.map((ym) => {
      const src = agg.get(ym) ?? new Map<string, number>();
      const counts: Record<string, number> = {};
      let total = 0;
      for (const c of cats) {
        let v = src.get(c.key) ?? 0;
        if (avgOf) {
          const cnt = avgOf.get(ym)?.get(c.key) ?? 0;
          v = cnt > 0 ? Math.round((v / cnt) * 10) / 10 : 0;
        }
        if (v > 0) counts[c.key] = v;
        total += v;
      }
      return { ym, counts, total: Math.round(total * 10) / 10 };
    });
    return { cats, months };
  };

  const trend: MonthInsights["trend"] = {
    months: monthKeys,
    content: contentSeries,
    hearts: heartsSeries,
    contentByTag: buildStack(contentAgg, usedContent),
    modifierByTag: buildStack(modifierAgg, usedModifier),
    heartsByTag: buildStack(heartAggSum, usedContent, heartAggCnt)
  };

  // 하이라이트: 최장 연속 방송일(이 달, 시작일 기준).
  const bDays = [
    ...new Set(
      curSum.active.filter((r) => r.category !== "dayoff").map((r) => Number(r.date_key.slice(8)))
    )
  ].sort((a, b) => a - b);
  let longestStreak = 0;
  let run = 0;
  let prevDay = -2;
  for (const d of bDays) {
    run = d === prevDay + 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prevDay = d;
  }

  // 다음 방송(오늘 KST 이후 첫 컨텐츠 날) — 그 날의 제목들.
  const todayKey = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const upcoming = activeAll
    .filter((r) => r.category !== "dayoff" && r.date_key >= todayKey)
    .sort((a, b) => a.date_key.localeCompare(b.date_key));
  const nextBroadcast = upcoming.length
    ? {
        dateKey: upcoming[0].date_key,
        titles: upcoming
          .filter((r) => r.date_key === upcoming[0].date_key)
          .map((r) => r.public_title.split("\n")[0] || "일정")
      }
    : null;

  // 요일 분포(이 달 컨텐츠 기준) → 바쁜/한가한 요일.
  const byWeekday = new Array(7).fill(0) as number[];
  for (const r of curSum.active.filter((x) => x.category !== "dayoff")) {
    const [yy, mm, dd] = r.date_key.split("-").map(Number);
    byWeekday[new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay()] += 1;
  }
  const anyContent = byWeekday.some((n) => n > 0);
  const busiestWeekday = anyContent ? byWeekday.indexOf(Math.max(...byWeekday)) : null;
  const quietestWeekday = anyContent ? byWeekday.indexOf(Math.min(...byWeekday)) : null;

  return {
    ok: true,
    data: {
      year,
      month,
      broadcastDays: curSum.broadcastDays,
      dayoffDays: curSum.dayoffDays,
      totalEvents: curSum.active.length,
      draftCount: curRows.filter((r) => r.status === "draft").length,
      tagRank,
      heartsTotal,
      heartsTop,
      hopeTotal,
      prev: { broadcastDays: prevSum.broadcastDays, heartsTotal: prevHearts },
      nextBroadcast,
      busiestWeekday,
      quietestWeekday,
      trend,
      highlight: {
        topHeart: heartsTop[0] ?? null,
        topTag: tagRank[0] ? { name: tagRank[0].name, count: tagRank[0].count } : null,
        longestStreak
      }
    }
  };
}
