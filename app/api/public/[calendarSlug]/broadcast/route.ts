import { NextResponse } from "next/server";
import { getPublicBroadcastStats } from "@/lib/schedules/public-loader";
import { CALENDAR_SLUG } from "@/lib/config/site";

// 공개 방송 시간 집계(ADR-0012) — '이 달 기록'·인사이트 트렌드가 쓴다.
// 공개 경계: public-loader만 import(BR-PUBLIC-001). 값은 모두에게 같아 CDN 캐시 안전.
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ calendarSlug: string }> }
) {
  const { calendarSlug } = await params;
  if (calendarSlug !== CALENDAR_SLUG) {
    return NextResponse.json({ error: "unknown calendar" }, { status: 404 });
  }
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "bad range" }, { status: 400 });
  }
  const stats = await getPublicBroadcastStats(year, month);
  if (!stats) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=60" }
  });
}
