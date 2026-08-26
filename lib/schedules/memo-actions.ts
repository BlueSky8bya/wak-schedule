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
