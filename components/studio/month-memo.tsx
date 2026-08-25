"use client";

import { useEffect, useRef, useState } from "react";

// '그 달 메모' — 아바타 자리를 대체하는 편집실 전용 마인드스토밍 패널 (ADR-0009 2차).
// 단순 멀티라인 텍스트(calendars.public_memo). 저장은 디바운스 자동저장 + blur 즉시 저장,
// 직렬(마지막 입력이 진실) — 진행 중 저장이 있으면 겹치지 않고 최신 값 하나만 뒤따른다.
type Props = {
  initialMemo: string;
  canWrite: boolean; // 클라 게이트(UX) — 서버 액션이 별도로 재검사한다(BR-AUTHZ-001)
  saveAction: (memo: string) => Promise<{ ok: boolean; error?: string }>;
};

const AUTOSAVE_MS = 1200;

export function MonthMemo({ initialMemo, canWrite, saveAction }: Props) {
  const [text, setText] = useState(initialMemo);
  const [status, setStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 직렬 저장 큐: 저장 중이면 최신 값을 pending에 겹쳐 쓰고, 끝나면 한 번 더 저장한다.
  const savingRef = useRef(false);
  const pendingRef = useRef<string | null>(null);
  const lastSavedRef = useRef(initialMemo);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush(value: string) {
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
      const res = await saveAction(value);
      if (res.ok) {
        lastSavedRef.current = value;
        setStatus("saved");
        setErrorMsg(null);
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
        void flush(next);
      }
    }
  }

  function onChange(value: string) {
    setText(value);
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(value), AUTOSAVE_MS);
  }

  // 언마운트 시 미저장분 마지막 시도(달 이동·모달 등으로 사라질 때).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const statusLabel =
    status === "saving"
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
        <span className="month-memo-title">📝 이 달 메모</span>
        <span
          aria-live="polite"
          className={`month-memo-status${status === "error" ? " is-error" : ""}`}
        >
          {statusLabel}
        </span>
      </div>
      <textarea
        aria-label="이 달 메모"
        className="month-memo-input"
        disabled={!canWrite}
        onBlur={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          void flush(text);
        }}
        onChange={(e) => onChange(e.target.value)}
        placeholder={canWrite ? "이 달에 할 것들을 자유롭게 적어두는 곳" : "메모(읽기 전용)"}
        spellCheck={false}
        value={text}
      />
    </div>
  );
}
