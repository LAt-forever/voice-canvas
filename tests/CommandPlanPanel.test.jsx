import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommandPlanPanel from '../src/components/CommandPlanPanel';

describe('CommandPlanPanel', () => {
  it('renders plan steps and buttons', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommandPlanPanel
        descriptions={['画一个红色圆形', '设置背景为蓝色']}
        timeoutMs={5000}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('识别到多步计划')).toBeInTheDocument();
    expect(screen.getByText('画一个红色圆形')).toBeInTheDocument();
    expect(screen.getByText('设置背景为蓝色')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /确认执行/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument();
  });

  it('calls onConfirm and onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommandPlanPanel
        descriptions={['步骤一']}
        timeoutMs={5000}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /确认执行/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /取消/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
