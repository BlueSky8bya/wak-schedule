"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublicSchedule } from "@/lib/schedules/cache";
import type { EventCategory, EventStatus } from "@/lib/domain/schedule-types";
import { resolveCurrentActor } from "@/lib/auth/actor";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/auth/admin";
import { canEditSchedule } from "@/lib/permissions/roles";
import { safeActionError } from "@/lib/utils/safe-action-error";
import { validateDateKey, validateTagAssignment } from "@/lib/schedules/event-validation";
import { CALENDAR_SLUG } from "@/lib/config/site";

export type SaveEventInput = {
  id?: string;
  dateKey: string;
  endDateKey?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  isTentative?: boolean;
  publicTitle: string;
  publicDescription: string;
  category: EventCategory;
  status: EventStatus;
  tagIds: string[];
  primaryTagIds: string[];
  teaser?: boolean; // 떡밥(가림) 일정
  teaserRevealAt?: string | null; // 공개 시각(ISO). teaser일 때만 의미.
};

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

const SLUG = CALENDAR_SLUG;
// (태그 상한 상수는 event-validation.ts로 이동 — 서버 검증과 한 곳에서 관리)

// 태그를 강제하지 않는다: 콘텐츠 대분류가 하나도 없어도(또는 방식만 있어도) 그대로 저장한다.
// 태그 없는 일정 = 색 없는 흰 카드. 예전엔 '기타' 태그를 자동 부착해 "이벤트당 콘텐츠 ≥1" 불변식을
// 지켰는데, 그 로직이 display_name==="기타" 리터럴에 묶여 있어 운영자가 그 태그를 지우면 조용히
// 죽었다. 이제 불변식 자체를 버린다 — '기타'는 태그가 아니라 인사이트의 합성 버킷(태그 0개인 공개
// 일정 카운트)으로만 존재한다.

// (diffDaysKey/addDaysKey 삭제 — 날짜 이동의 종료일 폭 계산은 0055 reorder_events_atomic가
//  DB 트랜잭션 안에서 date 연산으로 처리한다.)

// (moveEventAction 삭제 — 날짜만 옮기던 옛 액션. 지금은 아래 reorderEventsAction이 movedId로
//  '날짜 이동 + 같은 날 순서'를 한 번에 처리하고 편집실도 그것만 부른다. 호출자 0으로 확인.)

// 같은 날 안에서 일정 카드 순서 바꾸기(드래그). 다른 날에서 끌어온 경우 그 일정의 날짜도 함께
// 옮긴다. orderedIds 순서대로 sort_order를 0,1,2…로 부여한다(같은 날 표시 순서를 결정).
export async function reorderEventsAction(input: {
  dateKey: string;
  orderedIds: string[];
  movedId?: string; // 다른 날에서 이 날로 옮겨온 일정(있으면 date_key도 갱신)
}): Promise<ActionResult> {
  const actor = await resolveCurrentActor();
  if (!canEditSchedule(actor.role)) {
    return { ok: false, error: "owner 또는 developer만 일정을 옮길 수 있습니다." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateKey)) {
    return { ok: false, error: "날짜 형식이 올바르지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase가 설정되지 않았습니다." };
  }

  // P0-DATA-2: 날짜 이동 + 정렬을 DB 함수 한 트랜잭션으로(0055). 중간 실패 = 전체 롤백 —
  // "날짜는 옮겨졌는데 순서는 옛것" 같은 반쪽 상태가 생기지 않는다.
  const { error: reorderErr } = await supabase.rpc("reorder_events_atomic", {
    p_date_key: input.dateKey,
    p_ordered_ids: input.orderedIds,
    p_moved_id: input.movedId ?? null
  });
  if (reorderErr) {
    return { ok: false, error: safeActionError("일정 이동/순서 저장", reorderErr) };
  }

  revalidatePath("/");
  revalidatePath("/studio");
  revalidatePublicSchedule();
  // 다른 날에서 끌어온 것(movedId)과 같은 날 안 순서 바꾸기는 의미가 달라 kind를 나눈다.
  return { ok: true, id: input.movedId ?? input.orderedIds[0] ?? "" };
}

