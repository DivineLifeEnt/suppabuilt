"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import type { Markup, MarkupTool, NormalizedPoint, NormalizedBounds } from "@/lib/markup/types";
import { MARKUP_LIMITS } from "@/lib/markup/types";
import {
  screenToNormalized,
  normalizedToScreen,
  normalizeBounds,
  hitTest,
  lassoHitTest,
} from "@/lib/markup/geometry";
import { simplifyPath } from "@/lib/markup/simplify";
import { useMarkupStore } from "@/stores/markupStore";
import { MarkupRenderer } from "./MarkupRenderer";

// ─── Types ────────────────────────────────────────────────────────────────────

type DraftState =
  | null
  | { kind: "bounds"; anchor: NormalizedPoint; current: NormalizedPoint }
  | { kind: "path"; points: NormalizedPoint[] }
  | { kind: "line"; start: NormalizedPoint; current: NormalizedPoint }
  | { kind: "text"; point: NormalizedPoint }
  | { kind: "lasso"; anchor: NormalizedPoint; current: NormalizedPoint };

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  planId: string;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  rotation: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BOUNDS_TOOLS: MarkupTool[] = ["rectangle", "ellipse", "highlighter", "cloud"];
const LINE_TOOLS: MarkupTool[] = ["line", "arrow"];
const PATH_TOOLS: MarkupTool[] = ["pen"];
const POINT_TOOLS: MarkupTool[] = ["pin", "checkmark", "cross"];

