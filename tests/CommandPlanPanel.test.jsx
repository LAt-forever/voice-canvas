import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommandPlanPanel from '../src/components/CommandPlanPanel';

describe('CommandPlanPanel - confirmation mode', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('renders plan steps and buttons', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommandPlanPanel
        mode="awaiting_confirmation"
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

  it('renders portrait command description', () => {
    render(
      <CommandPlanPanel
        mode="awaiting_confirmation"
        descriptions={['在中心用铅笔绘制中号“戴眼镜的女孩”肖像']}
        interpretedCommand="画一个戴眼镜的女孩"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/在中心用铅笔绘制/)).toBeInTheDocument();
  });

  it('calls onConfirm and onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommandPlanPanel
        mode="awaiting_confirmation"
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

  it('auto-cancels when timeout expires', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommandPlanPanel
        mode="awaiting_confirmation"
        descriptions={['步骤一']}
        timeoutMs={5000}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('clears interval on unmount', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { unmount } = render(
      <CommandPlanPanel
        mode="awaiting_confirmation"
        descriptions={['步骤一']}
        timeoutMs={5000}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onCancel).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('CommandPlanPanel - clarification mode', () => {
  it('renders question, options, progress dots and listening hint', () => {
    const onAnswer = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommandPlanPanel
        mode="awaiting_clarification"
        descriptions={['在中心画一个中号圆形']}
        interpretedCommand="画一个圆"
        missingParams={[
          { commandIndex: 0, param: 'color', question: '想用什么颜色？', options: ['红色', '蓝色', '绿色'] }
        ]}
        currentQuestionIndex={0}
        answers={{}}
        onAnswer={onAnswer}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('需要补充信息')).toBeInTheDocument();
    expect(screen.getByText('画一个圆')).toBeInTheDocument();
    expect(screen.getByText('想用什么颜色？')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '红色' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '蓝色' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '绿色' })).toBeInTheDocument();
    expect(screen.getByText('正在聆听您的回答…')).toBeInTheDocument();
  });

  it('calls onAnswer with option and param when option chip clicked', () => {
    const onAnswer = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommandPlanPanel
        mode="awaiting_clarification"
        descriptions={['在中心画一个中号圆形']}
        missingParams={[
          { commandIndex: 0, param: 'color', question: '想用什么颜色？', options: ['红色', '蓝色'] }
        ]}
        currentQuestionIndex={0}
        answers={{}}
        onAnswer={onAnswer}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '红色' }));
    expect(onAnswer).toHaveBeenCalledWith('红色', 'color');
  });

  it('shows answered progress dots', () => {
    const onAnswer = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommandPlanPanel
        mode="awaiting_clarification"
        descriptions={['步骤一', '步骤二']}
        missingParams={[
          { commandIndex: 0, param: 'color', question: '颜色？', options: ['红'] },
          { commandIndex: 0, param: 'size', question: '尺寸？', options: ['大'] }
        ]}
        currentQuestionIndex={1}
        answers={{ '0:color': '#ef4444' }}
        onAnswer={onAnswer}
        onCancel={onCancel}
      />
    );

    const dots = document.querySelectorAll('.progress-dot');
    expect(dots[0]).toHaveClass('answered');
    expect(dots[1]).toHaveClass('current');
  });
});
