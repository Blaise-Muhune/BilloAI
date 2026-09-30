"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";
import { clampSquareCrop, cropProfilePhoto, loadOrientedBitmap } from "@/lib/images";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function ProfilePhotoCrop({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (photo: File) => Promise<void>;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const drag = useRef<{ x: number; y: number; imageX: number; imageY: number } | null>(null);
  const pose = useRef({ x: 0, y: 0, zoom: 1 });
  const framed = useRef(false);

  const [ready, setReady] = useState(false);
  const [measured, setMeasured] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState({ w: 320, h: 320 });
  const [nat, setNat] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const [imageX, setImageX] = useState(0);
  const [imageY, setImageY] = useState(0);

  pose.current = { x: imageX, y: imageY, zoom };

  const viewSize = Math.max(96, Math.min(256, Math.floor(Math.min(stage.w, stage.h) - 24)));
  const viewLeft = (stage.w - viewSize) / 2;
  const viewTop = (stage.h - viewSize) / 2;
  const cover = viewSize / Math.min(nat.w, nat.h);
  const scale = cover * zoom;

  const clampPosition = useCallback(
    (x: number, y: number, nextZoom: number) => {
      const nextScale = cover * nextZoom;
      const displayedW = nat.w * nextScale;
      const displayedH = nat.h * nextScale;
      return {
        x: Math.min(viewLeft, Math.max(viewLeft + viewSize - displayedW, x)),
        y: Math.min(viewTop, Math.max(viewTop + viewSize - displayedH, y)),
      };
    },
    [cover, nat.h, nat.w, viewLeft, viewSize, viewTop],
  );

  const applyZoom = useCallback(
    (nextZoom: number, aroundX = viewLeft + viewSize / 2, aroundY = viewTop + viewSize / 2) => {
      const { x, y, zoom: currentZoom } = pose.current;
      const currentScale = cover * currentZoom;
      const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      const nextScale = cover * clampedZoom;
      const next = clampPosition(aroundX - ((aroundX - x) / currentScale) * nextScale, aroundY - ((aroundY - y) / currentScale) * nextScale, clampedZoom);
      pose.current = { x: next.x, y: next.y, zoom: clampedZoom };
      setZoom(clampedZoom);
      setImageX(next.x);
      setImageY(next.y);
    },
    [clampPosition, cover, viewLeft, viewSize, viewTop],
  );

  useEffect(() => {
    let cancelled = false;
    framed.current = false;
    setMeasured(false);
    setError("");
    setReady(false);
    void loadOrientedBitmap(file)
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        if (Math.min(bitmap.width, bitmap.height) < 32) {
          bitmap.close();
          setError("Use a larger photo.");
          return;
        }
        bitmapRef.current = bitmap;
        setNat({ w: bitmap.width, h: bitmap.height });
        setZoom(1);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not read that image.");
      });
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const sync = () => {
      const box = node.getBoundingClientRect();
      setStage({ w: Math.max(1, Math.round(box.width)), h: Math.max(1, Math.round(box.height)) });
      setMeasured(true);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    if (!ready || !measured || stage.w < 32 || stage.h < 32) return;
    if (!framed.current) {
      framed.current = true;
      const next = clampPosition((stage.w - nat.w * cover) / 2, (stage.h - nat.h * cover) / 2, 1);
      pose.current = { x: next.x, y: next.y, zoom: 1 };
      setZoom(1);
      setImageX(next.x);
      setImageY(next.y);
      return;
    }
    const next = clampPosition(pose.current.x, pose.current.y, pose.current.zoom);
    pose.current = { ...pose.current, x: next.x, y: next.y };
    setImageX(next.x);
    setImageY(next.y);
  }, [clampPosition, cover, measured, nat.h, nat.w, ready, stage.h, stage.w]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    if (!canvas || !bitmap || !ready) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(stage.w * dpr));
    canvas.height = Math.max(1, Math.round(stage.h * dpr));
    canvas.style.width = `${stage.w}px`;
    canvas.style.height = `${stage.h}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, stage.w, stage.h);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, imageX, imageY, nat.w * scale, nat.h * scale);
    const preview = previewRef.current;
    if (preview) {
      const crop = clampSquareCrop(nat.w, nat.h, {
        x: (viewLeft - imageX) / scale,
        y: (viewTop - imageY) / scale,
        size: viewSize / scale,
      });
      const previewSize = 56;
      preview.width = Math.round(previewSize * dpr);
      preview.height = Math.round(previewSize * dpr);
      preview.style.width = `${previewSize}px`;
      preview.style.height = `${previewSize}px`;
      const previewContext = preview.getContext("2d");
      if (previewContext) {
        previewContext.setTransform(dpr, 0, 0, dpr, 0, 0);
        previewContext.imageSmoothingEnabled = true;
        previewContext.imageSmoothingQuality = "high";
        previewContext.clearRect(0, 0, previewSize, previewSize);
        previewContext.drawImage(bitmap, crop.x, crop.y, crop.size, crop.size, 0, 0, previewSize, previewSize);
      }
    }
  }, [imageX, imageY, nat.h, nat.w, ready, scale, stage.h, stage.w, viewLeft, viewSize, viewTop]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [busy, onCancel]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || !ready) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = node.getBoundingClientRect();
      applyZoom(pose.current.zoom * (event.deltaY > 0 ? 0.92 : 1.08), event.clientX - box.left, event.clientY - box.top);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [applyZoom, ready]);

  function cropFromView() {
    return clampSquareCrop(nat.w, nat.h, {
      x: (viewLeft - imageX) / scale,
      y: (viewTop - imageY) / scale,
      size: viewSize / scale,
    });
  }

  async function usePhoto() {
    const bitmap = bitmapRef.current;
    if (!bitmap) return;
    setBusy(true);
    setError("");
    try {
      const photo = await cropProfilePhoto(bitmap, cropFromView());
      await onConfirm(photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that photo.");
      setBusy(false);
    }
  }

  function stagePoint(event: { clientX: number; clientY: number }) {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return { x: event.clientX, y: event.clientY };
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!ready || busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      drag.current = { x: event.clientX, y: event.clientY, imageX: pose.current.x, imageY: pose.current.y };
      pinch.current = null;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: pose.current.zoom };
      drag.current = null;
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.distance > 8) {
        const mid = stagePoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
        applyZoom(pinch.current.zoom * (distance / pinch.current.distance), mid.x, mid.y);
      }
      return;
    }
    if (!drag.current) return;
    const next = clampPosition(drag.current.imageX + (event.clientX - drag.current.x), drag.current.imageY + (event.clientY - drag.current.y), pose.current.zoom);
    pose.current = { ...pose.current, x: next.x, y: next.y };
    setImageX(next.x);
    setImageY(next.y);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  }

  const dialog = (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[rgb(20_17_14/0.45)] p-3 backdrop-blur-[2px] sm:p-4">
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-crop-title"
          aria-describedby="photo-crop-copy"
          tabIndex={-1}
          className="surface flex h-[min(42rem,calc(100dvh-1.5rem))] w-full max-w-md flex-col gap-3 overflow-hidden p-4 outline-none sm:gap-4 sm:p-5"
        >
          <div className="shrink-0">
            <h2 id="photo-crop-title" className="serif text-xl sm:text-2xl">
              Fit your photo
            </h2>
            <p id="photo-crop-copy" className="mt-1 text-sm text-muted">
              Drag to move. Pinch or zoom. The circle is your card.
            </p>
          </div>
          <div
            ref={stageRef}
            className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden rounded-2xl bg-[#14110e]"
            style={{ touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
            <div
              className="pointer-events-none absolute rounded-full ring-2 ring-white/90"
              style={{
                left: viewLeft,
                top: viewTop,
                width: viewSize,
                height: viewSize,
                boxShadow: "0 0 0 999px rgb(20 17 14 / 0.55)",
              }}
            />
            {!ready && !error ? <p className="absolute inset-0 grid place-items-center text-sm text-[#f4efe6]">Opening photo…</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <canvas ref={previewRef} className="h-14 w-14 shrink-0 rounded-full bg-[#e5f4ee]" aria-hidden />
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-sm font-medium text-muted">Zoom</span>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                disabled={!ready || busy}
                onChange={(event) => applyZoom(Number(event.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </label>
          </div>
          {error ? <p className="shrink-0 text-sm text-red-700">{error}</p> : null}
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button type="button" className="min-w-36" busy={busy} disabled={!ready} onClick={() => void usePhoto()}>
              {busy ? "Saving…" : "Use this photo"}
            </Button>
            <Button type="button" tone="ghost" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
