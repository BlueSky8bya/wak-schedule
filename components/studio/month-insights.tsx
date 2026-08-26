"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Heart, LineChart, Trophy } from "lucide-react";
import type { MonthInsights, MonthInsightsResult } from "@/lib/schedules/insights-actions";
import { hapticTick } from "@/lib/ui/haptics";

// 월별 인사이트(ADR-0011) — 일정 파생 통계만. VIC의 방문·방송시간 패널은 데이터 원천이
// 없어 재현하지 않는다. 열 때만 로드(편집실 첫 로딩 무영향), ◀▶로 달 이동.
type Props = {
  initialYear: number;
  initialMonth: number;
  loadAction: (input: { year: number; month: number }) => Promise<MonthInsightsResult>;
};

// VIC의 4패널 문법(일정·참여·트렌드·하이라이트)을 계승 — 데이터만 일정 파생으로(ADR-0011).
// 실시간·방문·보안·시스템 탭은 그 데이터 수집 자체가 이 프로젝트에 없어 존재하지 않는다.
const PANELS = [
  { key: "content", label: "일정", icon: CalendarDays },
  { key: "engagement", label: "참여", icon: Heart },
  { key: "trend", label: "트렌드", icon: LineChart },
  { key: "highlight", label: "하이라이트", icon: Trophy }
] as const;
type PanelKey = (typeof PANELS)[number]["key"];

