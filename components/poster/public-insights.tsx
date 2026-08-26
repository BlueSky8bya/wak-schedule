"use client";

// 시청자 '이 달 기록' 시트 — VIC(빅토리) public-insights.tsx 이식(2026-08-26, 사용자 결정:
// 디자인은 VIC 그대로). 차이 둘뿐: ① 방송 시간 카드 없음(방송시간 수집 자체가 이 프로젝트에
// 없다 — ADR-0004·0011) ② 휴뱅 판별은 태그가 아니라 category("dayoff")로.
// 차트 스타일은 편집실과 공유한다(어느 화면에서 열든 같은 차트).
import "@/components/studio/insights.css";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  BroadcastTag,
  ColorPaletteEntry,
  PublicScheduleEvent
} from "@/lib/domain/schedule-types";
import type { TrendStack } from "@/lib/schedules/insights-actions";
import type { PublicBroadcastStats } from "@/lib/schedules/public-loader";
import { BroadcastHours } from "@/components/studio/broadcast-hours";
import { CALENDAR_SLUG } from "@/lib/config/site";
import { StackTrendChart } from "@/components/studio/stack-trend-chart";
import { hapticTick } from "@/lib/ui/haptics";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

type Props = {
  year: number;
  month: number;
  events: PublicScheduleEvent[]; // 공개 일정 전체(모든 달)
  tags: BroadcastTag[];
  palette: ColorPaletteEntry[];
  heartCounts: Record<string, number>;
  onClose: () => void;
};

