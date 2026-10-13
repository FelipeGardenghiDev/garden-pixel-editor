import { describe, it, expect } from 'vitest';
import { bufferToBase64, base64ToBuffer, serializeProject, deserializeProject } from '../project-file';
import { EditorEngine } from '../editor-engine';

describe('Project serialization & deserialization (.garden format)', () => {
  it('encodes Uint32Array to base64 and decodes back with 100% fidelity', () => {
    const original = new Uint32Array([
      0x00000000,
      0xFF0000FF,
      0x00FF00FF,
      0x0000FFFF,
      0xFFFFFFFF,
      0x12345678
    ]);

    const base64 = bufferToBase64(original);
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(0);

    const decoded = base64ToBuffer(base64, original.length);
    expect(decoded.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(decoded[i]).toBe(original[i]);
    }
  });

  it('serializes an engine state and restores frames and layers accurately', () => {
    const engineA = new EditorEngine(16, 16);
    engineA.projectionMode = 'isometric';
    engineA.fps = 12;

    // Draw something on frame 1
    const activeLayerA = engineA.document.getActiveLayer();
    expect(activeLayerA).toBeDefined();
    activeLayerA!.buffer[0] = 0xFFAABBCC;

    // Add a second frame
    const frame2 = engineA.document.addFrame();
    frame2.layers[0].buffer[5] = 0xFF112233;

    // Serialize
    const projectData = serializeProject(engineA);
    expect(projectData.width).toBe(16);
    expect(projectData.height).toBe(16);
    expect(projectData.projectionMode).toBe('isometric');
    expect(projectData.fps).toBe(12);
    expect(projectData.frames.length).toBe(2);

    // Deserialize into a fresh engine
    const engineB = new EditorEngine(32, 32);
    deserializeProject(engineB, projectData);

    expect(engineB.document.width).toBe(16);
    expect(engineB.document.height).toBe(16);
    expect(engineB.projectionMode).toBe('isometric');
    expect(engineB.fps).toBe(12);
    expect(engineB.document.frames.length).toBe(2);

    // Verify pixels in frame 1 and 2
    expect(engineB.document.frames[0].layers[0].buffer[0]).toBe(0xFFAABBCC);
    expect(engineB.document.frames[1].layers[0].buffer[5]).toBe(0xFF112233);
  });
});
