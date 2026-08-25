"use server";

import { resolveCurrentActor } from "@/lib/auth/actor";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { canEditSchedule } from "@/lib/permissions/roles";
import { CALENDAR_SLUG } from "@/lib/config/site";

// 월별 인사이트 — 일정 파생 데이터만 (ADR-0011).
// 원천: events · event_tags · broadcast_tags · 하트/기대 집계 RPC. 전부 읽기 전용(select) —
// 쓰기 없음이므로 캐시 무효화 대상이 아니다. 방문자·방송시간류는 데이터 원천이 없어 다루지 않는다.

export type MonthInsights = {
  year: number;
  month: number;
  broadcastDays: number; // 방송이 잡힌 날 수(휴뱅·취소·draft 제외, 시작일 기준)
  dayoffDays: number; // 휴뱅 날 수
  totalEvents: number; // draft·취소 제외 일정 수
  draftCount: number; // 아직 발행 전
  tagRank: { id: string; name: string; colorKey: string; bgHex: string | null; count: number }[];
  heartsTotal: number; // 이 달 일정들에 눌린 하트 합(누적)
  heartsTop: { title: string; dateKey: string; count: number }[]; // 상위 3
  hopeTotal: number; // 이 달 떡밥 '기대돼요' 합
  prev: { broadcastDays: number; heartsTotal: number }; // 전월 비교
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
  const prevRange = monthRange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);

  const [curRes, prevRes, heartRes, hopeRes, tagsRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, date_key, public_title, category, status")
      .eq("calendar_id", calendar.id)
      .gte("date_key", cur.start)
      .lt("date_key", cur.end)
      .is("deleted_at", null),
    supabase
      .from("events")
      .select("id, date_key, public_title, category, status")
      .eq("calendar_id", calendar.id)
      .gte("date_key", prevRange.start)
      .lt("date_key", prevRange.end)
      .is("deleted_at", null),
    supabase.rpc("get_event_heart_counts", { p_calendar_id: calendar.id }),
    supabase.rpc("get_teaser_hope_counts", { p_calendar_id: calendar.id }),
    supabase
      .from("broadcast_tags")
      .select("id, display_name, color_key, bg_hex, parent_id, kind")
      .eq("calendar_id", calendar.id)
  ]);
  if (curRes.error) {
    return { ok: false, error: "일정 조회에 실패했습니다." };
  }

  const curRows = (curRes.data ?? []) as EvRow[];
  const prevRows = (prevRes.data ?? []) as EvRow[];
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
  const tagRank = [...rankCount.entries()]
    .map(([id, count]) => {
      const t = tagById.get(id)!;
      return { id, name: t.display_name, colorKey: t.color_key, bgHex: t.bg_hex, count };
    })
    .sort((a, b) => b.count - a.count);

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
      prev: { broadcastDays: prevSum.broadcastDays, heartsTotal: prevHearts }
    }
  };
}