export function MonthInsightsPanel({ initialYear, initialMonth, loadAction }: Props) {
  const [view, setView] = useState({ year: initialYear, month: initialMonth });
  const [panel, setPanel] = useState<PanelKey>("content");
  const [data, setData] = useState<MonthInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (year: number, month: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await loadAction({ year, month });
        if (res.ok) {
          setData(res.data);
        } else {
          setError(res.error);
        }
      } catch {
        setError("불러오기 실패 — 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    },
    [loadAction]
  );

  useEffect(() => {
    void load(view.year, view.month);
  }, [view, load]);

  function moveMonth(delta: number) {
    hapticTick();
    setView((v) => {
      const m = v.month + delta;
      if (m < 1) return { year: v.year - 1, month: 12 };
      if (m > 12) return { year: v.year + 1, month: 1 };
      return { ...v, month: m };
    });
  }

  const delta = (now: number, before: number) => {
    const d = now - before;
    return d === 0 ? "±0" : d > 0 ? `+${d}` : `${d}`;
  };
  const maxTag = data?.tagRank[0]?.count ?? 0;

  return (
    <div className="mi-panel">
      <div className="mi-monthbar">
        <button aria-label="이전 달" onClick={() => moveMonth(-1)} type="button">
          <ChevronLeft aria-hidden="true" size={18} />
        </button>
        <strong>
          {view.year}년 {view.month}월
        </strong>
        <button aria-label="다음 달" onClick={() => moveMonth(1)} type="button">
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="mi-tabs" role="tablist">
        {PANELS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              aria-selected={panel === tab.key}
              className={`mi-tab${panel === tab.key ? " on" : ""}`}
              key={tab.key}
              onClick={() => {
                hapticTick();
                setPanel(tab.key);
              }}
              role="tab"
              type="button"
            >
              <Icon aria-hidden="true" size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="mi-note" role="status">
          불러오는 중…
        </p>
      ) : error ? (
        <p className="mi-note is-error" role="alert">
          {error}
        </p>
      ) : data ? (
        <>
          {panel === "content" ? (
          <>
          <div className="mi-tiles">
            <div className="mi-tile">
              <span className="mi-tile-num">{data.broadcastDays}</span>
              <span className="mi-tile-label">방송 일수</span>
              <span className="mi-tile-delta">전월 {delta(data.broadcastDays, data.prev.broadcastDays)}</span>
            </div>
            <div className="mi-tile">
              <span className="mi-tile-num">{data.dayoffDays}</span>
              <span className="mi-tile-label">휴뱅 일수</span>
            </div>
            <div className="mi-tile">
              <span className="mi-tile-num">{data.totalEvents}</span>
              <span className="mi-tile-label">일정 수</span>
              {data.draftCount > 0 ? (
                <span className="mi-tile-delta">발행 전 {data.draftCount}</span>
              ) : null}
            </div>
          </div>

          <section className="mi-section">
            <h3>콘텐츠 순위</h3>
            {data.tagRank.length === 0 ? (
              <p className="mi-note">이 달에 태그가 붙은 일정이 아직 없다.</p>
            ) : (
              <ol className="mi-rank">
                {data.tagRank.map((t) => (
                  <li key={t.id}>
                    <span className="mi-rank-name">{t.name}</span>
                    <span className="mi-rank-bar-wrap">
                      <span
                        className="mi-rank-bar"
                        data-color={t.colorKey}
                        style={{
                          width: `${maxTag > 0 ? Math.max(8, Math.round((t.count / maxTag) * 100)) : 0}%`,
                          background: t.bgHex ?? undefined
                        }}
                      />
                    </span>
                    <span className="mi-rank-count">{t.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          </>
          ) : null}

          {panel === "engagement" ? (
          <>
          <div className="mi-tiles">
            <div className="mi-tile">
              <span className="mi-tile-num">{data.heartsTotal.toLocaleString()}</span>
              <span className="mi-tile-label">하트</span>
              <span className="mi-tile-delta">전월 {delta(data.heartsTotal, data.prev.heartsTotal)}</span>
            </div>
            <div className="mi-tile">
              <span className="mi-tile-num">{data.hopeTotal.toLocaleString()}</span>
              <span className="mi-tile-label">기대돼요</span>
            </div>
          </div>
          <section className="mi-section">
            <h3>하트 많은 일정</h3>
            {data.heartsTop.length === 0 ? (
              <p className="mi-note">아직 하트가 눌린 일정이 없다.</p>
            ) : (
              <ol className="mi-top">
                {data.heartsTop.map((e) => (
                  <li key={`${e.dateKey}-${e.title}`}>
                    <span className="mi-top-date">{e.dateKey.slice(5).replace("-", "/")}</span>
                    <span className="mi-top-title">{e.title}</span>
                    <span className="mi-top-count">♥ {e.count.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          </>
          ) : null}

          {panel === "trend" ? (
          <section className="mi-section">
            <h3>최근 6개월</h3>
            <div className="mi-trend">
              {data.trend.map((t) => {
                const maxB = Math.max(1, ...data.trend.map((x) => x.broadcastDays));
                return (
                  <div className="mi-trend-col" key={`${t.year}-${t.month}`}>
                    <span className="mi-trend-num">{t.broadcastDays}</span>
                    <span
                      className={`mi-trend-bar${t.year === data.year && t.month === data.month ? " cur" : ""}`}
                      style={{ height: `${Math.max(6, Math.round((t.broadcastDays / maxB) * 72))}px` }}
                    />
                    <span className="mi-trend-label">{t.month}월</span>
                    <span className="mi-trend-sub">♥{t.heartsTotal.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
            <p className="mi-note">막대 = 방송 일수 · 아래 = 그 달 일정의 하트 합.</p>
          </section>
          ) : null}

          {panel === "highlight" ? (
          <section className="mi-section">
            <div className="mi-cards">
              <div className="mi-card">
                <span className="mi-card-ic" aria-hidden="true">🏆</span>
                <span className="mi-card-label">하트 1위</span>
                <span className="mi-card-value">
                  {data.highlight.topHeart
                    ? `${data.highlight.topHeart.title} (♥${data.highlight.topHeart.count.toLocaleString()})`
                    : "아직 없음"}
                </span>
              </div>
              <div className="mi-card">
                <span className="mi-card-ic" aria-hidden="true">🎯</span>
                <span className="mi-card-label">최다 콘텐츠</span>
                <span className="mi-card-value">
                  {data.highlight.topTag
                    ? `${data.highlight.topTag.name} (${data.highlight.topTag.count}회)`
                    : "아직 없음"}
                </span>
              </div>
              <div className="mi-card">
                <span className="mi-card-ic" aria-hidden="true">🔥</span>
                <span className="mi-card-label">최장 연속 방송</span>
                <span className="mi-card-value">
                  {data.highlight.longestStreak > 0 ? `${data.highlight.longestStreak}일` : "아직 없음"}
                </span>
              </div>
            </div>
          </section>
          ) : null}

          <p className="mi-foot">
            일정·하트·기대돼요 데이터 기준. 방문자·방송시간 통계는 수집하지 않는다(ADR-0011).
          </p>
        </>
      ) : null}
    </div>
  );
}
