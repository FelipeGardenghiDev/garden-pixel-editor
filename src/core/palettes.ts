import type { Palette } from './types';

export const PRESET_PALETTES: Palette[] = [
  {
    id: 'pico-8',
    name: 'PICO-8 (16 cores)',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ]
  },
  {
    id: 'gameboy',
    name: 'Game Boy Original (4 cores)',
    colors: [
      '#0f380f', '#306230', '#8bac0f', '#9bbc0f'
    ]
  },
  {
    id: 'endesga-32',
    name: 'EDG 32 (Endesga)',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672',
      '#b86f50', '#733e39', '#3e2731', '#a22633',
      '#e43b44', '#f77622', '#feae34', '#fee761',
      '#63c74d', '#3e8948', '#265c42', '#193c3e',
      '#124e89', '#0099db', '#2ce8f5', '#ffffff',
      '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
      '#262b44', '#181425', '#ff0044', '#68386c',
      '#b55088', '#f6757a', '#e8b796', '#c28569'
    ]
  },
  {
    id: 'cyberpunk',
    name: 'Neon Cyberpunk',
    colors: [
      '#08040b', '#1f0d3d', '#3d1663', '#791e70',
      '#b32569', '#e03b68', '#ff6b6b', '#ffd166',
      '#06d6a0', '#118ab2', '#073b4c', '#f72585',
      '#7209b7', '#3a0ca3', '#4361ee', '#4cc9f0'
    ]
  }
];
