"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import type { MemoNote } from "@/lib/schedules/memo-actions";
import { hapticTick } from "@/lib/ui/haptics";

// 붙임쪽지 메모(ADR-0014) — 레일의 '런처'(목록 + 새 메모)와, 행을 누르면 뜨는
// '떠 있는 쪽지 창'(드래그 이동, 쪽지 단위 서식: 배경색·굵기·글씨체·크기).
// 저장은 월별 메모와 같은 문법: 디바운스 자동저장 + blur 즉시, 직렬 큐(마지막 입력이 진실).
type Actions = {
  list: () => Promise<{ ok: boolean; notes?: MemoNote[]; error?: string }>;
  create: () => Promise<{ ok: boolean; note?: MemoNote; error?: string }>;
  update: (
    id: string,
    patch: Partial<Pick<MemoNote, "title" | "body" | "color" | "fontFamily" | "fontSize" | "bold">>
  ) => Promise<{ ok: boolean; error?: string }>;
  remove: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

type Props = { canWrite: boolean; actions: Actions };

const AUTOSAVE_MS = 1200;
const COLORS = ["yellow", "mint", "sky", "pink"] as const;
const FONTS = [
  { key: "sans", label: "고딕" },
  { key: "serif", label: "명조" },
  { key: "mono", label: "모노" }
] as const;
const SIZES = [13, 15, 18, 22] as const;

// 창 위치는 기기 편의라 localStorage(서버엔 내용·서식만). 뷰포트 밖으로 안 나가게 clamp.
function loadPos(id: string): { x: number; y: number } | null {
  try {
    const raw = window.localStorage.getItem(`wak_memo_pos_${id}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as { x: number; y: number };
    if (typeof p.x !== "number" || typeof p.y !== "number") return null;
    return p;
  } catch {
    return null;
  }
}
function savePos(id: string, pos: { x: number; y: number }) {
  try {
    window.localStorage.setItem(`wak_memo_pos_${id}`, JSON.stringify(pos));
  } catch {
    /* 무시 */
  }
}
function clampPos(x: number, y: number, w: number) {
  // 최소 80px은 화면 안에 남긴다(제목/닫기 버튼이 항상 잡히게).
  const margin = 12;
  return {
    x: Math.min(Math.max(x, margin - w + 80), window.innerWidth - 80),
    y: Math.min(Math.max(y, margin), window.innerHeight - 48)
  };
}

export function MemoNotes({ canWrite, actions }: Props) {
  const [notes, setNotes] = useState<MemoNote[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await actions.list();
      if (!alive) return;
      if (res.ok) {
        setNotes(res.notes ?? []);
        setStatus("idle");
      } else {
        setStatus("error");
        setErrorMsg(res.error ?? "불러오기 실패");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions는 서버 액션 묶음(안정)
  }, []);

  async function addNote() {
    if (!canWrite || busy) return;
    hapticTick();
    setBusy(true);
    const res = await actions.create();
    setBusy(false);
    if (res.ok && res.note) {
      setNotes((cur) => [res.note as MemoNote, ...cur]);
      setOpenId(res.note.id);
    } else {
      setErrorMsg(res.error ?? "메모를 만들지 못했어요");
    }
  }

  async function removeNote(id: string) {
    if (!canWrite || busy) return;
    hapticTick();
    setBusy(true);
    const res = await actions.remove(id);
    setBusy(false);
    setConfirmDeleteId(null);
    if (res.ok) {
      setNotes((cur) => cur.filter((n) => n.id !== id));
      if (openId === id) setOpenId(null);
    } else {
      setErrorMsg(res.error ?? "삭제 실패");
    }
  }

  // 쪽지 창에서 저장된 최신 값을 목록에도 반영(제목·글자수·서식 미리보기 동기).
  const applyLocal = useCallback((id: string, patch: Partial<MemoNote>) => {
    setNotes((cur) => cur.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const openNote = openId ? (notes.find((n) => n.id === openId) ?? null) : null;

  return (
    <div className="memo-notes">
      <div className="memo-notes-head">
        <span className="memo-notes-title">📝 메모</span>
        <button
          aria-label="새 메모"
          className="memo-add"
          disabled={!canWrite || busy || notes.length >= 30}
          onClick={() => void addNote()}
          title={notes.length >= 30 ? "메모는 30개까지예요" : "새 메모"}
          type="button"
         data-act="memo-add">
          <Plus aria-hidden="true" size={15} />
        </button>
      </div>
      {status === "loading" ? <p className="memo-notes-empty">불러오는 중…</p> : null}
      {status === "error" ? <p className="memo-notes-empty warn">{errorMsg}</p> : null}
      {status === "idle" && notes.length === 0 ? (
        <p className="memo-notes-empty">
          {canWrite ? "+ 를 눌러 첫 메모를 만들어 보세요" : "메모가 없어요"}
        </p>
      ) : null}
      <ul className="memo-note-list">
        {notes.map((n) => {
          const chars = n.body.length;
          const title = n.title.trim() || n.body.split("\n")[0]?.trim() || "제목 없음";
          return (
            <li key={n.id}>
              {confirmDeleteId === n.id ? (
                <div className="memo-row memo-row-confirm">
                  <span>삭제할까요?</span>
                  <div className="memo-row-confirm-btns">
                    <button onClick={() => void removeNote(n.id)} type="button" data-act="memo-del-yes">
                      삭제
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} type="button" data-act="memo-del-no">
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={`memo-row memo-c-${n.color}${openId === n.id ? " open" : ""}`}
                  onClick={() => {
                    hapticTick();
                    setOpenId((cur) => (cur === n.id ? null : n.id));
                  }}
                  type="button"
                 data-act="memo-open">
                  <i aria-hidden="true" className="memo-dot" />
                  <span className="memo-row-main">
                    <b>{title}</b>
                    <em>메모 · {chars}자</em>
                  </span>
                  {canWrite ? (
                    <span
                      aria-label="메모 삭제"
                      className="memo-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(n.id);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmDeleteId(n.id);
                        }
                      }}
                    >
                      <Trash2 aria-hidden="true" size={14} />
                    </span>
                  ) : null}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {openNote ? (
        <MemoWindow
          key={openNote.id}
          canWrite={canWrite}
          note={openNote}
          onClose={() => setOpenId(null)}
          onLocalChange={applyLocal}
          update={actions.update}
        />
      ) : null}
    </div>
  );
}

// ── 떠 있는 쪽지 창 — 헤더 드래그로 이동, 쪽지 단위 서식, 자동저장 ─────────────
function MemoWindow({
  note,
  canWrite,
  update,
  onLocalChange,
  onClose
}: {
  note: MemoNote;
  canWrite: boolean;
  update: Actions["update"];
  onLocalChange: (id: string, patch: Partial<MemoNote>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [style, setStyle] = useState({
    color: note.color,
    fontFamily: note.fontFamily,
    fontSize: note.fontSize,
    bold: note.bold
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">(
    "idle"
  );
  const [pos, setPos] = useState(() => {
    const saved = typeof window !== "undefined" ? loadPos(note.id) : null;
    return saved ?? { x: Math.max(24, window.innerWidth - 420), y: 96 };
  });
  const winRef = useRef<HTMLDivElement | null>(null);

  // 직렬 저장 큐(월별 메모와 같은 문법) — 저장 중 새 변경은 pending에 겹쳐 쓴다.
  const savingRef = useRef(false);
  const pendingRef = useRef<Partial<MemoNote> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(
    async (patch: Partial<MemoNote>) => {
      if (!canWrite) return;
      if (savingRef.current) {
        pendingRef.current = { ...(pendingRef.current ?? {}), ...patch };
        return;
      }
      savingRef.current = true;
      setSaveState("saving");
      try {
        const res = await update(note.id, patch);
        if (res.ok) {
          setSaveState("saved");
          onLocalChange(note.id, patch);
        } else {
          setSaveState("error");
        }
      } catch {
        setSaveState("error");
      } finally {
        savingRef.current = false;
        const next = pendingRef.current;
        pendingRef.current = null;
        if (next) void flush(next);
      }
    },
    [canWrite, note.id, onLocalChange, update]
  );

  function queueSave(patch: Partial<MemoNote>) {
    if (!canWrite) return;
    setSaveState("dirty");
    pendingRef.current = { ...(pendingRef.current ?? {}), ...patch };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const next = pendingRef.current;
      pendingRef.current = null;
      if (next) void flush(next);
    }, AUTOSAVE_MS);
  }
  function flushNow() {
    if (timerRef.current) clearTimeout(timerRef.current);
    const next = pendingRef.current;
    pendingRef.current = null;
    if (next) void flush(next);
  }
  useEffect(() => {
    return () => {
      // 닫힘/언마운트 때 미저장분 마감.
      if (timerRef.current) clearTimeout(timerRef.current);
      const next = pendingRef.current;
      pendingRef.current = null;
      if (next) void flush(next);
    };
  }, [flush]);

  // 서식 변경은 즉시 저장(토글 손맛과 저장이 붙어 있게).
  function setStylePart(patch: Partial<typeof style>) {
    if (!canWrite) return;
    hapticTick();
    setStyle((cur) => ({ ...cur, ...patch }));
    void flush(patch);
  }

  // 헤더 드래그 이동 — pointer capture로 창 밖까지 매끈하게, 끝나면 위치 저장.
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  function onDragStart(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button, input, textarea")) return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDragMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const w = winRef.current?.offsetWidth ?? 360;
    setPos(clampPos(e.clientX - d.dx, e.clientY - d.dy, w));
  }
  function onDragEnd(e: React.PointerEvent) {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* 무시 */
    }
    savePos(note.id, pos);
  }
  // 창 크기 변경 시 화면 안으로.
  useLayoutEffect(() => {
    const onResize = () => {
      const w = winRef.current?.offsetWidth ?? 360;
      setPos((p) => clampPos(p.x, p.y, w));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Esc로 닫기 — 편집실 다른 Esc 소비자(팝오버 등)보다 먼저(capture).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const saveLabel =
    saveState === "saving"
      ? "저장 중…"
      : saveState === "dirty"
        ? "입력 중"
        : saveState === "error"
          ? "저장 실패"
          : saveState === "saved"
            ? "저장됨"
            : "";

  return createPortal(
    <div
      className={`memo-win memo-c-${style.color}${style.bold ? " is-bold" : ""} mf-${style.fontFamily}`}
      ref={winRef}
      role="dialog"
      aria-label="메모"
      style={{ left: pos.x, top: pos.y, fontSize: style.fontSize }}
    >
      <div
        className="memo-win-head"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <input
          aria-label="메모 제목"
          className="memo-win-title"
          disabled={!canWrite}
          maxLength={100}
          onBlur={flushNow}
          onChange={(e) => {
            setTitle(e.target.value);
            queueSave({ title: e.target.value });
          }}
          placeholder="제목"
          value={title}
        />
        {saveLabel ? <span className={`memo-win-save st-${saveState}`}>{saveLabel}</span> : null}
        <button aria-label="닫기" className="memo-win-close" onClick={onClose} type="button" data-act="memo-close">
          <X aria-hidden="true" size={15} />
        </button>
      </div>
      {canWrite ? (
        <div className="memo-win-tools">
          <button
            aria-pressed={style.bold}
            className={`memo-tool memo-tool-b${style.bold ? " on" : ""}`}
            onClick={() => setStylePart({ bold: !style.bold })}
            title="굵게"
            type="button"
           data-act="memo-bold">
            B
          </button>
          {COLORS.map((c) => (
            <button
              aria-label={`배경색 ${c}`}
              aria-pressed={style.color === c}
              className={`memo-tool memo-swatch sw-${c}${style.color === c ? " on" : ""}`}
              key={c}
              onClick={() => setStylePart({ color: c })}
              type="button"
             data-act="memo-color">
              <span aria-hidden="true" />
            </button>
          ))}
          <button
            aria-expanded={settingsOpen}
            className={`memo-tool memo-tool-set${settingsOpen ? " on" : ""}`}
            onClick={() => setSettingsOpen((v) => !v)}
            title="글씨 설정"
            type="button"
           data-act="memo-settings">
            Aa
          </button>
        </div>
      ) : null}
      {settingsOpen && canWrite ? (
        <div className="memo-win-settings">
          <div className="mws-row">
            <em>글씨체</em>
            {FONTS.map((f) => (
              <button
                aria-pressed={style.fontFamily === f.key}
                className={style.fontFamily === f.key ? "on" : ""}
                key={f.key}
                onClick={() => setStylePart({ fontFamily: f.key })}
                type="button"
               data-act="memo-font">
                {f.label}
              </button>
            ))}
          </div>
          <div className="mws-row">
            <em>크기</em>
            {SIZES.map((n) => (
              <button
                aria-pressed={style.fontSize === n}
                className={style.fontSize === n ? "on" : ""}
                key={n}
                onClick={() => setStylePart({ fontSize: n })}
                type="button"
               data-act="memo-size">
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <textarea
        aria-label="메모 내용"
        className="memo-win-body"
        disabled={!canWrite}
        onBlur={flushNow}
        onChange={(e) => {
          setBody(e.target.value);
          queueSave({ body: e.target.value });
        }}
        placeholder={canWrite ? "자유롭게 적어두는 곳" : "메모(읽기 전용)"}
        spellCheck={false}
        value={body}
      />
    </div>,
    document.body
  );
}
