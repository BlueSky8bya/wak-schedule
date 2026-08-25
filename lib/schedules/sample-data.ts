import type { StudioSchedule } from "@/lib/domain/schedule-types";
// 이 프로젝트에는 비공개 레이어·스티커가 없으므로, 스튜디오 샘플은 공개 샘플과 같은 일정을 본다
// (차이는 status가 draft를 포함할 수 있다는 것뿐이고, 폴백 샘플에는 draft를 두지 않는다).
// 팔레트·태그·캘린더 메타의 단일 정의는 공개 전용 파일이다 — 여기서 다시 정의하지 않는다.
import {
  defaultPalette,
  defaultTags,
  publicCalendarMeta,
  samplePublicScheduleData
} from "@/lib/schedules/sample-public-data";

// 하위 호환: 예전에 이 모듈에서 팔레트/태그를 import하던 곳을 위해 재노출(단일 정의는 공개 파일).
export { defaultPalette, defaultTags } from "@/lib/schedules/sample-public-data";

export const sampleStudioSchedule: StudioSchedule = {
  calendar: publicCalendarMeta,
  palette: defaultPalette,
  tags: defaultTags,
  events: samplePublicScheduleData.events,
  variantGroups: [],
  heartCount: 0,
  // 미리보기는 서버 공개 스냅샷만 쓰므로(P0-SEC-2) 샘플에서도 공개 샘플 데이터를 그대로 쓴다 —
  // 비워두면 fixture/오프라인 미리보기가 빈 달력으로 보여 실물과 다르다.
  viewerModePreview: samplePublicScheduleData
};
