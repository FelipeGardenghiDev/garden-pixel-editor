export type ProjectionMode = 'ortho' | 'isometric' | 'wrap';

export type ToolType = 
  | 'pencil' 
  | 'eraser' 
  | 'line' 
  | 'rectangle' 
  | 'circle'
  | 'isocube'
  | 'isoramp'
  | 'isocylinder'
  | 'bucket' 
  | 'picker'
  | 'select'
  | 'dither';

export type DitherMode = 'none' | 'checker' | 'bayer' | 'sparse';

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

export interface Frame {
  id: string;
  name: string;
  layers: Layer[];
  activeLayerId: string;
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

export interface GardenProjectData {
  version: string;
  appName: string;
  createdAt: string;
  width: number;
  height: number;
  projectionMode: ProjectionMode;
  fps: number;
  palettes: Palette[];
  activePaletteId: string;
  frames: Array<{
    id: string;
    name: string;
    layers: Array<{
      id: string;
      name: string;
      visible: boolean;
      opacity: number;
      data: string; // Base64 encoded pixel buffer
    }>;
    activeLayerId: string;
  }>;
}
