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

const CanvasBoard = forwardRef(function CanvasBoard({ shapes }, ref) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cssWidth = canvas.width / (window.devicePixelRatio || 1);
    const cssHeight = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    for (const shape of shapes) {
      const drawer = DRAWERS[shape.type];
      if (drawer) drawer(ctx, shape);
    }
  }, [shapes]);

  useImperativeHandle(ref, () => ({
    exportImage() {
      const canvas = canvasRef.current;
      return canvas ? canvas.toDataURL('image/png') : null;
    }
  }));

  return (
    <div ref={containerRef} className="canvas-board">
      <canvas ref={canvasRef} />
    </div>
  );
});

export default CanvasBoard;
