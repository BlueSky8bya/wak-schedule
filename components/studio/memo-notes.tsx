"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, Plus, Trash2, Type, X } from "lucide-react";
import type { MemoNote } from "@/lib/schedules/memo-actions";
import { edgeForPointer, reorderAtEdge, type ReorderEdge } from "@/lib/tags/reorder";
import { hapticTick } from "@/lib/ui/haptics";

// 붙임쪽지 메모(ADR-0015) — 런처(수동 순서 + 드래그 재정렬)와 떠 있는 쪽지 창.
// 저장은 부모(코디네이터)가 메모별 직렬 큐로 소유한다: 창을 닫아도 저장은 계속되고,
// 실패한 변경은 pending에 남아 '재시도'로 살아난다(유실 없음).
type Patch = Partial<Pick<MemoNote, "title" | "body" | "color" | "fontFamily" | "fontSize" | "bold">>;
type Actions = {
  list: () => Promise<{ ok: boolean; notes?: MemoNote[]; error?: string }>;
  create: () => Promise<{ ok: boolean; note?: MemoNote; error?: string }>;
  update: (id: string, patch: Patch) => Promise<{ ok: boolean; updatedAt?: string; error?: string }>;
  remove: (id: string) => Promise<{ ok: boolean; error?: string }>;
  reorder: (orderedIds: string[]) => Promise<{ ok: boolean; error?: string }>;
};

type Props = { canWrite: boolean; actions: Actions };
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 900;
// 6색(ADR-0015 — 감사 문서 11-2 팔레트). 키는 서버 allowlist와 일치.
const COLORS = [
  { key: "paper", label: "종이" },
  { key: "yellow", label: "버터" },
  { key: "mint", label: "민트" },
  { key: "sky", label: "하늘" },
  { key: "pink", label: "꽃잎" },
  { key: "lavender", label: "라벤더" }
] as const;
// 글씨 '분위기' 5개(사용자 심판: 축소). 옛 키는 계속 렌더되고 '기존 글꼴'로 표시.
const FONT_PRESETS = [
  { key: "sans", label: "깔끔" },
  { key: "myeongjo", label: "책처럼" },
  { key: "nanumpen", label: "메모펜" },
  { key: "jua", label: "둥글게" },
  { key: "mono", label: "모노" }
] as const;
// 크기 4단(사용자 심판: −/+ 스테퍼로 4단계 이동). 옛 임의값은 가장 가까운 단으로 표시.
const SIZE_STEPS = [
  { px: 14, label: "작게" },
  { px: 16, label: "기본" },
  { px: 18, label: "크게" },
  { px: 22, label: "아주 크게" }
] as const;
function nearestSizeIdx(px: number): number {
  let best = 0;
  for (let i = 1; i < SIZE_STEPS.length; i += 1) {
    if (Math.abs(SIZE_STEPS[i].px - px) < Math.abs(SIZE_STEPS[best].px - px)) best = i;
  }
  return best;
}

// 창 위치는 기기 편의라 localStorage(서버엔 내용·서식·순서만).
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
// 폭·높이를 모두 반영해 화면 안에 남긴다(감사 P1 — 높이 미반영이던 것).
function clampPos(x: number, y: number, w: number, h: number) {
  const margin = 12;
  return {
    x: Math.min(Math.max(x, margin - w + 96), window.innerWidth - 96),
    y: Math.min(Math.max(y, margin), Math.max(margin, window.innerHeight - Math.min(h, 96)))
  };
}
// 목록 제목 = 본문 첫 줄(불릿은 벗겨서), 미리보기 = 다음 비어 있지 않은 줄.
function stripBullet(line: string): string {
  return line.replace(/^(\s*)([•\-*]|\d+\.)\s+/, "").trim();
}
function titleOf(n: MemoNote): string {
  const first = stripBullet(n.body.split("\n")[0] ?? "");
  return first || n.title.trim() || "제목 없음";
}
function previewOf(n: MemoNote): string {
  const lines = n.body.split("\n");
  for (let i = 1; i < lines.length; i += 1) {
    const t = stripBullet(lines[i]);
    if (t) return t;
  }
  return "내용 없음";
}

