import { describe, it, expect, vi } from 'vitest';
import { HistoryManager, DrawRectCommand } from '../history';
import { PixelBuffer } from '../pixel-buffer';

describe('HistoryManager & Command Pattern (Dirty-rect Undo/Redo)', () => {
  it('executes, undoes and redoes DrawRectCommand modifying buffer', () => {
    const buffer = new PixelBuffer(5, 5);
    const history = new HistoryManager();

    const rect = { x: 1, y: 1, width: 2, height: 2 };
    const oldPixels = buffer.extractRect(rect);
    const newPixels = new Uint32Array([0xFF, 0xFF, 0xFF, 0xFF]);

    const cmd = new DrawRectCommand('Draw Box', buffer, rect, oldPixels, newPixels);
    cmd.execute();
    history.push(cmd);

    expect(buffer.getPixel(1, 1)).toBe(0xFF);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    // Undo
    const undone = history.undo();
    expect(undone).toBe(true);
    expect(buffer.getPixel(1, 1)).toBe(0);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);

    // Redo
    const redone = history.redo();
    expect(redone).toBe(true);
    expect(buffer.getPixel(1, 1)).toBe(0xFF);
  });

  it('notifies listeners when commands are pushed, undone or cleared', () => {
    const history = new HistoryManager();
    const listener = vi.fn();
    const unsub = history.onChange(listener);

    const mockCmd = {
      description: 'mock',
      execute: vi.fn(),
      undo: vi.fn()
    };

    history.push(mockCmd);
    expect(listener).toHaveBeenCalledTimes(1);

    history.undo();
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
    history.redo();
    // Listener unsubscribed, count remains 2
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('limits undo stack to maxDepth', () => {
    const history = new HistoryManager(3);
    for (let i = 0; i < 5; i++) {
      history.push({
        description: `cmd ${i}`,
        execute: vi.fn(),
        undo: vi.fn()
      });
    }

    // Pushed 5 with maxDepth 3 -> can only undo 3 times
    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(false);
  });
});
