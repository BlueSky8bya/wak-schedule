"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import type { MemoNote } from "@/lib/schedules/memo-actions";
import { hapticTick } from "@/lib/ui/haptics";

// 붙임쪽지 메모(ADR-0014) — 레일의 '런처'(목록 + 새 메모)와, 행을 누르면 뜨는
// '떠 있는 쪽지 창'(그립 드래그 이동, 쪽지 단위 서식: 배경색·굵기·글씨체·크기).
// 제목은 따로 없다 — 본문 첫 줄이 곧 목록의 제목(사용자 결정 2026-08-26 2차).
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
// 글씨체 — 앱이 이미 로드해 둔 한글 웹폰트(next/font CSS 변수, 스티커 시절 자산 재사용).
const FONTS = [
  { key: "sans", label: "기본" },
  { key: "myeongjo", label: "명조" },
  { key: "mono", label: "모노" },
  { key: "nanumpen", label: "나눔펜" },
  { key: "gaegu", label: "개구쟁이" },
  { key: "himelody", label: "하이멜로디" },
  { key: "gamja", label: "감자꽃" },
  { key: "jua", label: "주아" },
  { key: "dohyeon", label: "도현" },
  { key: "gugi", label: "구기" },
  { key: "blackhan", label: "블랙한" }
] as const;
const SIZE_MIN = 12;
const SIZE_MAX = 24;

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
  // 최소 80px은 화면 안에 남긴다(그립·닫기 버튼이 항상 잡히게).
  const margin = 12;
  return {
    x: Math.min(Math.max(x, margin - w + 80), window.innerWidth - 80),
    y: Math.min(Math.max(y, margin), window.innerHeight - 48)
  };
}
// 목록 제목 = 본문 첫 줄(불릿 기호는 벗겨서). 비면 저장된 제목(이식분), 그것도 없으면 자리말.
function titleOf(n: MemoNote): string {
  const first = n.body.split("\n")[0]?.replace(/^(\s*)([•\-*]|\d+\.)\s+/, "").trim();
  return first || n.title.trim() || "제목 없음";
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
      {/* + 는 제목 바로 옆(사용자 지정 배치). */}
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
                    <b>{titleOf(n)}</b>
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

// ── 떠 있는 쪽지 창 — 상단 그립을 잡아 이동, 쪽지 단위 서식, 자동저장 ──────────
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
  const [body, setBody] = useState(note.body);
  const [style, setStyle] = useState({
    color: note.color,
    fontFamily: note.fontFamily,
    fontSize: note.fontSize,
    bold: note.bold
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">(
    "idle"
  );
  const [pos, setPos] = useState(() => {
    const saved = typeof window !== "undefined" ? loadPos(note.id) : null;
    return saved ?? { x: Math.max(24, window.innerWidth - 420), y: 96 };
  });
  const winRef = useRef<HTMLDivElement | null>(null);

  // 직렬 저장 큐 — 저장 중 새 변경은 pending에 겹쳐 쓴다(마지막 입력이 진실).
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

  // 본문 편집 도우미(사용자 요청 "탭 누르면 문단 꾸며지기"):
  //  - "- " / "* " 를 줄 시작에 치면 "• " 불릿으로 자동 변환
  //  - 불릿/번호 줄에서 Enter → 다음 줄에 이어서(빈 불릿에서 Enter는 목록 종료)
  //  - Tab / Shift+Tab → 현재 줄 들여쓰기·내어쓰기(2칸)
  function applyEdit(ta: HTMLTextAreaElement) {
    setBody(ta.value);
    queueSave({ body: ta.value });
  }
  function onBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!canWrite || e.nativeEvent.isComposing) return;
    const ta = e.currentTarget;
    const { selectionStart, selectionEnd, value } = ta;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const line = value.slice(lineStart, selectionStart);

    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        const lead = value.slice(lineStart).match(/^ {1,2}/)?.[0]?.length ?? 0;
        if (lead > 0) {
          ta.setRangeText("", lineStart, lineStart + lead);
          ta.setSelectionRange(
            Math.max(lineStart, selectionStart - lead),
            Math.max(lineStart, selectionEnd - lead)
          );
          applyEdit(ta);
        }
      } else {
        ta.setRangeText("  ", lineStart, lineStart);
        ta.setSelectionRange(selectionStart + 2, selectionEnd + 2);
        applyEdit(ta);
      }
      return;
    }
    if (e.key === "Enter") {
      const m = line.match(/^(\s*)(?:([•\-*])|(\d+)\.)\s(.*)$/);
      if (!m) return;
      e.preventDefault();
      const [, indent, bullet, num, rest] = m;
      if (!rest.trim()) {
        // 빈 불릿에서 Enter → 불릿을 지우고 목록 종료.
        ta.setRangeText("", lineStart, selectionStart, "start");
      } else {
        const prefix = bullet ? `${bullet} ` : `${Number(num) + 1}. `;
        ta.setRangeText(`\n${indent}${prefix}`, selectionStart, selectionEnd, "end");
      }
      applyEdit(ta);
      return;
    }
    if (e.key === " ") {
      // 줄 시작의 "-"/"*" + 스페이스 → "• "
      if (/^(\s*)[-*]$/.test(line)) {
        e.preventDefault();
        const indent = line.match(/^\s*/)?.[0] ?? "";
        ta.setRangeText(`${indent}• `, lineStart, selectionStart, "end");
        applyEdit(ta);
      }
    }
  }

  // 그립 드래그 이동 — pointer capture로 창 밖까지 매끈하게, 끝나면 위치 저장.
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  function onDragStart(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
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

  // ⋯ 메뉴 바깥 클릭 닫기.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (menuRef.current?.contains(t)) return;
      if (t.closest("[data-act='memo-settings']")) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [menuOpen]);

  // Esc — 메뉴가 열려 있으면 메뉴만, 아니면 창 닫기(편집실 다른 Esc 소비자보다 먼저).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (menuOpen) {
        setMenuOpen(false);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [menuOpen, onClose]);

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
      {/* 전용 그립(잡는 공간) — 여기만 잡아 끈다(본문·버튼 오조작 없음). */}
      <div
        className="memo-win-grip"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        title="잡고 이동"
      >
        {saveLabel ? <span className={`memo-win-save st-${saveState}`}>{saveLabel}</span> : null}
        <span aria-hidden="true" className="memo-grip-pill" />
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
          <button
            aria-expanded={menuOpen}
            aria-label="메모 설정"
            className={`memo-tool memo-tool-set${menuOpen ? " on" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            title="색상·글꼴·크기"
            type="button"
           data-act="memo-settings">
            <MoreHorizontal aria-hidden="true" size={16} />
          </button>
        </div>
      ) : null}
      {menuOpen && canWrite ? (
        <div className="memo-menu" ref={menuRef} role="menu" aria-label="메모 설정">
          <div className="memo-menu-sec">
            <span className="mm-sec-label">색상</span>
            <div className="mm-colors">
              {COLORS.map((c) => (
                <button
                  aria-label={`배경색 ${c}`}
                  aria-pressed={style.color === c}
                  className={`mm-swatch sw-${c}${style.color === c ? " on" : ""}`}
                  key={c}
                  onClick={() => setStylePart({ color: c })}
                  type="button"
                 data-act="memo-color">
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <div className="memo-menu-size">
            <button
              aria-label="글자 작게"
              disabled={style.fontSize <= SIZE_MIN}
              onClick={() => setStylePart({ fontSize: Math.max(SIZE_MIN, style.fontSize - 1) })}
              type="button"
             data-act="memo-size-down">
              −
            </button>
            <em>
              글자 크기 <b>{style.fontSize}</b>
            </em>
            <button
              aria-label="글자 크게"
              disabled={style.fontSize >= SIZE_MAX}
              onClick={() => setStylePart({ fontSize: Math.min(SIZE_MAX, style.fontSize + 1) })}
              type="button"
             data-act="memo-size-up">
              +
            </button>
          </div>
          <div className="memo-menu-fonts" role="listbox" aria-label="글꼴">
            {FONTS.map((f) => (
              <button
                aria-selected={style.fontFamily === f.key}
                className={`mm-font${style.fontFamily === f.key ? " on" : ""}`}
                key={f.key}
                onClick={() => setStylePart({ fontFamily: f.key })}
                role="option"
                style={{ fontFamily: `var(--memo-font-${f.key}, inherit)` }}
                type="button"
               data-act="memo-font">
                {f.label} 가나다
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
        onKeyDown={onBodyKeyDown}
        placeholder={canWrite ? "첫 줄이 제목이 돼요. '- '로 목록, Tab으로 들여쓰기" : "메모(읽기 전용)"}
        spellCheck={false}
        value={body}
      />
    </div>,
    document.body
  );
}
