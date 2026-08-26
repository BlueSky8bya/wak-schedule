"use client";

import { useEffect, useRef, useState } from "react";

// '이 달 메모' — 아바타 자리를 대체하는 편집실 전용 마인드스토밍 패널 (ADR-0009 3차).
// 달을 넘기면 그 달(ym)의 메모를 새로 불러온다(월별 저장 — calendar_month_memos).
// 저장은 디바운스 자동저장 + blur 즉시 저장, 직렬(마지막 입력이 진실).
type Props = {
  ym: string; // "YYYY-MM" — 지금 보고 있는 달
  monthLabel: string; // "8월" — 패널 제목용
  canWrite: boolean; // 클라 게이트(UX) — 서버 액션이 별도로 재검사한다(BR-AUTHZ-001)
  loadAction: (ym: string) => Promise<{ ok: boolean; body?: string; error?: string }>;
  saveAction: (ym: string, body: string) => Promise<{ ok: boolean; error?: string }>;
};

const AUTOSAVE_MS = 1200;

export function MonthMemo({ ym, monthLabel, canWrite, loadAction, saveAction }: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "dirty" | "saving" | "saved" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 직렬 저장 큐: 저장 중이면 최신 값을 pending에 겹쳐 쓰고, 끝나면 한 번 더 저장한다.
  const savingRef = useRef(false);
  const pendingRef = useRef<string | null>(null);
  const lastSavedRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 달 이동 직전 달의 미저장분을 흘리지 않도록, 저장은 항상 '그 텍스트가 속한 ym'으로 보낸다.
  const ymRef = useRef(ym);

  // 달이 바뀌면: 이전 달 미저장분 먼저 마감 → 새 달 메모 로드.
  useEffect(() => {
    const prevYm = ymRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("loading");
    setErrorMsg(null);
    let alive = true;
    void (async () => {
      const res = await loadAction(ym);
      if (!alive) return;
      if (res.ok) {
        ymRef.current = ym;
        lastSavedRef.current = res.body ?? "";
        setText(res.body ?? "");
        setStatus("idle");
      } else {
        setStatus("error");
        setErrorMsg(res.error ?? "불러오기 실패");
      }
    })();
    return () => {
      alive = false;
      void prevYm; // 미저장분은 blur/flush 경로가 이미 처리(입력 중 달 이동은 blur가 선행된다)
    };
  }, [ym, loadAction]);

  async function flush(value: string, forYm: string) {
    if (savingRef.current) {
      pendingRef.current = value;
      return;
    }
    if (value === lastSavedRef.current) {
      setStatus((s) => (s === "dirty" || s === "saving" ? "saved" : s));
      return;
    }
    savingRef.current = true;
    setStatus("saving");
    try {
      const res = await saveAction(forYm, value);
      if (res.ok) {
        if (ymRef.current === forYm) {
          lastSavedRef.current = value;
          setStatus("saved");
          setErrorMsg(null);
        }
      } else {
        setStatus("error");
        setErrorMsg(res.error ?? "저장 실패");
      }
    } catch {
      setStatus("error");
      setErrorMsg("네트워크 오류 — 다시 시도됩니다");
    } finally {
      savingRef.current = false;
      const next = pendingRef.current;
      pendingRef.current = null;
      if (next !== null && next !== lastSavedRef.current) {
        void flush(next, ymRef.current);
      }
    }
  }

  function onChange(value: string) {
    setText(value);
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    const forYm = ymRef.current;
    timerRef.current = setTimeout(() => void flush(value, forYm), AUTOSAVE_MS);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const statusLabel =
    status === "loading"
      ? "불러오는 중…"
      : status === "saving"
        ? "저장 중…"
        : status === "dirty"
          ? "입력 중"
          : status === "error"
            ? (errorMsg ?? "저장 실패")
            : status === "saved"
              ? "저장됨"
              : "";

  return (
    <div className="month-memo">
      <div className="month-memo-head">
        <span className="month-memo-title">📝 {monthLabel} 메모</span>
        {/* 상태 칩 — 헤더의 저장됨 배지(save-status)와 같은 문법(점+텍스트), 메모지 톤·축소판. */}
        {statusLabel ? (
          <span
            aria-live="polite"
            className={`month-memo-status st-${status}`}
            title={status === "saved" ? "이 달 메모가 저장돼 있어요" : undefined}
          >
            <span aria-hidden="true" className="mm-dot" />
            <em>{statusLabel}</em>
          </span>
        ) : null}
      </div>
      <textarea
        aria-label={`${monthLabel} 메모`}
        className="month-memo-input"
        disabled={!canWrite || status === "loading"}
        onBlur={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          void flush(text, ymRef.current);
        }}
        onChange={(e) => onChange(e.target.value)}
        placeholder={canWrite ? "이 달에 할 것들을 자유롭게 적어두는 곳" : "메모(읽기 전용)"}
        spellCheck={false}
        value={text}
      />
    </div>
  );
}
