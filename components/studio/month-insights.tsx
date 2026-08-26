"use client";

import "@/components/studio/insights.css";

import { CalendarDays, ChevronLeft, ChevronRight, Heart, LineChart, Lock } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { MonthInsights, MonthInsightsResult } from "@/lib/schedules/insights-actions";
import {
  changeGatePassAction,
  getGateInfoAction
} from "@/lib/schedules/security-actions";
import { hapticError, hapticSuccess, hapticTick } from "@/lib/ui/haptics";
import { StackTrendChart } from "@/components/studio/stack-trend-chart";
import { TrendDeltaBadge } from "@/components/studio/trend-delta-badge";
import { monthProgress } from "@/lib/insights/month-progress";

// 월별 인사이트 — VIC(빅토리)의 4패널 문법·디자인을 그대로 잇는다(사용자 결정 2026-08-26:
// 디자인은 VIC 것, 탭 구성만 이 프로젝트에 맞게). 데이터는 일정 파생만(ADR-0011).
// 실시간·방문·시스템 탭은 그 데이터 수집 자체가 없어 존재하지 않는다.
// 보안 탭 = 최초공개(떡밥) 게이트 비밀번호 관리(0062 — 초기값 0724).
const PANELS = [
  { key: "content", label: "일정", icon: CalendarDays },
  { key: "engagement", label: "참여", icon: Heart },
  { key: "trend", label: "트렌드", icon: LineChart },
  { key: "security", label: "보안", icon: Lock }
] as const;

