import type { Point } from './types';

export class Viewport {
  public zoom: number = 16;
  public panX: number = 0;
  public panY: number = 0;
  public minZoom: number = 1;
  public maxZoom: number = 64;

  private onChangeCallbacks: Array<() => void> = [];

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

  public setZoom(newZoom: number, centerScreenPoint?: Point, containerRect?: DOMRect): void {
    const clamped = Math.max(this.minZoom, Math.min(this.maxZoom, Math.round(newZoom)));
    if (clamped === this.zoom) return;

    if (centerScreenPoint && containerRect) {
      // Zoom toward mouse pointer
      const cursorX = centerScreenPoint.x - containerRect.left;
      const cursorY = centerScreenPoint.y - containerRect.top;

      // Coordinate before zoom
      const worldX = (cursorX - this.panX) / this.zoom;
      const worldY = (cursorY - this.panY) / this.zoom;

      this.zoom = clamped;

      // Update pan so world point remains at cursor
      this.panX = cursorX - worldX * this.zoom;
      this.panY = cursorY - worldY * this.zoom;
    } else {
      this.zoom = clamped;
    }

    this.notify();
  }

  public panBy(deltaX: number, deltaY: number): void {
    this.panX += deltaX;
    this.panY += deltaY;
    this.notify();
  }

  public centerInView(containerWidth: number, containerHeight: number, docWidth: number, docHeight: number): void {
    const canvasPxW = docWidth * this.zoom;
    const canvasPxH = docHeight * this.zoom;
    this.panX = Math.round((containerWidth - canvasPxW) / 2);
    this.panY = Math.round((containerHeight - canvasPxH) / 2);
    this.notify();
  }

  public screenToPixel(clientX: number, clientY: number, containerRect: DOMRect): Point {
    const screenX = clientX - containerRect.left;
    const screenY = clientY - containerRect.top;

    const pixelX = Math.floor((screenX - this.panX) / this.zoom);
    const pixelY = Math.floor((screenY - this.panY) / this.zoom);

    return { x: pixelX, y: pixelY };
  }

  public pixelToScreen(pixelX: number, pixelY: number, containerRect: DOMRect): Point {
    return {
      x: containerRect.left + this.panX + pixelX * this.zoom,
      y: containerRect.top + this.panY + pixelY * this.zoom,
    };
  }
}
