"use server";

import { resolveCurrentActor } from "@/lib/auth/actor";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { canEditSchedule } from "@/lib/permissions/roles";
import { safeActionError } from "@/lib/utils/safe-action-error";
import { CALENDAR_SLUG } from "@/lib/config/site";

// 월별 메모 (ADR-0009 3차, 0063으로 계정별) — (calendar, user, ym) 단위. 개발자·관리자,
// 관리자 계정끼리도 서로의 메모를 보지 않는다(RLS도 user_id = auth.uid() 강제 — 이중 방어).
// 편집실 전용이라 공개 캐시와 무관(BR-CACHE-001 EXCEPT 사유).
// 게이트: canEditSchedule(owner+developer) 서버 재검사(BR-AUTHZ-001).

export type MemoSaveResult = { ok: true } | { ok: false; error: string };
export type MemoLoadResult = { ok: true; body: string } | { ok: false; error: string };

const MEMO_MAX = 4000;
const YM_RE = /^\d{4}-\d{2}$/;

type MemoCtx =
  | { error: string }
  | { error?: undefined; supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>; calendarId: string; userId: string };

async function memoContext(): Promise<MemoCtx> {
  const actor = await resolveCurrentActor();
  if (!canEditSchedule(actor.role)) {
    return { error: "owner 또는 developer만 메모를 쓸 수 있습니다." };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "저장소 연결이 설정되지 않았습니다." };
  }
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    return { error: "로그인이 필요합니다." };
  }
  const { data: calendar } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", CALENDAR_SLUG)
    .maybeSingle();
  if (!calendar) {
    return { error: "캘린더를 찾을 수 없습니다." };
  }
  return { supabase, calendarId: calendar.id as string, userId };
}

export async function getMonthMemoAction(ym: string): Promise<MemoLoadResult> {
  if (!YM_RE.test(ym)) {
    return { ok: false, error: "연-월 형식이 올바르지 않습니다." };
  }
  const ctx = await memoContext();
  if (ctx.error !== undefined) {
    return { ok: false, error: ctx.error };
  }
  const { data, error } = await ctx.supabase
    .from("calendar_month_memos")
    .select("body")
    .eq("calendar_id", ctx.calendarId)
    .eq("user_id", ctx.userId)
    .eq("ym", ym)
    .maybeSingle();
  if (error) {
    return { ok: false, error: safeActionError("메모 불러오기", error) };
  }
  return { ok: true, body: (data?.body as string | undefined) ?? "" };
}

export async function saveMonthMemoAction(ym: string, body: string): Promise<MemoSaveResult> {
  if (!YM_RE.test(ym)) {
    return { ok: false, error: "연-월 형식이 올바르지 않습니다." };
  }
  if (typeof body !== "string") {
    return { ok: false, error: "메모 형식이 올바르지 않습니다." };
  }
  if (body.length > MEMO_MAX) {
    return { ok: false, error: `메모는 ${MEMO_MAX}자 이내여야 합니다. (현재 ${body.length}자)` };
  }
  const ctx = await memoContext();
  if (ctx.error !== undefined) {
    return { ok: false, error: ctx.error };
  }
  const { error } = await ctx.supabase
    .from("calendar_month_memos")
    .upsert(
      {
        calendar_id: ctx.calendarId,
        user_id: ctx.userId,
        ym,
        body,
        updated_at: new Date().toISOString()
      },
      { onConflict: "calendar_id,user_id,ym" }
    );
  if (error) {
    return { ok: false, error: safeActionError("메모 저장", error) };
  }
  return { ok: true };
}

// ── 붙임쪽지 메모(ADR-0014) — (calendar, user) 스코프의 여러 장 메모 ────────────
// 월별 단일 메모의 후속. 서식은 쪽지 단위(배경색·글씨체·크기·굵기) — 본문은 plain text.
// 같은 파일에 두는 이유: 관리자 전용 데이터라 공개 캐시와 무관(BR-CACHE-001 EXCEPT 승계).

