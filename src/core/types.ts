export type ProjectionMode = 'ortho' | 'isometric' | 'wrap';

export type ToolType = 
  | 'pencil' 
  | 'eraser' 
  | 'line' 
  | 'rectangle' 
  | 'isocube'
  | 'bucket' 
  | 'picker';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0 to 1
  buffer: Uint32Array; // width * height RGBA packed
}

export interface PaletteColor {
  hex: string;
  name?: string;
}

export interface Palette {
  id: string;
  name: string;
  colors: string[];
}
