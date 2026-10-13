import type { Rect } from './types';
import { PixelBuffer } from './pixel-buffer';

export interface ICommand {
  description: string;
  execute(): void;
  undo(): void;
}

export class DrawRectCommand implements ICommand {
  public readonly description: string;
  private buffer: PixelBuffer;
  private rect: Rect;
  private oldPixels: Uint32Array;
  private newPixels: Uint32Array;
  private onMutate?: () => void;

  constructor(
    description: string,
    buffer: PixelBuffer,
    rect: Rect,
    oldPixels: Uint32Array,
    newPixels: Uint32Array,
    onMutate?: () => void
  ) {
    this.description = description;
    this.buffer = buffer;
    this.rect = rect;
    this.oldPixels = oldPixels;
    this.newPixels = newPixels;
    this.onMutate = onMutate;
  }

  public execute(): void {
    this.buffer.blitRect(this.rect, this.newPixels);
    this.onMutate?.();
  }

  public undo(): void {
    this.buffer.blitRect(this.rect, this.oldPixels);
    this.onMutate?.();
  }
}

export class HistoryManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxDepth: number;
  private onChangeCallbacks: Array<() => void> = [];

  constructor(maxDepth: number = 60) {
    this.maxDepth = maxDepth;
  }

  public onChange(cb: () => void): () => void {
    this.onChangeCallbacks.push(cb);
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter(c => c !== cb);
    };
  }

  private notify(): void {
    for (const cb of this.onChangeCallbacks) {
      cb();
    }
  }

  public push(command: ICommand): void {
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notify();
  }

  public undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    cmd.undo();
    this.redoStack.push(cmd);
    this.notify();
    return true;
  }

  public redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    cmd.execute();
    this.undoStack.push(cmd);
    this.notify();
    return true;
  }

  public get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }
}
