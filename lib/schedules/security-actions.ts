"use server";

import { createHash } from "node:crypto";
import { resolveCurrentActor } from "@/lib/auth/actor";
import { createSupabaseAdminClient } from "@/lib/auth/admin";
import { canEditSchedule } from "@/lib/permissions/roles";
import { CALENDAR_SLUG } from "@/lib/config/site";

// 최초공개(떡밥) 게이트 비밀번호 (0062). 해시만 저장 — sha256(calendar_id || passcode).
// 초기 비밀번호는 '0724'(왁굳형 생일). 변경은 보안 탭에서. 게이트 검증 라우트
// (/api/unlock-private-layer)와 이 액션이 같은 해시 규칙을 쓴다.
// 캐시 무효화 없음 — 관리 전용 데이터(공개 DTO 무관, BR-CACHE-001 EXCEPT 등재 사유).

const INITIAL_PASS = "0724";
const PASS_RE = /^\d{4,12}$/;

function hashPass(calendarId: string, pass: string): string {
  return createHash("sha256").update(`${calendarId}${pass}`).digest("hex");
}

async function gateContext() {
  const actor = await resolveCurrentActor();
  if (!canEditSchedule(actor.role)) {
    return { error: "owner 또는 developer만 쓸 수 있습니다." } as const;
  }
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { error: "저장소 연결이 설정되지 않았습니다." } as const;
  }
  const { data } = await admin
    .from("calendars")
    .select("id, gate_pass_hash")
    .eq("slug", CALENDAR_SLUG)
    .maybeSingle();
  if (!data) {
    return { error: "캘린더를 찾을 수 없습니다." } as const;
  }
  return {
    admin,
    calendarId: data.id as string,
    storedHash: (data.gate_pass_hash as string | null) ?? null
  } as const;
}

// 게이트 검증(라우트에서 사용). 저장된 해시가 없으면 초기 비밀번호와 비교한다.
export async function verifyGatePass(pass: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await gateContext();
  if ("error" in ctx && ctx.error) {
    return { ok: false, error: ctx.error };
  }
  if (!("calendarId" in ctx)) {
    return { ok: false, error: "확인 실패" };
  }
  const expected = ctx.storedHash ?? hashPass(ctx.calendarId, INITIAL_PASS);
  if (hashPass(ctx.calendarId, pass) !== expected) {
    return { ok: false, error: "비밀번호가 올바르지 않습니다." };
  }
  return { ok: true };
}

export type GateInfoResult = { ok: true; isInitial: boolean } | { ok: false; error: string };

// 보안 탭 표시용 — 아직 초기 비밀번호(0724)인지.
export async function getGateInfoAction(): Promise<GateInfoResult> {
  const ctx = await gateContext();
  if ("error" in ctx && ctx.error) {
    return { ok: false, error: ctx.error };
  }
  if (!("calendarId" in ctx)) {
    return { ok: false, error: "확인 실패" };
  }
  const isInitial =
    ctx.storedHash === null || ctx.storedHash === hashPass(ctx.calendarId, INITIAL_PASS);
  return { ok: true, isInitial };
}

export type GatePassChangeResult = { ok: true } | { ok: false; error: string };

// 비밀번호 변경 — 현재 비밀번호 확인 후 교체.
export async function changeGatePassAction(input: {
  current: string;
  next: string;
}): Promise<GatePassChangeResult> {
  const ctx = await gateContext();
  if ("error" in ctx && ctx.error) {
    return { ok: false, error: ctx.error };
  }
  if (!("calendarId" in ctx)) {
    return { ok: false, error: "확인 실패" };
  }
  const next = input.next.trim();
  if (!PASS_RE.test(next)) {
    return { ok: false, error: "새 비밀번호는 숫자 4~12자리로 해주세요." };
  }
  const expected = ctx.storedHash ?? hashPass(ctx.calendarId, INITIAL_PASS);
  if (hashPass(ctx.calendarId, input.current.trim()) !== expected) {
    return { ok: false, error: "현재 비밀번호가 올바르지 않습니다." };
  }
  const { error } = await ctx.admin
    .from("calendars")
    .update({ gate_pass_hash: hashPass(ctx.calendarId, next) })
    .eq("id", ctx.calendarId);
  if (error) {
    return { ok: false, error: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
  return { ok: true };
}