type Props = {
  initialYear: number;
  initialMonth: number;
  loadAction: (input: { year: number; month: number }) => Promise<MonthInsightsResult>;
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
function weekdayLabel(wd: number | null): string {
  return wd !== null ? `${WEEKDAY[wd]}요일` : "—";
}
function fmtMonthDay(dateKey: string): string {
  const [yy, mm, dd] = dateKey.split("-").map(Number);
  const wd = WEEKDAY[new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay()] ?? "";
  return `${mm}/${dd}(${wd})`;
}

export function MonthInsightsPanel({ initialYear, initialMonth, loadAction }: Props) {
  const [view, setView] = useState({ year: initialYear, month: initialMonth });
  const [index, setIndex] = useState(0);
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

  // VIC과 동일한 좌우 화살표/스와이프 패널 이동.
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const last = PANELS.length - 1;


  function renderContent(d: MonthInsights) {
    // 이번/지난달 컨텐츠 수(휴뱅 제외) — 트렌드 시리즈의 마지막 두 값이 정확히 그것이다.
    const thisContent = d.trend.content[d.trend.content.length - 1] ?? 0;
    const lastContent = d.trend.content[d.trend.content.length - 2] ?? 0;
    const contentTrend = thisContent - lastContent;
    return (
      <>
        <div className="insight-next">
          <span>다음 방송</span>
          {d.nextBroadcast ? (
            <div className="insight-next-body">
              <strong>{fmtMonthDay(d.nextBroadcast.dateKey)}</strong>
              <div className="insight-chips">
                {d.nextBroadcast.titles.map((t, i2) => (
                  <span className="insight-chip" key={`${t}-${i2}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <strong className="muted">예정된 방송 없음</strong>
          )}
        </div>
        <div className="insight-grid">
          <div className="insight-tile" data-tone="public">
            <strong>
              {thisContent}
              {contentTrend !== 0 ? (
                <em
                  className={`insight-trend ${contentTrend > 0 ? "up" : "down"}`}
                  title={`지난달 ${lastContent}건과 비교`}
                >
                  {contentTrend > 0 ? "▲" : "▼"}
                  {Math.abs(contentTrend)}
                </em>
              ) : null}
            </strong>
            <span>이번 달 컨텐츠</span>
          </div>
          <div className="insight-tile">
            <strong>{d.broadcastDays}</strong>
            <span>컨텐츠 있는 날</span>
          </div>
          <div className="insight-tile">
            <strong>{d.dayoffDays}</strong>
            <span>휴뱅 날</span>
          </div>
          <div className="insight-tile" data-text="">
            <strong>{weekdayLabel(d.busiestWeekday)}</strong>
            <span>바쁜 요일</span>
          </div>
          <div className="insight-tile" data-text="">
            <strong>{weekdayLabel(d.quietestWeekday)}</strong>
            <span>한가한 요일</span>
          </div>
        </div>
        <h4 className="insight-subhead">이번 달 컨텐츠 순위</h4>
        {d.tagRank.length === 0 ? (
          <p className="insight-empty">집계할 컨텐츠가 아직 없어요.</p>
        ) : (
          <ul className="insight-bars">
            {d.tagRank.map((t) => (
              <li key={t.id}>
                <span className="insight-bar-label">{t.name}</span>
                <span className="insight-bar-track">
                  <span
                    className="insight-bar-fill"
                    style={{ width: `${Math.round(t.ratio * 100)}%`, background: t.color }}
                  />
                </span>
                <span className="insight-bar-count">{t.count}</span>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  function renderEngagement(d: MonthInsights) {
    const monthly = d.trend.months.map((ym, i2) => ({ ym, count: d.trend.hearts[i2] ?? 0 }));
    const monMax = Math.max(1, ...monthly.map((m) => m.count));
    return (
      <>
        <div className="insight-grid">
          <div className="insight-tile" data-tone="heart">
            <strong>{d.heartsTotal.toLocaleString()}</strong>
            <span>{d.month}월 하트</span>
          </div>
          <div className="insight-tile" data-tone="heart">
            <strong>{d.hopeTotal.toLocaleString()}</strong>
            <span>기대돼요</span>
          </div>
        </div>
        <h4 className="insight-subhead">월별 하트 (최근 6개월)</h4>
        <div aria-label="월별 하트 그래프" className="vt-chart" role="img">
          {monthly.map((mo) => (
            <div className="vt-col" key={mo.ym}>
              <div className="vt-barwrap">
                <div
                  className="vt-bar heart"
                  data-v={`♥ ${mo.count}`}
                  style={{ height: `${Math.round((mo.count / monMax) * 100)}%` }}
                />
              </div>
              <span className="vt-day">{Number(mo.ym.slice(5, 7))}월</span>
            </div>
          ))}
        </div>
        <h4 className="insight-subhead">이번 달 인기 컨텐츠 TOP</h4>
        {d.heartsTop.length === 0 ? (
          <p className="insight-empty">이 달엔 하트를 받은 일정이 없어요.</p>
        ) : (
          <ul className="insight-rows">
            {d.heartsTop.map((t, i2) => (
              <li key={`${t.title}-${i2}`}>
                <span>
                  {i2 + 1}. {t.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  // 트렌드 — VIC 원본 문법 그대로(컨텐츠·하트 스파크 + 콘텐츠별·형식별·하트 태그 누적 스택).
  // 방송시간 차트만 없다: 방송시간 수집 자체가 이 프로젝트에 없다(ADR-0004·0011).
  function renderTrend(d: MonthInsights) {
    const xLabels = d.trend.months.map((mk, i) => {
      const [yy, mm] = mk.split("-").map(Number);
      const prevYy = i > 0 ? Number(d.trend.months[i - 1].split("-")[0]) : null;
      return { showYear: i === 0 || yy !== prevYy, yy: yy % 100, mm };
    });
    const series = [
      { key: "content", label: "🗓️ 컨텐츠", values: d.trend.content },
      { key: "hearts", label: "💗 하트", values: d.trend.hearts }
    ];
    const lastYm = d.trend.months[d.trend.months.length - 1] ?? "";
    const partial = monthProgress(lastYm);
    return (
      <>
        <p className="insight-note">
          최근 6개월 · 배지는 지난달 대비{partial ? " (진행 중인 달은 페이스 비교)" : ""}
        </p>
        {series.map((sr) => {
          const cur = sr.values[sr.values.length - 1] ?? 0;
          const prev = sr.values[sr.values.length - 2] ?? 0;
          const max = Math.max(1, ...sr.values);
          return (
            <div className="trend-row" key={sr.key}>
              <div className="trend-head">
                <span>{sr.label}</span>
                <strong>{cur.toLocaleString()}</strong>
                <TrendDeltaBadge cur={cur} prev={prev} ym={lastYm} />
              </div>
              <div className="trend-spark">
                {sr.values.map((v, i) => (
                  <div className="trend-bcol" key={i}>
                    <div className="trend-bwrap">
                      <div
                        className={`trend-bar ${i === sr.values.length - 1 ? "cur" : ""}${
                          partial && i === sr.values.length - 1 ? " partial" : ""
                        }`}
                        data-v={`${v}`}
                        style={{ height: `${Math.max(4, Math.round((v / max) * 100))}%` }}
                      />
                    </div>
                    <span className="trend-x">
                      {xLabels[i].showYear ? <em>{xLabels[i].yy}년</em> : null}
                      {xLabels[i].mm}월
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <StackTrendChart data={d.trend.contentByTag} showLegend={false} title="🗓️ 콘텐츠별" />
        <StackTrendChart data={d.trend.modifierByTag} showLegend={false} title="🎛️ 형식별" />
        <StackTrendChart
          data={d.trend.heartsByTag}
          rankLabel="일정당 평균 하트 순"
          showLegend={false}
          showNumbers={false}
          title="💗 하트 받은 태그"
        />
      </>
    );
  }

  return (
    <div className="insights">
      <p className="insights-month">
        <button aria-label="이전 달" className="insights-monthstep" onClick={() => moveMonth(-1)} type="button">
          <ChevronLeft aria-hidden="true" size={14} />
        </button>
        {view.year}년 {view.month}월 인사이트
        <button aria-label="다음 달" className="insights-monthstep" onClick={() => moveMonth(1)} type="button">
          <ChevronRight aria-hidden="true" size={14} />
        </button>
      </p>
      <div className="insights-tabs" role="tablist" aria-label="인사이트 영역">
        {PANELS.map((p, i) => (
          <button
            aria-selected={i === index}
            className={`insights-tab ${i === index ? "active" : ""}`}
            key={p.key}
            onClick={() => {
              hapticTick();
              setIndex(i);
            }}
            role="tab"
            type="button"
          >
            <p.icon aria-hidden="true" size={14} />
            {p.label}
          </button>
        ))}
      </div>

      <div
        className="insights-viewport"
        onPointerCancel={() => (swipeStart.current = null)}
        onPointerDown={(e) => (swipeStart.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = swipeStart.current;
          swipeStart.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
            const next = Math.max(0, Math.min(last, index + (dx < 0 ? 1 : -1)));
            if (next !== index) {
              hapticTick();
              setIndex(next);
            }
          }
        }}
      >
        <div className="insights-track" data-active={index} style={{ transform: `translateX(-${index * 100}%)` }}>
          {PANELS.map((p) => (
            <section className="insights-panel" key={p.key}>
              {p.key === "security" ? (
                <SecurityPanel />
              ) : loading ? (
                <p className="insight-empty">불러오는 중…</p>
              ) : error ? (
                <p className="insight-empty">{error}</p>
              ) : data ? (
                p.key === "content" ? (
                  renderContent(data)
                ) : p.key === "engagement" ? (
                  renderEngagement(data)
                ) : (
                  renderTrend(data)
                )
              ) : null}
            </section>
          ))}
        </div>
      </div>

      <div className="insights-nav">
        <button
          aria-label="이전"
          className="insights-arrow"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
        <div className="insights-dots" aria-hidden="true">
          {PANELS.map((p, i) => (
            <span className={i === index ? "on" : ""} key={p.key} />
          ))}
        </div>
        <button
          aria-label="다음"
          className="insights-arrow"
          disabled={index === last}
          onClick={() => setIndex((i) => Math.min(last, i + 1))}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={20} />
        </button>
      </div>
    </div>
  );
}

// 보안 탭 — 최초공개(떡밥) 편집 게이트 비밀번호 변경. 초기 비밀번호 0724(왁굳형 생일).
function SecurityPanel() {
  const [isInitial, setIsInitial] = useState<boolean | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void getGateInfoAction().then((r) => {
      if (r.ok) setIsInitial(r.isInitial);
    });
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    hapticTick();
    setBusy(true);
    setMsg(null);
    const res = await changeGatePassAction({ current, next });
    setBusy(false);
    if (res.ok) {
      hapticSuccess();
      setMsg({ ok: true, text: "비밀번호를 바꿨어요." });
      setCurrent("");
      setNext("");
      setIsInitial(false);
    } else {
      hapticError();
      setMsg({ ok: false, text: res.error });
    }
  }

  return (
    <div className="gate-security">
      <p className="insight-subhead" style={{ marginTop: 0 }}>
        🔒 최초공개 게이트 비밀번호
      </p>
      <p className="gate-security-note">
        떡밥 일정을 열 때 묻는 비밀번호.
        {isInitial ? " 지금은 초기값(0724) — 변경 추천." : ""}
      </p>
      <form className="gate-security-form" onSubmit={submit}>
        <label>
          <span>현재 비밀번호</span>
          <input
            autoComplete="off"
            inputMode="numeric"
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={isInitial ? "0724" : "현재 비밀번호"}
            type="password"
            value={current}
          />
        </label>
        <label>
          <span>새 비밀번호 (숫자 4~12자리)</span>
          <input
            autoComplete="off"
            inputMode="numeric"
            onChange={(e) => setNext(e.target.value)}
            placeholder="새 비밀번호"
            type="password"
            value={next}
          />
        </label>
        <button className="button primary" disabled={busy || !current || !next} type="submit">
          {busy ? "바꾸는 중…" : "비밀번호 바꾸기"}
        </button>
        {msg ? (
          <p className={`gate-security-msg${msg.ok ? "" : " is-error"}`} role="status">
            {msg.text}
          </p>
        ) : null}
      </form>
    </div>
  );
}