function newMarkupBase(
  tool: MarkupTool,
  planId: string,
  pageNumber: number,
  color: string,
  strokeWidth: number,
  opacity: number,
  fontSize: number
): Omit<Markup, "kind" | "bounds" | "points" | "start" | "end" | "point" | "text"> {
  return {
    id: crypto.randomUUID(),
    planId,
    pageNumber,
    tool,
    style: { color, strokeWidth, opacity, fontSize },
    status: "open",
    locked: false,
    visible: true,
    zIndex: 0,
    revision: 1,
    authorName: "You",
    label: null,
    comment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Omit<Markup, "kind" | "bounds" | "points" | "start" | "end" | "point" | "text">;
}

// ─── MarkupLayer ──────────────────────────────────────────────────────────────

export function MarkupLayer({
  planId,
  pageNumber,
  pageWidth,
  pageHeight,
  zoom,
  rotation,
  canvasRef,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState<DraftState>(null);
  const [textInput, setTextInput] = useState<{ point: NormalizedPoint; value: string } | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const {
    markups,
    selectedIds,
    tool,
    activeColor,
    strokeWidth,
    opacity,
    fontSize,
    selectOne,
    selectAdd,
    selectMany,
    deselectAll,
    addMarkup,
    deleteMarkup,
    deleteSelected,
    updateMarkupGeometry,
    undo: doUndo,
    redo: doRedo,
    copy,
    paste,
    duplicate,
    setSaveState,
  } = useMarkupStore();

  // ── Sync SVG size with canvas ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(() => {
      setSize({ width: canvas.offsetWidth, height: canvas.offsetHeight });
    });
    obs.observe(canvas);
    setSize({ width: canvas.offsetWidth, height: canvas.offsetHeight });
    return () => obs.disconnect();
  }, [canvasRef]);

  // ── Load markups from API when planId/pageNumber changes ────────────────────
  const { loadMarkups } = useMarkupStore();
  useEffect(() => {
    fetch(`/api/plans/${planId}/markups?page=${pageNumber}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const d = data as { markups?: Markup[] };
        if (d.markups) loadMarkups(d.markups);
      })
      .catch(() => {});
  }, [planId, pageNumber, loadMarkups]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  const { setTool } = useMarkupStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); doUndo(); return; }
      if (ctrl && (e.key === "Z" || (e.key === "z" && e.shiftKey) || e.key === "y")) { e.preventDefault(); doRedo(); return; }
      if (ctrl && e.key === "c") { copy(); return; }
      if (ctrl && e.key === "v") { paste(planId, pageNumber); return; }
      if (ctrl && e.key === "d") { e.preventDefault(); duplicate(planId, pageNumber); return; }
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelected(); return; }
      if (e.key === "Escape") { setDraft(null); deselectAll(); return; }

      if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case "v": setTool("select"); break;
          case "h": setTool("pan"); break;
          case "t": setTool("text"); break;
          case "p": setTool("pen"); break;
          case "r": setTool("rectangle"); break;
          case "e": setTool("ellipse"); break;
          case "a": setTool("arrow"); break;
          case "l": setTool("line"); break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doUndo, doRedo, copy, paste, duplicate, deleteSelected, deselectAll, setTool, planId, pageNumber]);

  // ── Coordinate helpers ────────────────────────────────────────────────────────
  const getCanvasRect = useCallback((): DOMRect | null => {
    return canvasRef.current?.getBoundingClientRect() ?? null;
  }, [canvasRef]);

  const toNorm = useCallback(
    (e: PointerEvent | React.PointerEvent): NormalizedPoint | null => {
      const rect = getCanvasRect();
      if (!rect) return null;
      return screenToNormalized(
        { x: e.clientX, y: e.clientY },
        rect,
        zoom,
        rotation,
        pageWidth,
        pageHeight
      );
    },
    [getCanvasRect, zoom, rotation, pageWidth, pageHeight]
  );

  // ── Save markup to API (optimistic already done in store) ─────────────────────
  const saveMarkup = useCallback(
    async (markup: Markup) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/plans/${planId}/markups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(markup),
        });
        if (!res.ok) throw new Error("Save failed");
        setSaveState("saved");
      } catch {
        setSaveState("failed");
      }
    },
    [planId, setSaveState]
  );

  // ── Pointer handlers ──────────────────────────────────────────────────────────
  const rafRef = useRef<number>(0);
  const pendingMoveRef = useRef<PointerEvent | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const pt = toNorm(e);
      if (!pt) return;

      e.currentTarget.setPointerCapture(e.pointerId);

      if (tool === "eraser") {
        // Hit-test all markups
        const pageMarkups = Object.values(markups).filter(
          (m) => m.pageNumber === pageNumber
        );
        for (const m of pageMarkups) {
          if (hitTest(m, pt, 8, zoom)) {
            deleteMarkup(m.id);
          }
        }
        return;
      }

      if (tool === "select") {
        // Hit test
        const pageMarkups = Object.values(markups)
          .filter((m) => m.pageNumber === pageNumber)
          .sort((a, b) => b.zIndex - a.zIndex);

        const hit = pageMarkups.find((m) => hitTest(m, pt, 6, zoom));
        if (hit) {
          if (e.shiftKey) selectAdd(hit.id);
          else selectOne(hit.id);
        } else {
          deselectAll();
          // Start lasso
          setDraft({ kind: "lasso", anchor: pt, current: pt });
        }
        return;
      }

      if (tool === "pan") return;

      if (tool === "text") {
        setTextInput({ point: pt, value: "" });
        setTimeout(() => textareaRef.current?.focus(), 50);
        return;
      }

      if (BOUNDS_TOOLS.includes(tool)) {
        setDraft({ kind: "bounds", anchor: pt, current: pt });
        return;
      }

      if (LINE_TOOLS.includes(tool)) {
        setDraft({ kind: "line", start: pt, current: pt });
        return;
      }

      if (PATH_TOOLS.includes(tool)) {
        setDraft({ kind: "path", points: [pt] });
        return;
      }

      if (POINT_TOOLS.includes(tool)) {
        // Place immediately
        const markup = {
          ...newMarkupBase(tool, planId, pageNumber, activeColor, strokeWidth, opacity, fontSize),
          kind: "point" as const,
          tool: tool as "pin" | "checkmark" | "cross",
          point: pt,
        } as Markup;
        addMarkup(markup);
        void saveMarkup(markup);
        return;
      }
    },
    [tool, markups, pageNumber, zoom, toNorm, selectOne, selectAdd, deselectAll, deleteMarkup, addMarkup, saveMarkup, planId, activeColor, strokeWidth, opacity, fontSize]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      pendingMoveRef.current = e.nativeEvent;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const ev = pendingMoveRef.current;
        if (!ev) return;

        const pt = toNorm(ev as unknown as React.PointerEvent);
        if (!pt) return;

        setDraft((prev) => {
          if (!prev) return null;
          if (prev.kind === "bounds" || prev.kind === "lasso") {
            return { ...prev, current: pt };
          }
          if (prev.kind === "line") {
            return { ...prev, current: pt };
          }
          if (prev.kind === "path") {
            const newPoints = [...prev.points, pt];
            return {
              ...prev,
              points:
                newPoints.length > MARKUP_LIMITS.maxPathPoints
                  ? simplifyPath(newPoints, MARKUP_LIMITS.maxPathPoints)
                  : newPoints,
            };
          }
          return prev;
        });
      });
    },
    [toNorm]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draft) return;
      const pt = toNorm(e);

      if (draft.kind === "lasso" && pt) {
        const lassoBounds = normalizeBounds(draft.anchor, draft.current);
        const pageMarkups = Object.values(markups).filter(
          (m) => m.pageNumber === pageNumber
        );
        const ids = pageMarkups
          .filter((m) => lassoHitTest(m, lassoBounds))
          .map((m) => m.id);
        selectMany(ids);
        setDraft(null);
        return;
      }

      if (draft.kind === "bounds" && pt) {
        const bounds = normalizeBounds(draft.anchor, draft.current);
        if (bounds.width < 0.005 || bounds.height < 0.005) { setDraft(null); return; }

        const t = tool as "rectangle" | "ellipse" | "highlighter" | "cloud";
        // Cloud uses path geometry
        if (t === "cloud") {
          // Convert bounds to a cloud path stored as path-kind with 4 corner points
          const markup = {
            ...newMarkupBase(t, planId, pageNumber, activeColor, strokeWidth, opacity, fontSize),
            kind: "path" as const,
            tool: "cloud" as const,
            points: [
              { x: bounds.x, y: bounds.y },
              { x: bounds.x + bounds.width, y: bounds.y },
              { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
              { x: bounds.x, y: bounds.y + bounds.height },
              { x: bounds.x, y: bounds.y },
            ],
          } as Markup;
          addMarkup(markup);
          void saveMarkup(markup);
        } else {
          const markup = {
            ...newMarkupBase(t, planId, pageNumber, activeColor, strokeWidth, opacity, fontSize),
            kind: "bounds" as const,
            tool: t,
            bounds,
          } as Markup;
          addMarkup(markup);
          void saveMarkup(markup);
        }
        setDraft(null);
        return;
      }

      if (draft.kind === "line" && pt) {
        const t = tool as "line" | "arrow";
        const markup = {
          ...newMarkupBase(t, planId, pageNumber, activeColor, strokeWidth, opacity, fontSize),
          kind: "line" as const,
          tool: t,
          start: draft.start,
          end: draft.current,
        } as Markup;
        addMarkup(markup);
        void saveMarkup(markup);
        setDraft(null);
        return;
      }

      if (draft.kind === "path") {
        if (draft.points.length < 2) { setDraft(null); return; }
        const simplified = simplifyPath(draft.points, MARKUP_LIMITS.maxPathPoints);
        const markup = {
          ...newMarkupBase("pen", planId, pageNumber, activeColor, strokeWidth, opacity, fontSize),
          kind: "path" as const,
          tool: "pen" as const,
          points: simplified,
        } as Markup;
        addMarkup(markup);
        void saveMarkup(markup);
        setDraft(null);
        return;
      }

      setDraft(null);
    },
    [draft, tool, toNorm, normalizeBounds, markups, pageNumber, selectMany, addMarkup, saveMarkup, planId, activeColor, strokeWidth, opacity, fontSize]
  );

  // ── Text commit ───────────────────────────────────────────────────────────────
  const commitText = useCallback(() => {
    if (!textInput || !textInput.value.trim()) { setTextInput(null); return; }
    const markup = {
      ...newMarkupBase("text", planId, pageNumber, activeColor, strokeWidth, opacity, fontSize),
      kind: "text" as const,
      tool: "text" as const,
      point: textInput.point,
      text: textInput.value.slice(0, MARKUP_LIMITS.maxTextLength),
    } as Markup;
    addMarkup(markup);
    void saveMarkup(markup);
    setTextInput(null);
  }, [textInput, planId, pageNumber, activeColor, strokeWidth, opacity, fontSize, addMarkup, saveMarkup]);

  // ── Draft SVG preview ─────────────────────────────────────────────────────────
  const draftPreview = useMemo(() => {
    if (!draft) return null;
    const sx = (n: number) => n * size.width;
    const sy = (n: number) => n * size.height;
    const props = { stroke: activeColor, strokeWidth, opacity, fill: "none" };

    if (draft.kind === "bounds") {
      const bounds = normalizeBounds(draft.anchor, draft.current);
      return (
        <rect
          x={sx(bounds.x)} y={sy(bounds.y)}
          width={sx(bounds.width)} height={sy(bounds.height)}
          {...props} strokeDasharray="4 2"
          style={{ pointerEvents: "none" }}
        />
      );
    }
    if (draft.kind === "line") {
      return (
        <line
          x1={sx(draft.start.x)} y1={sy(draft.start.y)}
          x2={sx(draft.current.x)} y2={sy(draft.current.y)}
          {...props} strokeDasharray="4 2"
          style={{ pointerEvents: "none" }}
        />
      );
    }
    if (draft.kind === "path") {
      const pts = draft.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
      return <polyline points={pts} {...props} style={{ pointerEvents: "none" }} />;
    }
    if (draft.kind === "lasso") {
      const bounds = normalizeBounds(draft.anchor, draft.current);
      return (
        <rect
          x={sx(bounds.x)} y={sy(bounds.y)}
          width={sx(bounds.width)} height={sy(bounds.height)}
          fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth={1}
          strokeDasharray="4 2"
          style={{ pointerEvents: "none" }}
        />
      );
    }
    return null;
  }, [draft, size, activeColor, strokeWidth, opacity]);

  // ── Sorted markups for current page ──────────────────────────────────────────
  const pageMarkups = useMemo(
    () =>
      Object.values(markups)
        .filter((m) => m.pageNumber === pageNumber)
        .sort((a, b) => a.zIndex - b.zIndex),
    [markups, pageNumber]
  );

  // ── Cursor ────────────────────────────────────────────────────────────────────
  const cursor = useMemo(() => {
    switch (tool) {
      case "pan": return "grab";
      case "select": return "default";
      case "text": return "text";
      case "eraser": return "crosshair";
      default: return "crosshair";
    }
  }, [tool]);

  // ── Textarea position ─────────────────────────────────────────────────────────
  const textareaStyle = useMemo(() => {
    if (!textInput) return undefined;
    const rect = getCanvasRect();
    if (!rect) return undefined;
    const screen = normalizedToScreen(textInput.point, rect, zoom, rotation, pageWidth, pageHeight);
    return {
      position: "fixed" as const,
      left: screen.x,
      top: screen.y,
      minWidth: 120,
      minHeight: 32,
      background: "rgba(0,0,0,0.85)",
      color: activeColor,
      fontSize: Math.round(fontSize * zoom),
      border: `1px solid ${activeColor}`,
      borderRadius: 4,
      padding: "2px 6px",
      outline: "none",
      zIndex: 9999,
      resize: "both" as const,
    };
  }, [textInput, getCanvasRect, zoom, rotation, pageWidth, pageHeight, activeColor, fontSize]);

  return (
    <>
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          inset: 0,
          width: size.width,
          height: size.height,
          cursor,
          touchAction: "none",
          overflow: "visible",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Committed markups */}
        {pageMarkups.map((m) => (
          <MarkupRenderer
            key={m.id}
            markup={m}
            canvasWidth={size.width}
            canvasHeight={size.height}
            selected={selectedIds.includes(m.id)}
            onSelect={(e) => {
              if (tool === "select") {
                e.shiftKey ? selectAdd(m.id) : selectOne(m.id);
              }
            }}
          />
        ))}
        {/* Draft preview */}
        {draftPreview}
      </svg>

      {/* Text input overlay */}
      {textInput && textareaStyle && (
        <textarea
          ref={textareaRef}
          style={textareaStyle}
          value={textInput.value}
          maxLength={MARKUP_LIMITS.maxTextLength}
          onChange={(e) => setTextInput((prev) => prev ? { ...prev, value: e.target.value } : null)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); }
            if (e.key === "Escape") setTextInput(null);
          }}
          placeholder="Type annotation…"
        />
      )}
    </>
  );
}