export async function saveEventAction(input: SaveEventInput): Promise<ActionResult> {
  const actor = await resolveCurrentActor();

  if (!canEditSchedule(actor.role)) {
    return { ok: false, error: "owner 또는 developer만 일정을 편집할 수 있습니다." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase가 설정되지 않았습니다." };
  }

  const { data: calendar } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", SLUG)
    .maybeSingle();

  if (!calendar) {
    return { ok: false, error: "캘린더를 찾을 수 없습니다." };
  }

  // P0-AUTH-1: 입력 검증 — 날짜 형식·업 도움 링크(https만)·태그 payload(개수/중복/소속).
  for (const [key, label] of [
    [input.dateKey, "시작"],
    [input.endDateKey, "종료"]
  ] as const) {
    const v = validateDateKey(key, label);
    if (!v.ok) return { ok: false, error: v.error };
  }
  if (!input.dateKey) {
    return { ok: false, error: "시작 날짜가 필요합니다." };
  }
  const tagCheck = await validateTagAssignment(
    supabase,
    calendar.id,
    input.tagIds,
    input.primaryTagIds
  );
  if (!tagCheck.ok) return { ok: false, error: tagCheck.error };

  // 종료일이 시작일보다 뒤일 때만 멀티데이로 저장
  const endDateKey =
    input.endDateKey && input.endDateKey > input.dateKey ? input.endDateKey : null;

  const publicTitleTrim = input.publicTitle.trim() || "새 일정";
  const publicDescTrim = input.publicDescription.trim() || null;

  const row = {
    calendar_id: calendar.id,
    date_key: input.dateKey,
    end_date_key: endDateKey,
    start_time: input.isAllDay ? null : input.startTime || null,
    end_time: input.isAllDay ? null : input.endTime || null,
    is_all_day: input.isAllDay,
    is_tentative: input.isTentative ?? false,
    public_title: publicTitleTrim,
    public_description: publicDescTrim,
    status: input.status,
    category: input.category,
    // 떡밥(최초공개): 공개 시각이 없으면 떡밥 해제로 본다.
    teaser: Boolean(input.teaser) && Boolean(input.teaserRevealAt),
    teaser_reveal_at: input.teaser && input.teaserRevealAt ? input.teaserRevealAt : null,
    updated_at: new Date().toISOString()
  };

  // P0-DATA-2: 본문 + 태그를 DB 함수 한 트랜잭션으로(0055). 어느 단계가 실패해도 전체 롤백 —
  // "본문은 바뀌었는데 태그는 옛것" 같은 부분 커밋이 생기지 않는다.
  const { data: rpcId, error: rpcError } = await supabase.rpc("save_event_atomic", {
    p_event_id: input.id ?? null,
    p_row: row,
    p_tags: input.tagIds.map((tagId, index) => ({
      tag_id: tagId,
      is_primary: input.primaryTagIds.includes(tagId),
      sort_order: index
    })),
    p_meta: null
  });
  if (rpcError || !rpcId) {
    return { ok: false, error: safeActionError("일정 저장", rpcError) };
  }
  const eventId = rpcId as string;

  // ⚠ 공개 캐시 무효화는 **DB 쓰기 직후, 다른 무엇보다 먼저**. 이게 빠지면 방금 만든/고친 일정이
  // 최대 5분(PUBLIC_SCHEDULE_REVALIDATE_SECONDS)을 시청자 화면·미리보기에 안 나온다.
  // 2026-08-04 커밋 72f6971이 recordActivity를 넣으면서 이 세 줄을 통째로 지웠고, 그 뒤
  // '떡밥 만들어도 미리보기에 안 뜸 / 지운 일정이 빈 흰 카드로 남음'이 재현됐다(2026-08-05 실측).
  // tests/unit/public-cache-revalidate.test.ts가 액션별로 실제 호출을 확인한다.
  revalidatePath("/");
  revalidatePath("/studio");
  revalidatePublicSchedule();

  // 행동 기록(0062) — 제목·본문은 절대 넣지 않는다(target=uuid, meta=구조 정보만).

  return { ok: true, id: eventId };
}

// 삭제 복구 보존 시간(ADR-0011 L5) — 이 시간 안에는 같은 id로 완전 복구 가능, 지나면 물리 삭제.
const TOMBSTONE_RETENTION_MS = 24 * 60 * 60 * 1000;

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  const actor = await resolveCurrentActor();

  if (!canEditSchedule(actor.role)) {
    return { ok: false, error: "owner 또는 developer만 일정을 삭제할 수 있습니다." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase가 설정되지 않았습니다." };
  }

  // P0-DATA-1: hard delete 대신 tombstone — 태그/연결/하트/비공개 메타가 FK 그대로 보존돼
  // '실행 취소'가 같은 id로 완전 복구된다. 24시간 지난 tombstone은 지나가며 물리 삭제(purge —
  // FK cascade로 관계 행도 함께). 낮은 트래픽이라 크론 없이 충분.
  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId);
  if (error) {
    return { ok: false, error: safeActionError("일정 삭제", error) };
  }
  await supabase
    .from("events")
    .delete()
    .lt("deleted_at", new Date(Date.now() - TOMBSTONE_RETENTION_MS).toISOString());

  // 삭제도 즉시 무효화한다 — 안 하면 지운 일정이 최대 5분간 시청자 화면에 남는다(떡밥이면
  // 서버가 더 이상 그 id를 못 찾아 '빈 흰 카드'로 굳는다). 72f6971에서 함께 사라졌던 세 줄.
  revalidatePath("/");
  revalidatePath("/studio");
  revalidatePublicSchedule();


  return { ok: true, id: eventId };
}

