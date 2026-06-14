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

const CanvasBoard = forwardRef(function CanvasBoard({ shapes, background }, ref) {
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
