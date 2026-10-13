import { describe, it, expect } from 'vitest';
import { snapToIsometricAxis, snapToOrthoAxis, wrapCoordinate } from '../constraints';

describe('Constraint pipeline & projection snap rules', () => {
  describe('snapToIsometricAxis (2:1 dimetric ratio & 90 deg vertical)', () => {
    it('returns anchor when delta is zero', () => {
      expect(snapToIsometricAxis(10, 10, 10, 10)).toEqual({ x: 10, y: 10 });
    });

    it('snaps strictly vertical when delta X is small', () => {
      // (10, 10) -> (11, 30) -> Vertical axis: x stays 10, y is 30
      const snapped = snapToIsometricAxis(10, 10, 11, 30);
      expect(snapped).toEqual({ x: 10, y: 30 });
    });

    it('snaps to 2:1 slope (+0.5 down-right)', () => {
      // Starting at (0, 0), moving towards (21, 10) should snap to (20, 10)
      const snapped = snapToIsometricAxis(0, 0, 21, 10);
      expect(snapped.x).toBe(20);
      expect(snapped.y).toBe(10);
      // Slope check: deltaX = 2 * deltaY
      expect(snapped.x).toBe(snapped.y * 2);
    });

    it('snaps to 2:1 slope (-0.5 down-left)', () => {
      // Starting at (0, 0), moving towards (-19, 10) should snap to (-20, 10)
      const snapped = snapToIsometricAxis(0, 0, -19, 10);
      expect(snapped.x).toBe(-20);
      expect(snapped.y).toBe(10);
      expect(-snapped.x).toBe(snapped.y * 2);
    });
  });

  describe('snapToOrthoAxis (0°, 45°, 90°)', () => {
    it('snaps to horizontal when absDy is small relative to absDx', () => {
      const snapped = snapToOrthoAxis(10, 20, 50, 22);
      expect(snapped).toEqual({ x: 50, y: 20 });
    });

    it('snaps to vertical when absDx is small relative to absDy', () => {
      const snapped = snapToOrthoAxis(10, 20, 12, 60);
      expect(snapped).toEqual({ x: 10, y: 60 });
    });

    it('snaps to 45 degree diagonal otherwise', () => {
      const snapped = snapToOrthoAxis(0, 0, 28, 30);
      expect(snapped.x).toBe(snapped.y);
      expect(snapped.x).toBe(29);
    });
  });

  describe('wrapCoordinate (toroidal coordinates)', () => {
    it('wraps positive values correctly within bounds', () => {
      expect(wrapCoordinate(5, 48)).toBe(5);
      expect(wrapCoordinate(48, 48)).toBe(0);
      expect(wrapCoordinate(49, 48)).toBe(1);
      expect(wrapCoordinate(97, 48)).toBe(1);
    });

    it('wraps negative values correctly to opposite edge', () => {
      expect(wrapCoordinate(-1, 48)).toBe(47);
      expect(wrapCoordinate(-48, 48)).toBe(0);
      expect(wrapCoordinate(-49, 48)).toBe(47);
    });
  });
});