export function MemoNotes({ canWrite, actions }: Props) {
  const [notes, setNotes] = useState<MemoNote[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orderError, setOrderError] = useState(false);

  const notesRef = useRef(notes);
  notesRef.current = notes;
  // 서버가 확정한 마지막 순서 — 재정렬 실패 시 여기로 되돌린다.
  const serverOrderRef = useRef<string[]>([]);

  // ── 저장 코디네이터(부모 소유) — 메모별 pending/inflight/timer + 상태 ──
  const queueRef = useRef(
    new Map<string, { pending: Patch | null; inflight: boolean; timer: ReturnType<typeof setTimeout> | null }>()
  );
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const setSaveState = useCallback((id: string, st: SaveState) => {
    setSaveStates((prev) => (prev[id] === st ? prev : { ...prev, [id]: st }));
  }, []);
  const entryOf = (id: string) => {
    let e = queueRef.current.get(id);
    if (!e) {
      e = { pending: null, inflight: false, timer: null };
      queueRef.current.set(id, e);
    }
    return e;
  };
  const applyLocal = useCallback((id: string, patch: Partial<MemoNote>) => {
    setNotes((cur) => cur.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);
  const flushNote = useCallback(
    async (id: string) => {
      const e = entryOf(id);
      if (e.inflight) return; // 완료 시 chain에서 다시 온다
      const patch = e.pending;
      if (!patch) return;
      e.pending = null;
      e.inflight = true;
      setSaveState(id, "saving");
      let failed = false;
      try {
        const res = await actions.update(id, patch);
        if (res.ok) {
          if (res.updatedAt) applyLocal(id, { updatedAt: res.updatedAt });
        } else {
          failed = true;
        }
      } catch {
        failed = true;
      }
      e.inflight = false;
      if (failed) {
        // 실패한 변경은 유실하지 않는다 — 이후 변경 아래에 깔아 두고 재시도로 살린다.
        e.pending = { ...patch, ...(e.pending ?? {}) };
        setSaveState(id, "error");
        return;
      }
      if (e.pending) {
        void flushNote(id);
      } else {
        setSaveState(id, "saved");
      }
    },
    [actions, applyLocal, setSaveState]
  );
  const queuePatch = useCallback(
    (id: string, patch: Patch) => {
      if (!canWrite) return;
      applyLocal(id, patch); // 낙관 반영(목록 제목·미리보기·서식 동기)
      const e = entryOf(id);
      e.pending = { ...(e.pending ?? {}), ...patch };
      setSaveState(id, "dirty");
      if (e.timer) clearTimeout(e.timer);
      e.timer = setTimeout(() => {
        e.timer = null;
        void flushNote(id);
      }, AUTOSAVE_MS);
    },
    [applyLocal, canWrite, flushNote, setSaveState]
  );
  const flushNow = useCallback(
    (id: string) => {
      const e = entryOf(id);
      if (e.timer) {
        clearTimeout(e.timer);
        e.timer = null;
      }
      void flushNote(id);
    },
    [flushNote]
  );
  // 이탈 직전 미저장분 경고 — 코디네이터가 부모라 창이 닫혀 있어도 안다.
  useEffect(() => {
    const onLeave = (ev: BeforeUnloadEvent) => {
      for (const e of queueRef.current.values()) {
        if (e.pending || e.inflight) {
          ev.preventDefault();
          return;
        }
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await actions.list();
      if (!alive) return;
      if (res.ok) {
        const list = res.notes ?? [];
        setNotes(list);
        serverOrderRef.current = list.map((n) => n.id);
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
      serverOrderRef.current = [res.note.id, ...serverOrderRef.current];
      setOpenId(res.note.id);
      setFocusTick((t) => t + 1);
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
      serverOrderRef.current = serverOrderRef.current.filter((x) => x !== id);
      queueRef.current.delete(id);
      if (openId === id) setOpenId(null);
    } else {
      setErrorMsg(res.error ?? "삭제 실패");
    }
  }

  // ── 탭 드래그 재정렬 — 태그 편집의 검증된 모델(edge·데드존·no-op) 재사용 ──
  const listRef = useRef<HTMLUListElement | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const ghostRef = useRef<HTMLElement | null>(null);
  const ghostOffsetRef = useRef({ x: 0, y: 0 });
  const dragSnapshotRef = useRef<string[] | null>(null);
  const lastDropRef = useRef<{ overId: string; edge: ReorderEdge } | null>(null);

  function orderIds(): string[] {
    return notesRef.current.map((n) => n.id);
  }
  function applyOrder(ids: string[]) {
    const byId = new Map(notesRef.current.map((n) => [n.id, n]));
    setNotes(ids.map((id) => byId.get(id)).filter((n): n is MemoNote => Boolean(n)));
  }
  function onHandleDown(e: React.PointerEvent, id: string) {
    if (!canWrite) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const row = (e.currentTarget as HTMLElement).closest("[data-memoid]") as HTMLElement | null;
    if (!row) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = row.getBoundingClientRect();
    const ghost = row.cloneNode(true) as HTMLElement;
    ghost.classList.add("memo-row-ghost");
    ghost.style.width = `${rect.width}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
    ghostOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragIdRef.current = id;
    dragSnapshotRef.current = orderIds();
    lastDropRef.current = null;
    setDraggingId(id);
    hapticTick();
  }
  function onHandleMove(e: React.PointerEvent) {
    const from = dragIdRef.current;
    const ghost = ghostRef.current;
    if (!from || !ghost) return;
    ghost.style.left = `${e.clientX - ghostOffsetRef.current.x}px`;
    ghost.style.top = `${e.clientY - ghostOffsetRef.current.y}px`;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const row = el?.closest("[data-memoid]") as HTMLElement | null;
    const overId = row?.getAttribute("data-memoid");
    if (!row || !overId || overId === from) return;
    const r = row.getBoundingClientRect();
    const prev = lastDropRef.current;
    const edge = edgeForPointer(e.clientY, r.top, r.height, prev?.overId === overId ? prev.edge : null);
    if (prev && prev.overId === overId && prev.edge === edge) return;
    lastDropRef.current = { overId, edge };
    const cur = orderIds();
    const next = reorderAtEdge(cur, from, overId, edge);
    if (next !== cur) {
      applyOrder(next);
      hapticTick();
    }
  }
  function finishReorder(cancelled: boolean) {
    const from = dragIdRef.current;
    if (!from) return;
    ghostRef.current?.remove();
    ghostRef.current = null;
    dragIdRef.current = null;
    setDraggingId(null);
    const snapshot = dragSnapshotRef.current;
    dragSnapshotRef.current = null;
    lastDropRef.current = null;
    if (cancelled) {
      if (snapshot) applyOrder(snapshot);
      return;
    }
    const ids = orderIds();
    if (snapshot && ids.join("|") === snapshot.join("|")) return; // 변화 없음
    void (async () => {
      const res = await actions.reorder(ids);
      if (res.ok) {
        serverOrderRef.current = ids;
        setOrderError(false);
        setNotes((cur) => cur.map((n, i) => ({ ...n, sortOrder: i })));
      } else {
        applyOrder(serverOrderRef.current);
        setOrderError(true);
      }
    })();
  }
  function onHandleUp() {
    finishReorder(false);
  }
  function onHandleCancel() {
    finishReorder(true);
  }
  // 드래그 중 Esc 취소.
  useEffect(() => {
    if (!draggingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      finishReorder(true);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finishReorder는 ref 기반(안정)
  }, [draggingId]);

  async function retryOrder() {
    const ids = orderIds();
    const res = await actions.reorder(ids);
    if (res.ok) {
      serverOrderRef.current = ids;
      setOrderError(false);
    }
  }

  const openNote = openId ? (notes.find((n) => n.id === openId) ?? null) : null;

  return (
    <div className="memo-notes">
      {/* + 는 헤더 오른쪽 끝(사용자 심판 2026-08-26 — Apple 툴바 trailing 문법). */}
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
          <Plus aria-hidden="true" size={16} />
        </button>
      </div>
      {orderError ? (
        <p className="memo-notes-empty warn">
          순서를 저장하지 못했어요{" "}
          <button className="memo-inline-retry" onClick={() => void retryOrder()} type="button" data-act="memo-order-retry">
            재시도
          </button>
        </p>
      ) : null}
      {status === "loading" ? <p className="memo-notes-empty">불러오는 중…</p> : null}
      {status === "error" ? <p className="memo-notes-empty warn">{errorMsg}</p> : null}
      {status === "idle" && notes.length === 0 ? (
        <div className="memo-notes-blank">
          <b>아직 메모가 없어요</b>
          <span>방송 아이디어나 할 일을 바로 적어 두세요.</span>
          {canWrite ? (
            <button className="memo-blank-cta" onClick={() => void addNote()} type="button" data-act="memo-add-first">
              첫 메모 만들기
            </button>
          ) : null}
        </div>
      ) : null}
      <ul className="memo-note-list" ref={listRef}>
        {notes.map((n) => {
          const st = saveStates[n.id];
          return (
            <li data-memoid={n.id} key={n.id}>
              {confirmDeleteId === n.id ? (
                <div className="memo-row memo-row-confirm">
                  <span>삭제할까요?</span>
                  <div className="memo-row-confirm-btns">
                    <button onClick={() => void removeNote(n.id)} type="button" data-act="memo-del-yes">
                      삭제
                    </button>
                    <button autoFocus onClick={() => setConfirmDeleteId(null)} type="button" data-act="memo-del-no">
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`memo-row memo-c-${n.color}${openId === n.id ? " open" : ""}${draggingId === n.id ? " dragging" : ""}`}
                >
                  {canWrite ? (
                    <button
                      aria-label="순서 이동"
                      className="memo-handle"
                      onPointerCancel={onHandleCancel}
                      onPointerDown={(e) => onHandleDown(e, n.id)}
                      onPointerMove={onHandleMove}
                      onPointerUp={onHandleUp}
                      type="button"
                     data-act="memo-drag">
                      <GripVertical aria-hidden="true" size={14} />
                    </button>
                  ) : null}
                  <i aria-hidden="true" className="memo-strip" />
                  <button
                    className="memo-row-open"
                    onClick={() => {
                      hapticTick();
                      // 같은 탭 재클릭 = 닫기가 아니라 초점(감사 P1) — 닫기는 ×와 Esc만.
                      setOpenId(n.id);
                      setFocusTick((t) => t + 1);
                    }}
                    type="button"
                   data-act="memo-open">
                    <b>{titleOf(n)}</b>
                    <em>
                      {st === "error" ? <span className="memo-row-err">저장 실패 · </span> : null}
                      {previewOf(n)}
                    </em>
                  </button>
                  {canWrite ? (
                    <button
                      aria-label="메모 삭제"
                      className="memo-del"
                      onClick={() => setConfirmDeleteId(n.id)}
                      type="button"
                     data-act="memo-del">
                      <Trash2 aria-hidden="true" size={14} />
                    </button>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {openNote ? (
        <MemoWindow
          key={openNote.id}
          canWrite={canWrite}
          focusTick={focusTick}
          note={openNote}
          onClose={() => setOpenId(null)}
          onFlushNow={() => flushNow(openNote.id)}
          onPatch={(patch) => queuePatch(openNote.id, patch)}
          onRetry={() => flushNow(openNote.id)}
          saveState={saveStates[openNote.id] ?? "idle"}
        />
      ) : null}
    </div>
  );
}

// ── 떠 있는 쪽지 창 — 그립 이동, 상시 색상 스트립, Aa(크기 스테퍼·분위기·강조) ──
function MemoWindow({
  note,
  canWrite,
  saveState,
  focusTick,
  onPatch,
  onFlushNow,
  onRetry,
  onClose
}: {
  note: MemoNote;
  canWrite: boolean;
  saveState: SaveState;
  focusTick: number;
  onPatch: (patch: Patch) => void;
  onFlushNow: () => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [aaOpen, setAaOpen] = useState(false);
  const aaRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const winRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState(() => {
    const saved = typeof window !== "undefined" ? loadPos(note.id) : null;
    return saved ?? { x: Math.max(24, window.innerWidth - 440), y: 96 };
  });
  // 드래그 종료 저장은 렌더 state가 아니라 최신 ref에서(감사 P1 — 낡은 좌표 저장 위험).
  const posRef = useRef(pos);
  posRef.current = pos;

  // 열기·같은 탭 재클릭 때 본문으로 초점.
  useEffect(() => {
    const t = setTimeout(() => bodyRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [focusTick]);

  function setStylePart(patch: Patch) {
    if (!canWrite) return;
    hapticTick();
    onPatch(patch);
  }

  // 본문 편집 도우미: '- '→'• ', 불릿/번호 Enter 이어쓰기, Tab 들여쓰기.
  function applyEdit(ta: HTMLTextAreaElement) {
    onPatch({ body: ta.value });
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
        ta.setRangeText("", lineStart, selectionStart, "start");
      } else {
        const prefix = bullet ? `${bullet} ` : `${Number(num) + 1}. `;
        ta.setRangeText(`\n${indent}${prefix}`, selectionStart, selectionEnd, "end");
      }
      applyEdit(ta);
      return;
    }
    if (e.key === " ") {
      if (/^(\s*)[-*]$/.test(line)) {
        e.preventDefault();
        const indent = line.match(/^\s*/)?.[0] ?? "";
        ta.setRangeText(`${indent}• `, lineStart, selectionStart, "end");
        applyEdit(ta);
      }
    }
  }

  // 그립 드래그 이동.
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  function onDragStart(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = { dx: e.clientX - posRef.current.x, dy: e.clientY - posRef.current.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDragMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const w = winRef.current?.offsetWidth ?? 380;
    const h = winRef.current?.offsetHeight ?? 420;
    setPos(clampPos(e.clientX - d.dx, e.clientY - d.dy, w, h));
  }
  function onDragEnd(e: React.PointerEvent) {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* 무시 */
    }
    savePos(note.id, posRef.current);
  }
  useLayoutEffect(() => {
    const onResize = () => {
      const w = winRef.current?.offsetWidth ?? 380;
      const h = winRef.current?.offsetHeight ?? 420;
      setPos((p) => clampPos(p.x, p.y, w, h));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Aa 메뉴 바깥 클릭 닫기.
  useEffect(() => {
    if (!aaOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (aaRef.current?.contains(t)) return;
      if (t.closest("[data-act='memo-aa']")) return;
      setAaOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [aaOpen]);

  // Esc — Aa 메뉴 → 창 순서(편집실 다른 Esc 소비자보다 먼저).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (aaOpen) {
        setAaOpen(false);
        return;
      }
      onFlushNow();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [aaOpen, onClose, onFlushNow]);

  const sizeIdx = nearestSizeIdx(note.fontSize);
  const isPresetFont = FONT_PRESETS.some((f) => f.key === note.fontFamily);
  const saveLabel =
    saveState === "saving"
      ? "저장 중…"
      : saveState === "dirty"
        ? "변경 중"
        : saveState === "error"
          ? "저장 실패"
          : saveState === "saved"
            ? "저장됨"
            : "";

  return createPortal(
    <div
      className={`memo-win memo-c-${note.color}${note.bold ? " is-bold" : ""} mf-${note.fontFamily}`}
      ref={winRef}
      role="dialog"
      aria-label={`메모: ${titleOf(note)}`}
      style={{ left: pos.x, top: pos.y, fontSize: note.fontSize }}
    >
      <div
        className="memo-win-grip"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        title="잡고 이동"
      >
        <span aria-live="polite" className={`memo-win-save st-${saveState}`}>
          {saveLabel}
          {saveState === "error" && canWrite ? (
            <button className="memo-save-retry" onClick={onRetry} type="button" data-act="memo-retry">
              재시도
            </button>
          ) : null}
        </span>
        <span aria-hidden="true" className="memo-grip-pill" />
        <button aria-label="닫기" className="memo-win-close" onClick={() => { onFlushNow(); onClose(); }} type="button" data-act="memo-close">
          <X aria-hidden="true" size={15} />
        </button>
      </div>
      {canWrite ? (
        <div className="memo-win-tools">
          {/* 색상은 메뉴 없이 상시 노출(사용자 심판). */}
          <div className="memo-color-strip" role="radiogroup" aria-label="메모지 색">
            {COLORS.map((c) => (
              <button
                aria-checked={note.color === c.key}
                aria-label={c.label}
                className={`mm-swatch sw-${c.key}${note.color === c.key ? " on" : ""}`}
                key={c.key}
                onClick={() => setStylePart({ color: c.key })}
                role="radio"
                title={c.label}
                type="button"
               data-act="memo-color">
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            aria-expanded={aaOpen}
            aria-label="글씨 설정"
            className={`memo-tool memo-tool-aa${aaOpen ? " on" : ""}`}
            onClick={() => setAaOpen((v) => !v)}
            title="글씨 크기·분위기"
            type="button"
           data-act="memo-aa">
            <Type aria-hidden="true" size={14} />
          </button>
        </div>
      ) : null}
      {aaOpen && canWrite ? (
        <div className="memo-aa" ref={aaRef} role="menu" aria-label="글씨 설정">
          <div className="memo-aa-size">
            <button
              aria-label="글자 작게"
              disabled={sizeIdx <= 0}
              onClick={() => setStylePart({ fontSize: SIZE_STEPS[sizeIdx - 1].px })}
              type="button"
             data-act="memo-size-down">
              −
            </button>
            <em>
              {SIZE_STEPS[sizeIdx].label} · <b>{SIZE_STEPS[sizeIdx].px}</b>
            </em>
            <button
              aria-label="글자 크게"
              disabled={sizeIdx >= SIZE_STEPS.length - 1}
              onClick={() => setStylePart({ fontSize: SIZE_STEPS[sizeIdx + 1].px })}
              type="button"
             data-act="memo-size-up">
              +
            </button>
          </div>
          <div className="memo-aa-fonts">
            {FONT_PRESETS.map((f) => (
              <button
                aria-pressed={note.fontFamily === f.key}
                className={note.fontFamily === f.key ? "on" : ""}
                key={f.key}
                onClick={() => setStylePart({ fontFamily: f.key })}
                style={{ fontFamily: `var(--memo-font-${f.key}, inherit)` }}
                type="button"
               data-act="memo-font">
                {f.label}
              </button>
            ))}
            {!isPresetFont ? (
              <button aria-pressed className="on legacy" type="button" data-act="memo-font-legacy">
                기존 글꼴
              </button>
            ) : null}
          </div>
          <button
            aria-pressed={note.bold}
            className={`memo-aa-bold${note.bold ? " on" : ""}`}
            onClick={() => setStylePart({ bold: !note.bold })}
            type="button"
           data-act="memo-bold">
            전체 강조 {note.bold ? "켬" : "끔"}
          </button>
        </div>
      ) : null}
      <textarea
        aria-label="메모 내용"
        className="memo-win-body"
        disabled={!canWrite}
        onBlur={onFlushNow}
        onChange={(e) => onPatch({ body: e.target.value })}
        onKeyDown={onBodyKeyDown}
        placeholder={canWrite ? "첫 줄이 제목이 돼요. '- '로 목록, Tab으로 들여쓰기" : "메모(읽기 전용)"}
        ref={bodyRef}
        spellCheck
        value={note.body}
      />
    </div>,
    document.body
  );
}
