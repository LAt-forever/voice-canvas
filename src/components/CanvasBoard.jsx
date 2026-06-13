import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { drawRect } from '../shapes/drawRect';
import { drawCircle } from '../shapes/drawCircle';
import { drawLine } from '../shapes/drawLine';
import { drawTriangle } from '../shapes/drawTriangle';

const DRAWERS = {
  rect: drawRect,
  circle: drawCircle,
  line: drawLine,
  triangle: drawTriangle
};

function drawGrid(ctx, width, height, spacing) {
  ctx.save();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}

const CanvasBoard = forwardRef(function CanvasBoard({ shapes, grid }, ref) {
  const gridCanvasRef = useRef(null);
  const shapeCanvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function resize() {
      const container = containerRef.current;
      const gridCanvas = gridCanvasRef.current;
      const shapeCanvas = shapeCanvasRef.current;
      if (!container || !gridCanvas || !shapeCanvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      [gridCanvas, shapeCanvas].forEach((canvas) => {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      });

      const shapeCtx = shapeCanvas.getContext('2d');
      shapeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const gridCtx = gridCanvas.getContext('2d');
      gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) return;

    const ctx = gridCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = gridCanvas.width / dpr;
    const cssHeight = gridCanvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    if (grid?.visible) {
      drawGrid(ctx, cssWidth, cssHeight, grid.spacing);
    }
  }, [grid]);

  useEffect(() => {
    const canvas = shapeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    for (const shape of shapes) {
      const drawer = DRAWERS[shape.type];
      if (drawer) drawer(ctx, shape);
    }
  }, [shapes]);

  useImperativeHandle(ref, () => ({
    exportImage() {
      const canvas = shapeCanvasRef.current;
      return canvas ? canvas.toDataURL('image/png') : null;
    }
  }));

  return (
    <div ref={containerRef} className="canvas-board">
      <canvas ref={gridCanvasRef} className="canvas-grid" />
      <canvas ref={shapeCanvasRef} className="canvas-shapes" />
    </div>
  );
});

export default CanvasBoard;
