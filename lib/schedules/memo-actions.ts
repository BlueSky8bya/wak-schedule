"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublicSchedule } from "@/lib/schedules/cache";
import { resolveCurrentActor } from "@/lib/auth/actor";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { canEditSchedule } from "@/lib/permissions/roles";
import { safeActionError } from "@/lib/utils/safe-action-error";
import { CALENDAR_SLUG } from "@/lib/config/site";

export type MemoSaveResult = { ok: true } | { ok: false; error: string };

// 메모 최대 길이 — 마인드스토밍 텍스트 기준 넉넉히. 초과분은 서버에서 자르지 않고 거부한다
// (자르면 사용자가 쓴 내용이 조용히 사라진다 — 거부가 정직하다).
const MEMO_MAX = 4000;

// '그 달 메모' 저장 (ADR-0009 2차: 편집실 전용 표시, 저장 대상은 calendars.public_memo).
// 게이트: canEditSchedule(owner+developer) — 일정·태그 편집과 동일. 서버에서 재검사(BR-AUTHZ-001).
export async function updateCalendarMemoAction(memo: string): Promise<MemoSaveResult> {
  const actor = await resolveCurrentActor();
  if (!canEditSchedule(actor.role)) {
    return { ok: false, error: "owner 또는 developer만 메모를 저장할 수 있습니다." };
  }
  if (typeof memo !== "string") {
    return { ok: false, error: "메모 형식이 올바르지 않습니다." };
  }
  if (memo.length > MEMO_MAX) {
    return { ok: false, error: `메모는 ${MEMO_MAX}자 이내여야 합니다. (현재 ${memo.length}자)` };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "저장소 연결이 설정되지 않았습니다." };
  }

  const { error } = await supabase
    .from("calendars")
    .update({ public_memo: memo })
    .eq("slug", CALENDAR_SLUG);
  if (error) {
    return { ok: false, error: safeActionError("메모 저장", error) };
  }

  // 공개 캐시 무효화 3줄(BR-CACHE-001) — publicMemo가 공개 DTO에 실리므로 필수.
  revalidatePath("/");
  revalidatePath("/studio");
  revalidatePublicSchedule();
  return { ok: true };
}
