import type {
  BroadcastTag,
  ColorPaletteEntry,
  StudioSchedule,
  StudioScheduleEvent
} from "@/lib/domain/schedule-types";
import { PRODUCT_TIMEZONE } from "@/lib/domain/schedule-types";
import { getCurrentKstYearMonth } from "@/lib/calendar/month";
import { sampleStudioSchedule } from "@/lib/schedules/sample-data";
import { getPublicSchedule } from "@/lib/schedules/public-loader";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { resolveCurrentActor } from "@/lib/auth/actor";

// 같은 요청에서 page가 이미 구한 actor를 주입하면 loader가 중복 조회하지 않는다.
// (없으면 기존대로 직접 조회 — 호출부 호환 유지.)
type StudioScheduleContext = {
  actor?: Awaited<ReturnType<typeof resolveCurrentActor>>;
};

export async function getStudioSchedule(
  calendarSlug: string,
  context?: StudioScheduleContext
): Promise<StudioSchedule> {
  const supabase = await createSupabaseServerClient();

  // Supabase 미설정이면 샘플로 폴백 (개발/테스트 보호)
  if (!supabase) {
    return {
      ...sampleStudioSchedule,
      viewerModePreview: await getPublicSchedule(calendarSlug)
    };
  }

  const { year, month } = getCurrentKstYearMonth();
  // calendar 행은 slug로만 조회 — preview/actor와 서로 의존이 없어 한 배치로 병렬 처리한다.
  // (예전엔 calendar를 먼저 단독 await 해서 한 라운드트립을 더 기다렸다 → TTFB 손해. calendar.id가
  //  필요한 건 그 아래 tags/palette/events 배치뿐이라 여기서 함께 병렬로 받아도 안전하다.)
  const [calendarRes, viewerModePreview] = await Promise.all([
    supabase
      .from("calendars")
      .select("id, slug, display_name, title, public_memo")
      .eq("slug", calendarSlug)
      .maybeSingle(),
    getPublicSchedule(calendarSlug),
    context?.actor ?? resolveCurrentActor()
  ]);
  const calendar = calendarRes.data;

  if (!calendar) {
    return {
      calendar: {
        slug: calendarSlug,
        displayName: calendarSlug,
        title: calendarSlug,
        timezone: PRODUCT_TIMEZONE,
        defaultYear: year,
        defaultMonth: month,
        publicMemo: "",
        posterTheme: viewerModePreview.calendar.posterTheme
      },
      tags: [],
      palette: [],
      events: [],
      heartCount: viewerModePreview.heartCount,
      variantGroups: [],
      viewerModePreview
    };
  }

  // 모든 일정이 공개다(비공개 레이어 없음) — RLS는 "쓰기는 소유자만"만 지킨다.
  // (P2-PROTO-1: support_campaigns 쿼리 제거 — UI 소비자 0의 죽은 payload.)
  const [tagsRes, paletteRes, eventsRes] = await Promise.all([
    supabase
      .from("broadcast_tags")
      .select("id, tag_key, display_name, color_key, bg_hex, sort_order, is_default, is_active, parent_id, kind, v3_only")
      .eq("calendar_id", calendar.id)
      .order("sort_order"),
    supabase
      .from("color_palette")
      .select("key, name, bg_color, text_color, border_color, sort_order")
      .eq("calendar_id", calendar.id)
      .order("sort_order"),
    supabase
      .from("events")
      .select(
        "id, date_key, end_date_key, link_next, start_time, end_time, is_all_day, is_tentative, public_title, public_description, status, sort_order, category, teaser, teaser_reveal_at, event_tags(tag_id, is_primary, sort_order)"
      )
      .is("deleted_at", null) // tombstone 제외(P0-DATA-1)
      .eq("calendar_id", calendar.id)
      .order("date_key")
      .order("created_at")
  ]);

  return {
    calendar: {
      slug: calendar.slug,
      displayName: calendar.display_name,
      title: calendar.title,
      timezone: PRODUCT_TIMEZONE,
      defaultYear: year,
      defaultMonth: month,
      publicMemo: calendar.public_memo ?? "",
      posterTheme: viewerModePreview.calendar.posterTheme
    },
    tags: (tagsRes.data ?? []).map(mapTag),
    palette: (paletteRes.data ?? []).map(mapPalette),
    events: (eventsRes.data ?? []).map(mapStudioEvent),
    heartCount: viewerModePreview.heartCount,
    variantGroups: [],
    viewerModePreview
  };
}

// (P2-KST-1: currentKstYearMonth 중복 제거 — lib/calendar/month.ts의 getCurrentKstYearMonth 사용.)

function toKstIso(dateKey: string, time?: string | null) {
  return `${dateKey}T${time ?? "00:00:00"}+09:00`;
}

type StudioEventRow = {
  id: string;
  date_key: string;
  end_date_key: string | null;
  link_next: string | null;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  is_tentative: boolean | null;
  public_title: string;
  public_description: string | null;
  status: StudioScheduleEvent["status"];
  sort_order: number;
  category: StudioScheduleEvent["category"];
  teaser: boolean | null;
  teaser_reveal_at: string | null;
  event_tags: Array<{ tag_id: string; is_primary: boolean; sort_order: number }> | null;
};

function mapStudioEvent(row: StudioEventRow): StudioScheduleEvent {
  const tags = [...(row.event_tags ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: row.id,
    startsAt: toKstIso(row.date_key, row.start_time),
    endsAt: row.end_time ? toKstIso(row.date_key, row.end_time) : undefined,
    endDateKey:
      row.end_date_key && row.end_date_key > row.date_key ? row.end_date_key : undefined,
    linkNext: row.link_next ?? undefined,
    isAllDay: row.is_all_day,
    isTentative: row.is_tentative ?? false,
    publicTitle: row.public_title,
    publicDescription: row.public_description ?? undefined,
    status: row.status,
    visibilityScope: "public",
    category: row.category,
    tagIds: tags.map((t) => t.tag_id),
    primaryTagIds: tags.filter((t) => t.is_primary).map((t) => t.tag_id),
    sortOrder: row.sort_order,
    teaser: row.teaser ?? undefined,
    teaserRevealAt: row.teaser_reveal_at ?? undefined
  };
}

function mapTag(row: {
  id: string;
  tag_key: string;
  display_name: string;
  color_key: string;
  bg_hex?: string | null;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  parent_id?: string | null;
  kind?: string | null;
  v3_only?: boolean | null;
}): BroadcastTag {
  return {
    id: row.id,
    tagKey: row.tag_key,
    displayName: row.display_name,
    colorKey: row.color_key as BroadcastTag["colorKey"],
    bgHex: row.bg_hex ?? null,
    sortOrder: row.sort_order,
    isDefault: row.is_default,
    isActive: row.is_active,
    parentId: row.parent_id ?? null,
    kind: row.kind === "modifier" ? "modifier" : "content",
    v3Only: row.v3_only === true
  };
}

function mapPalette(row: {
  key: string;
  name: string;
  bg_color: string;
  text_color: string;
  border_color: string;
  sort_order: number;
}): ColorPaletteEntry {
  return {
    key: row.key as ColorPaletteEntry["key"],
    name: row.name,
    bgColor: row.bg_color,
    textColor: row.text_color,
    borderColor: row.border_color,
    sortOrder: row.sort_order
  };
}

