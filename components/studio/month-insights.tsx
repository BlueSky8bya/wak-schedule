"use client";

import "@/components/studio/insights.css";

import { CalendarDays, ChevronLeft, ChevronRight, Heart, LineChart, Lock, Trophy } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { MonthInsights, MonthInsightsResult } from "@/lib/schedules/insights-actions";
import {
  changeGatePassAction,
  getGateInfoAction
} from "@/lib/schedules/security-actions";
import { hapticError, hapticSuccess, hapticTick } from "@/lib/ui/haptics";

// 월별 인사이트 — VIC(빅토리)의 4패널 문법·디자인을 그대로 잇는다(사용자 결정 2026-08-26:
// 디자인은 VIC 것, 탭 구성만 이 프로젝트에 맞게). 데이터는 일정 파생만(ADR-0011).
// 실시간·방문·시스템 탭은 그 데이터 수집 자체가 없어 존재하지 않는다.
// 보안 탭 = 최초공개(떡밥) 게이트 비밀번호 관리(0062 — 초기값 0724).
const PANELS = [
  { key: "content", label: "일정", icon: CalendarDays },
  { key: "engagement", label: "참여", icon: Heart },
  { key: "trend", label: "트렌드", icon: LineChart },
  { key: "highlight", label: "하이라이트", icon: Trophy },
  { key: "security", label: "보안", icon: Lock }
] as const;

type Props = {
  initialYear: number;
  initialMonth: number;
  loadAction: (input: { year: number; month: number }) => Promise<MonthInsightsResult>;
};

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

  const delta = (now: number, before: number) => {
    const d = now - before;
    return d === 0 ? "±0" : d > 0 ? `+${d}` : `${d}`;
  };
  const maxTag = data?.tagRank[0]?.count ?? 0;

  function renderContent(d: MonthInsights) {
    return (
      <>
        <div className="insight-grid">
          <div className="insight-tile">
            <strong>{d.broadcastDays}</strong>
            <span>방송 일수 (전월 {delta(d.broadcastDays, d.prev.broadcastDays)})</span>
          </div>
          <div className="insight-tile">
            <strong>{d.dayoffDays}</strong>
            <span>휴뱅 일수</span>
          </div>
          <div className="insight-tile">
            <strong>{d.totalEvents}</strong>
            <span>일정 수{d.draftCount > 0 ? ` · 발행 전 ${d.draftCount}` : ""}</span>
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
                    style={{
                      width: `${maxTag > 0 ? Math.max(8, Math.round((t.count / maxTag) * 100)) : 0}%`,
                      background: t.bgHex ?? undefined
                    }}
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
    return (
      <>
        <div className="insight-grid">
          <div className="insight-tile" data-tone="heart">
            <strong>{d.heartsTotal.toLocaleString()}</strong>
            <span>하트 (전월 {delta(d.heartsTotal, d.prev.heartsTotal)})</span>
          </div>
          <div className="insight-tile">
            <strong>{d.hopeTotal.toLocaleString()}</strong>
            <span>기대돼요</span>
          </div>
        </div>
        <h4 className="insight-subhead">하트 많은 일정</h4>
        {d.heartsTop.length === 0 ? (
          <p className="insight-empty">아직 하트가 눌린 일정이 없어요.</p>
        ) : (
          <ul className="insight-bars">
            {d.heartsTop.map((e) => (
              <li key={`${e.dateKey}-${e.title}`}>
                <span className="insight-bar-label">
                  {e.dateKey.slice(5).replace("-", "/")} {e.title}
                </span>
                <span className="insight-bar-track">
                  <span
                    className="insight-bar-fill heart"
                    style={{
                      width: `${Math.max(10, Math.round((e.count / Math.max(1, d.heartsTop[0].count)) * 100))}%`
                    }}
                  />
                </span>
                <span className="insight-bar-count">{e.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  function renderTrend(d: MonthInsights) {
    const maxB = Math.max(1, ...d.trend.map((x) => x.broadcastDays));
    return (
      <>
        <h4 className="insight-subhead">최근 6개월 방송 일수</h4>
        <div className="mi-trend">
          {d.trend.map((t) => (
            <div className="mi-trend-col" key={`${t.year}-${t.month}`}>
              <span className="mi-trend-num">{t.broadcastDays}</span>
              <span
                className={`mi-trend-bar${t.year === d.year && t.month === d.month ? " cur" : ""}`}
                style={{ height: `${Math.max(6, Math.round((t.broadcastDays / maxB) * 72))}px` }}
              />
              <span className="mi-trend-label">{t.month}월</span>
              <span className="mi-trend-sub">♥{t.heartsTotal.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  function renderHighlight(d: MonthInsights) {
    return (
      <div className="insight-grid">
        <div className="insight-tile" data-text="">
          <strong>
            {d.highlight.topHeart
              ? `${d.highlight.topHeart.title} ♥${d.highlight.topHeart.count.toLocaleString()}`
              : "아직 없음"}
          </strong>
          <span>🏆 하트 1위</span>
        </div>
        <div className="insight-tile" data-text="">
          <strong>
            {d.highlight.topTag ? `${d.highlight.topTag.name} ${d.highlight.topTag.count}회` : "아직 없음"}
          </strong>
          <span>🎯 최다 컨텐츠</span>
        </div>
        <div className="insight-tile" data-text="">
          <strong>{d.highlight.longestStreak > 0 ? `${d.highlight.longestStreak}일` : "아직 없음"}</strong>
          <span>🔥 최장 연속 방송</span>
        </div>
      </div>
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
                ) : p.key === "trend" ? (
                  renderTrend(data)
                ) : (
                  renderHighlight(data)
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
        아직 공개 전인 최초공개(떡밥) 일정을 편집실에서 열 때 묻는 비밀번호예요. 방송 화면
        공유 중 오클릭으로 내용이 새는 걸 막아줘요.
        {isInitial ? " 지금은 초기 비밀번호(0724, 왁굳형 생일) 그대로예요 — 바꿔두는 걸 추천!" : ""}
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