export type MemoNote = {
  id: string;
  title: string;
  body: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  sortOrder: number;
  updatedAt: string;
};
export type MemoListResult = { ok: true; notes: MemoNote[] } | { ok: false; error: string };
export type MemoNoteResult = { ok: true; note: MemoNote } | { ok: false; error: string };

const MEMO_NOTE_MAX = 30; // 계정당 쪽지 수 상한
const MEMO_TITLE_MAX = 100;
const MEMO_COLORS = new Set(["paper", "yellow", "mint", "sky", "pink", "lavender"]);
const MEMO_FONTS = new Set([
  "sans",
  "serif", // 구버전 호환(=명조)
  "mono",
  "myeongjo",
  "nanumpen",
  "gaegu",
  "himelody",
  "gamja",
  "jua",
  "dohyeon",
  "gugi",
  "blackhan"
]);
const MEMO_SIZE_MIN = 12;
const MEMO_SIZE_MAX = 28; // 4단 스테퍼 최대(아주 크게 28)

type MemoRow = {
  id: string;
  title: string;
  body: string;
  color: string;
  font_family: string;
  font_size: number;
  bold: boolean;
  sort_order: number;
  updated_at: string;
};

function toNote(r: MemoRow): MemoNote {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    color: r.color,
    fontFamily: r.font_family,
    fontSize: r.font_size,
    bold: r.bold,
    sortOrder: r.sort_order,
    updatedAt: r.updated_at
  };
}

export async function listMemoNotesAction(): Promise<MemoListResult> {
  const ctx = await memoContext();
  if (ctx.error !== undefined) {
    return { ok: false, error: ctx.error };
  }
  const { data, error } = await ctx.supabase
    .from("calendar_memos")
    .select("id, title, body, color, font_family, font_size, bold, sort_order, updated_at")
    .eq("calendar_id", ctx.calendarId)
    .eq("user_id", ctx.userId)
    // 수동 순서가 진실(ADR-0015) — 본문을 고쳐도 탭이 점프하지 않는다.
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(MEMO_NOTE_MAX);
  if (error) {
    return { ok: false, error: safeActionError("메모 목록", error) };
  }
  return { ok: true, notes: ((data ?? []) as MemoRow[]).map(toNote) };
}

