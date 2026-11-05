'use client';

interface WatermarkProps {
  text: string;
}

export function Watermark({ text }: WatermarkProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
      <span className="-rotate-12 whitespace-nowrap text-2xl font-bold tracking-[0.3em] text-white/20">
        {text}
      </span>
    </div>
  );
}

export function drawWatermarkToCanvas(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  opacity = 0.1,
  angle = -25
) {
  context.save();
  context.globalAlpha = opacity;
  context.fillStyle = '#ffffff';
  context.font = `bold ${Math.max(14, Math.floor(width / 24))}px sans-serif`;
  context.textAlign = 'center';
  context.translate(width / 2, height / 2);
  context.rotate((angle * Math.PI) / 180);
  const textWidth = context.measureText(text).width + 90;
  const spacing = Math.max(textWidth, 220);
  for (let y = -height; y < height; y += 90) {
    for (let x = -width; x < width; x += spacing) context.fillText(text, x, y);
  }
  context.restore();
}
