import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PencilCursor from '../src/components/PencilCursor';

describe('PencilCursor', () => {
  it('renders at given position', () => {
    render(<PencilCursor x={120} y={80} visible />);
    const el = screen.getByTestId('pencil-cursor');
    expect(el).toHaveStyle({ left: '120px', top: '80px' });
  });

  it('is hidden when not visible', () => {
    render(<PencilCursor x={0} y={0} visible={false} />);
    const el = screen.getByTestId('pencil-cursor');
    expect(el).toHaveClass('hidden');
  });
});