export async function createMemoNoteAction(): Promise<MemoNoteResult> {
  const ctx = await memoContext();
  if (ctx.error !== undefined) {
    return { ok: false, error: ctx.error };
  }
  const { count } = await ctx.supabase
    .from("calendar_memos")
    .select("id", { count: "exact", head: true })
    .eq("calendar_id", ctx.calendarId)
    .eq("user_id", ctx.userId);
  if ((count ?? 0) >= MEMO_NOTE_MAX) {
    return { ok: false, error: `메모는 ${MEMO_NOTE_MAX}개까지예요.` };
  }
  const { data: top } = await ctx.supabase
    .from("calendar_memos")
    .select("sort_order")
    .eq("calendar_id", ctx.calendarId)
    .eq("user_id", ctx.userId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  const topOrder = ((top?.sort_order as number | undefined) ?? 1) - 1;
  const { data, error } = await ctx.supabase
    .from("calendar_memos")
    .insert({ calendar_id: ctx.calendarId, user_id: ctx.userId, sort_order: topOrder })
    .select("id, title, body, color, font_family, font_size, bold, sort_order, updated_at")
    .single();
  if (error || !data) {
    return { ok: false, error: safeActionError("메모 만들기", error) };
  }
  return { ok: true, note: toNote(data as MemoRow) };
}

export async function updateMemoNoteAction(
  id: string,
  patch: {
    title?: string;
    body?: string;
    color?: string;
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
  }
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const ctx = await memoContext();
  if (ctx.error !== undefined) {
    return { ok: false, error: ctx.error };
  }
  const now = new Date().toISOString();
  const row: Record<string, unknown> = { updated_at: now };
  if (patch.title !== undefined) {
    if (typeof patch.title !== "string" || patch.title.length > MEMO_TITLE_MAX) {
      return { ok: false, error: `제목은 ${MEMO_TITLE_MAX}자 이내여야 합니다.` };
    }
    row.title = patch.title;
  }
  if (patch.body !== undefined) {
    if (typeof patch.body !== "string" || patch.body.length > MEMO_MAX) {
      return { ok: false, error: `메모는 ${MEMO_MAX}자 이내여야 합니다.` };
    }
    row.body = patch.body;
  }
  if (patch.color !== undefined) {
    if (!MEMO_COLORS.has(patch.color)) return { ok: false, error: "알 수 없는 색입니다." };
    row.color = patch.color;
  }
  if (patch.fontFamily !== undefined) {
    if (!MEMO_FONTS.has(patch.fontFamily)) return { ok: false, error: "알 수 없는 글씨체입니다." };
    row.font_family = patch.fontFamily;
  }
  if (patch.fontSize !== undefined) {
    if (
      !Number.isInteger(patch.fontSize) ||
      patch.fontSize < MEMO_SIZE_MIN ||
      patch.fontSize > MEMO_SIZE_MAX
    ) {
      return { ok: false, error: "글자 크기 범위를 벗어났습니다." };
    }
    row.font_size = patch.fontSize;
  }
  if (patch.bold !== undefined) {
    row.bold = Boolean(patch.bold);
  }
  const { error } = await ctx.supabase
    .from("calendar_memos")
    .update(row)
    .eq("id", id)
    .eq("calendar_id", ctx.calendarId)
    .eq("user_id", ctx.userId);
  if (error) {
    return { ok: false, error: safeActionError("메모 저장", error) };
  }
  return { ok: true, updatedAt: now };
}

// 수동 순서 저장(ADR-0015) — 전체 id 배열을 받아 단일 UPDATE RPC로 원자 적용.
// 검증: 본인 메모 전체와 정확히 일치(누락·중복·남의 id 거부).
export async function reorderMemoNotesAction(orderedIds: string[]): Promise<MemoSaveResult> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0 || orderedIds.length > MEMO_NOTE_MAX) {
    return { ok: false, error: "순서 형식이 올바르지 않습니다." };
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    return { ok: false, error: "순서에 중복이 있습니다." };
  }
  const ctx = await memoContext();
  if (ctx.error !== undefined) {
    return { ok: false, error: ctx.error };
  }
  const { data: mine, error: listErr } = await ctx.supabase
    .from("calendar_memos")
    .select("id")
    .eq("calendar_id", ctx.calendarId)
    .eq("user_id", ctx.userId);
  if (listErr) {
    return { ok: false, error: safeActionError("순서 저장", listErr) };
  }
  const myIds = new Set(((mine ?? []) as { id: string }[]).map((r) => r.id));
  if (orderedIds.length !== myIds.size || orderedIds.some((id) => !myIds.has(id))) {
    return { ok: false, error: "메모 목록이 바뀌었어요. 새로고침 후 다시 시도해 주세요." };
  }
  const { error } = await ctx.supabase.rpc("reorder_calendar_memos", {
    p_calendar: ctx.calendarId,
    p_ids: orderedIds
  });
  if (error) {
    return { ok: false, error: safeActionError("순서 저장", error) };
  }
  return { ok: true };
}

export async function deleteMemoNoteAction(id: string): Promise<MemoSaveResult> {
  const ctx = await memoContext();
  if (ctx.error !== undefined) {
    return { ok: false, error: ctx.error };
  }
  const { error } = await ctx.supabase
    .from("calendar_memos")
    .delete()
    .eq("id", id)
    .eq("calendar_id", ctx.calendarId)
    .eq("user_id", ctx.userId);
  if (error) {
    return { ok: false, error: safeActionError("메모 삭제", error) };
  }
  return { ok: true };
}

