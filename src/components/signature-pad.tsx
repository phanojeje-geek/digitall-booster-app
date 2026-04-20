"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function SignaturePad({ inputName = "signature_data_url" }: { inputName?: string }) {
  const [mode, setMode] = useState<"draw" | "checkbox">("draw");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = canvas.toDataURL("image/png");
    }
  };

  const onPointerUp = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = "";
    }
  };

  const onCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = e.target.checked ? "CONSENT_CHECKED" : "";
    }
  };

  return (
    <div className="space-y-4">
      <input ref={hiddenInputRef} type="hidden" name={inputName} />
      
      <div className="flex gap-4 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setMode("draw");
            if (hiddenInputRef.current) hiddenInputRef.current.value = "";
          }}
          className={`text-sm font-semibold ${mode === "draw" ? "text-indigo-600 underline" : "text-zinc-500"}`}
        >
          Dessiner
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("checkbox");
            if (hiddenInputRef.current) hiddenInputRef.current.value = "";
          }}
          className={`text-sm font-semibold ${mode === "checkbox" ? "text-indigo-600 underline" : "text-zinc-500"}`}
        >
          Accord écrit
        </button>
      </div>

      {mode === "draw" ? (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            width={700}
            height={200}
            className="h-36 w-full rounded-xl border border-zinc-300 bg-white touch-none dark:border-zinc-700"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          <Button type="button" variant="ghost" onClick={clear}>
            Effacer la signature
          </Button>
        </div>
      ) : (
        <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <input
            type="checkbox"
            onChange={onCheckboxChange}
            className="h-5 w-5 rounded border-zinc-300 text-indigo-600"
          />
          <span className="text-sm font-medium">Je donne mon accord pour l'enregistrement et le traitement de mes données.</span>
        </label>
      )}
    </div>
  );
}