function ymOf(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}
function monthsBack(year: number, month: number, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
function weekdayOf(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function PublicInsights({ year, month, events, tags, palette, heartCounts, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 방송 기록(집계) — 시트를 열 때 공개 API에서 가져온다. 실패와 '방송 없던 달'은 다르다.
  const [broadcast, setBroadcast] = useState<PublicBroadcastStats | null>(null);
  const [bLoading, setBLoading] = useState(true);
  const [bFailed, setBFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setBLoading(true);
    setBFailed(false);
    fetch(`/api/public/${CALENDAR_SLUG}/broadcast?year=${year}&month=${month}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive) return;
        if (!json || !Array.isArray(json.months)) {
          setBFailed(true);
          return;
        }
        setBroadcast(json as PublicBroadcastStats);
      })
      .catch(() => {
        if (alive) setBFailed(true);
      })
      .finally(() => {
        if (alive) setBLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [year, month, reloadKey]);

  const d = useMemo(() => {
    const months = monthsBack(year, month, 6);
    const thisYm = ymOf(year, month);

    // 태그 롤업(세부 → 최상위 대분류). 색은 커스텀 hex → 팔레트 순.
    const tagById = new Map(tags.map((t) => [t.id, t]));
    const rootOf = (id: string): BroadcastTag | null => {
      let cur = tagById.get(id) ?? null;
      let guard = 0;
      while (cur?.parentId && guard++ < 5) cur = tagById.get(cur.parentId) ?? null;
      return cur;
    };
    const colorOf = (t: BroadcastTag) =>
      t.bgHex ?? palette.find((p) => p.key === t.colorKey)?.bgColor ?? "#e5e7eb";

    const isRest = (e: PublicScheduleEvent) => e.category === "dayoff";
    const inMonth = (e: PublicScheduleEvent, ym: string) => e.startsAt.slice(0, 7) === ym;
    const contentEvents = events.filter((e) => !isRest(e));
    const monthContent = contentEvents.filter((e) => inMonth(e, thisYm));
    const monthRest = events.filter((e) => isRest(e) && inMonth(e, thisYm));

    // 요일 분포(컨텐츠 기준) → 바쁜 요일 / 한가한 요일
    const byWeekday = new Array(7).fill(0) as number[];
    for (const e of monthContent) byWeekday[weekdayOf(e.startsAt.slice(0, 10))] += 1;
    const anyContent = byWeekday.some((n) => n > 0);
    const busiestWeekday = anyContent ? byWeekday.indexOf(Math.max(...byWeekday)) : null;
    const quietestWeekday = anyContent ? byWeekday.indexOf(Math.min(...byWeekday)) : null;

    // 누적 막대(관리자와 같은 StackTrendChart) — 콘텐츠별 / 형식별 / 하트 받은 태그
    const buildStack = (
      pick: (e: PublicScheduleEvent) => string[],
      weight: (e: PublicScheduleEvent) => number,
      kind: "content" | "modifier"
    ): TrendStack => {
      const catMap = new Map<string, { key: string; label: string; color: string }>();
      const monthRows = months.map((ym) => {
        const counts: Record<string, number> = {};
        let total = 0;
        for (const e of events.filter((ev) => inMonth(ev, ym))) {
          const w = weight(e);
          if (w <= 0) continue;
          for (const rootId of new Set(pick(e))) {
            const tag = tagById.get(rootId);
            if (!tag) continue;
            const isModifier = tag.kind === "modifier";
            if ((kind === "modifier") !== isModifier) continue;
            if (!catMap.has(rootId)) {
              catMap.set(rootId, { key: rootId, label: tag.displayName, color: colorOf(tag) });
            }
            counts[rootId] = (counts[rootId] ?? 0) + w;
            total += w;
          }
        }
        return { ym, counts, total };
      });
      return { cats: [...catMap.values()], months: monthRows };
    };
    // 형식(modifier)은 최상위가 자기 자신이라 rootOf가 그대로 돌려준다 — 한 pick으로 둘 다 커버.
    const rootsOf = (e: PublicScheduleEvent) =>
      e.tagIds.map((id) => rootOf(id)?.id).filter((id): id is string => Boolean(id));

    const contentByTag = buildStack(rootsOf, () => 1, "content");
    const modifierByTag = buildStack(rootsOf, () => 1, "modifier");
    // 하트는 '일정당 평균'(비율) — 하트 총합이면 일정 수 많은 태그가 구조적으로 항상 1등이다.
    const heartsRaw = buildStack(rootsOf, (e) => heartCounts[e.id] ?? 0, "content");
    const heartsByTag: TrendStack = {
      cats: heartsRaw.cats,
      months: heartsRaw.months.map((m, i) => {
        const denom = contentByTag.months[i]?.counts ?? {};
        const counts: Record<string, number> = {};
        let total = 0;
        for (const [k, v] of Object.entries(m.counts)) {
          const n = Math.round((v / Math.max(1, denom[k] ?? 0)) * 10) / 10;
          if (n > 0) {
            counts[k] = n;
            total += n;
          }
        }
        return { ym: m.ym, counts, total: Math.round(total * 10) / 10 };
      })
    };

    // 인기 일정 TOP 3 — 하트 개수는 숨기고 1위 대비 비율만.
    const ranked = monthContent
      .map((e) => ({
        id: e.id,
        title: e.publicTitle.split("\n")[0],
        count: heartCounts[e.id] ?? 0
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    const topCount = ranked[0]?.count ?? 0;
    const popular = ranked.map((r) => ({
      id: r.id,
      title: r.title,
      ratio: topCount > 0 ? r.count / topCount : 0
    }));

    // 다음 방송 — 휴뱅 제외, 오늘(KST) 이후 가장 가까운 공개 일정.
    const todayKey = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const next = contentEvents
      .filter((e) => e.startsAt.slice(0, 10) >= todayKey)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

    return {
      months,
      contentCount: monthContent.length,
      contentDays: new Set(monthContent.map((e) => e.startsAt.slice(0, 10))).size,
      restDays: new Set(monthRest.map((e) => e.startsAt.slice(0, 10))).size,
      busiestWeekday,
      quietestWeekday,
      contentByTag,
      modifierByTag,
      heartsByTag,
      popular,
      next: next
        ? { dateKey: next.startsAt.slice(0, 10), title: next.publicTitle.split("\n")[0] }
        : null
    };
  }, [year, month, events, tags, palette, heartCounts]);

  // 백드롭 클릭으로는 닫지 않는다(VIC 신고 반영) — 방송 '같이보기' 위에서 오클릭으로 시트가
  // 닫히는 사고 방지. 닫기는 조준된 행동만: X 버튼 · Esc · (폰) 뒤로가기.
  return (
    <div className="pi-backdrop" role="presentation">
      <section aria-label={`${month}월 기록`} aria-modal="true" className="pi-sheet" role="dialog">
        <header className="pi-head">
          <strong>
            {year}년 {String(month).padStart(2, "0")}월 기록
          </strong>
          <button
            aria-label="닫기"
            className="pi-close"
            onClick={() => {
              hapticTick();
              onClose();
            }}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <div className="pi-body insights">
          {/* 일정 요약 — 편집실 '일정' 패널과 같은 타일 구성. */}
          <div className="pi-card">
            <span className="pi-label">일정</span>
            <div className="pi-stats">
              <div className="pi-stat">
                <b>{d.contentCount}개</b>
                <span>이번 달 컨텐츠</span>
              </div>
              <div className="pi-stat">
                <b>{d.contentDays}일</b>
                <span>컨텐츠 있는 날</span>
              </div>
              <div className="pi-stat">
                <b>{d.restDays}일</b>
                <span>휴뱅 날</span>
              </div>
              <div className="pi-stat">
                <b>{d.busiestWeekday !== null ? `${WEEKDAY[d.busiestWeekday]}요일` : "—"}</b>
                <span>바쁜 요일</span>
              </div>
              <div className="pi-stat">
                <b>{d.quietestWeekday !== null ? `${WEEKDAY[d.quietestWeekday]}요일` : "—"}</b>
                <span>한가한 요일</span>
              </div>
            </div>
            <p className="pi-next">
              <span>다음 방송</span>
              <strong>
                {d.next
                  ? `${Number(d.next.dateKey.slice(8, 10))}일 · ${d.next.title}`
                  : "예정된 방송 없음"}
              </strong>
            </p>
          </div>

          {/* 방송 시간 — 편집실과 같은 BroadcastHours(6개월 막대 + 이 달 일별 + 요약). */}
          <div className="pi-card pi-broadcast">
            <span className="pi-label">방송 시간</span>
            {bLoading ? (
              <div className="pi-skeleton" aria-hidden="true" />
            ) : bFailed || !broadcast ? (
              <p className="pi-empty pi-failed">
                방송 기록을 못 불러왔어요.
                <button
                  className="pi-retry"
                  onClick={() => setReloadKey((k) => k + 1)}
                  type="button"
                >
                  다시 시도
                </button>
              </p>
            ) : (
              <BroadcastHours
                broadcastDaily={broadcast.daily}
                broadcastDays={broadcast.days}
                broadcastHours={broadcast.hours}
                months={broadcast.months}
              />
            )}
          </div>

          {/* 인기 일정 — 하트 개수 비공개, 1위 대비 비율 막대만. 비어도 자리 유지. */}
          <div className="pi-card">
            <span className="pi-label">팬치들이 많이 누른 일정</span>
            {d.popular.length === 0 ? (
              <p className="pi-empty">아직 하트를 받은 일정이 없어요.</p>
            ) : (
              <ol className="pi-top">
                {d.popular.map((p, i) => (
                  <li key={p.id}>
                    <span className="pi-rank">{["🥇", "🥈", "🥉"][i]}</span>
                    <span className="pi-top-title">{p.title}</span>
                    <span className="pi-bar heart">
                      <i style={{ width: `${Math.round(p.ratio * 100)}%` }} />
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* 6개월 추이 — 편집실과 같은 누적 막대 차트. 하트는 숫자 없이 비율만. */}
          <div className="pi-card">
            <span className="pi-label">최근 6개월</span>
            <StackTrendChart data={d.contentByTag} showLegend={false} title="🗓️ 콘텐츠별" />
            <StackTrendChart data={d.modifierByTag} showLegend={false} title="🎛️ 형식별" />
            <StackTrendChart
              data={d.heartsByTag}
              rankLabel="일정당 평균 하트 순"
              showLegend={false}
              showNumbers={false}
              title="💗 하트 받은 태그"
            />
          </div>

        </div>
      </section>
    </div>
  );
}