// P0-DATA-1: 삭제 복구 — tombstone을 걷어 같은 id로 되살린다(관계 전부 보존).
// 보존 시간(24h)이 지나 purge된 일정은 복구 불가(그때는 실패를 정직하게 알린다).
export async function restoreEventAction(eventId: string): Promise<ActionResult> {
  const actor = await resolveCurrentActor();
  if (!canEditSchedule(actor.role)) {
    return { ok: false, error: "owner 또는 developer만 일정을 복구할 수 있습니다." };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase가 설정되지 않았습니다." };
  }
  const { data, error } = await supabase
    .from("events")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();
  if (error) {
    return { ok: false, error: safeActionError("일정 복구", error) };
  }
  if (!data) {
    return { ok: false, error: "복구 기간(24시간)이 지났거나 이미 복구된 일정입니다." };
  }

  revalidatePath("/");
  revalidatePath("/studio");
  revalidatePublicSchedule();
  return { ok: true, id: eventId };
}

// 일정별 태그 "할당"만 바꾼다(일정 본문·태그 정의는 안 건드린다).
// 관리 클라이언트(서비스 롤)로 RLS를 우회하되, 앱 권한과 캘린더 소속을 직접 검증한다.
export async function updateEventTagsAction(
  eventId: string,
  tagIds: string[],
  primaryTagIds: string[]
): Promise<ActionResult> {
  const actor = await resolveCurrentActor();
  if (!canEditSchedule(actor.role)) {
    return { ok: false, error: "일정 태그를 편집할 권한이 없습니다." };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, error: "Supabase가 설정되지 않았습니다." };
  }

  const { data: calendar } = await admin
    .from("calendars")
    .select("id")
    .eq("slug", SLUG)
    .maybeSingle();
  if (!calendar) {
    return { ok: false, error: "캘린더를 찾을 수 없습니다." };
  }

  const { data: ev } = await admin
    .from("events")
    .select("id, calendar_id")
    .is("deleted_at", null)
    .eq("id", eventId)
    .maybeSingle();
  if (!ev || ev.calendar_id !== calendar.id) {
    return { ok: false, error: "일정을 찾을 수 없습니다." };
  }
  // P0-AUTH-1: payload 검증(개수/중복/대표 부분집합/이 캘린더의 활성 태그) — 조용한 slice 대신 거부.
  const tagCheck = await validateTagAssignment(admin, calendar.id, tagIds, primaryTagIds);
  if (!tagCheck.ok) return { ok: false, error: tagCheck.error };

  // 태그 0개면 그대로 둔다(색 없는 흰 카드 — 강제 부착 없음).
  await admin.from("event_tags").delete().eq("event_id", eventId);
  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId, index) => ({
      event_id: eventId,
      tag_id: tagId,
      is_primary: primaryTagIds.includes(tagId),
      sort_order: index
    }));
    const { error } = await admin.from("event_tags").insert(rows);
    if (error) {
      return { ok: false, error: safeActionError("태그 저장", error) };
    }
  }

  revalidatePath("/");
  revalidatePath("/studio");
  revalidatePublicSchedule();

  return { ok: true, id: eventId };
}
