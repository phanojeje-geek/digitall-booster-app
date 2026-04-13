"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

export function SignaturePad({ inputName = "signature_data_url" }: { inputName?: string }) {
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

  return (
    <div className="space-y-2">
      <input ref={hiddenInputRef} type="hidden" name={inputName} />
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
  );
}
