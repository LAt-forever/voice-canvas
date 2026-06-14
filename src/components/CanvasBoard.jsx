import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { drawRect } from '../shapes/drawRect';
import { drawCircle } from '../shapes/drawCircle';
import { drawLine } from '../shapes/drawLine';
import { drawTriangle } from '../shapes/drawTriangle';
import { renderBackground } from '../utils/backgroundRenderer';

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

const CanvasBoard = forwardRef(function CanvasBoard({ shapes, layers, background, grid }, ref) {
  const bgCanvasRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const shapeCanvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function resize() {
      const container = containerRef.current;
      const bgCanvas = bgCanvasRef.current;
      const gridCanvas = gridCanvasRef.current;
      const shapeCanvas = shapeCanvasRef.current;
      if (!container || !bgCanvas || !gridCanvas || !shapeCanvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      [bgCanvas, gridCanvas, shapeCanvas].forEach((canvas) => {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      });

      [bgCanvas, gridCanvas, shapeCanvas].forEach((canvas) => {
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    renderBackground(ctx, cssWidth, cssHeight, background);
  }, [background]);

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

    const visibleLayerIds = new Set(
      (layers || [])
        .filter((layer) => layer.visible)
        .map((layer) => layer.id)
    );

    for (const shape of shapes) {
      if (shape.layerId && !visibleLayerIds.has(shape.layerId)) continue;
      const drawer = DRAWERS[shape.type];
      if (drawer) drawer(ctx, shape);
    }
  }, [shapes, layers]);

  useImperativeHandle(ref, () => ({
    exportImage() {
      const bgCanvas = bgCanvasRef.current;
      const shapeCanvas = shapeCanvasRef.current;
      if (!bgCanvas || !shapeCanvas) return null;

      const canvas = document.createElement('canvas');
      canvas.width = bgCanvas.width;
      canvas.height = bgCanvas.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bgCanvas, 0, 0);
      ctx.drawImage(shapeCanvas, 0, 0);
      return canvas.toDataURL('image/png');
    }
  }));

  return (
    <div ref={containerRef} className="canvas-board">
      <canvas ref={bgCanvasRef} className="canvas-background" />
      <canvas ref={gridCanvasRef} className="canvas-grid" />
      <canvas ref={shapeCanvasRef} className="canvas-shapes" />
    </div>
  );
});

export default CanvasBoard;
