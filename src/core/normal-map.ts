import { PixelBuffer } from './pixel-buffer';
import { uint32ToRgba, rgbaToUint32, hexToUint32 } from './color';

export interface NormalMapOptions {
  strength?: number;      // Normal extrusion strength (0.5 to 5.0)
  bevelRadius?: number;   // Distance in pixels for edge smoothing/bevel (1 to 4)
  invertY?: boolean;      // DirectX style if true, OpenGL style if false (default false)
  isoTilted?: boolean;    // Tilts normals to match isometric 2:1 angle
}

export interface LightOptions {
  lightColor?: string;
  lightIntensity?: number;
  ambientColor?: string;
  ambientIntensity?: number;
  specularShininess?: number;
  specularIntensity?: number;
}

/**
 * Computes a high-quality normal map tailored for pixel art sprites.
 * Combines luminance depth with distance-to-edge beveling so pixels have rounded contours.
 */
export function generateNormalMap(
  buffer: PixelBuffer,
  options: NormalMapOptions = {}
): PixelBuffer {
  const {
    strength = 2.0,
    bevelRadius = 2,
    invertY = false,
    isoTilted = false
  } = options;

  const w = buffer.width;
  const h = buffer.height;
  const output = new PixelBuffer(w, h);

  // 1. Build heightmap: luminance + edge distance
  const heightMap = new Float32Array(w * h);
  const alphaMap = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const col = buffer.data[idx];
      const [r, g, b, a] = uint32ToRgba(col);
      alphaMap[idx] = a;

      if (a === 0) {
        heightMap[idx] = 0;
      } else {
        // Luminance 0..1
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        heightMap[idx] = lum;
      }
    }
  }

  // 2. Bevel silhouette distance pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (alphaMap[idx] === 0) continue;

      let minDist = bevelRadius;
      for (let dy = -bevelRadius; dy <= bevelRadius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) {
          minDist = Math.min(minDist, Math.abs(dy));
          continue;
        }
        for (let dx = -bevelRadius; dx <= bevelRadius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w || alphaMap[ny * w + nx] === 0) {
            const dist = Math.hypot(dx, dy);
            if (dist < minDist) {
              minDist = dist;
            }
          }
        }
      }

      const bevelFactor = Math.min(1.0, minDist / bevelRadius);
      // Combine 60% bevel distance + 40% luminance
      heightMap[idx] = (bevelFactor * 0.6) + (heightMap[idx] * 0.4);
    }
  }

  // 3. Sobel filter for tangent normal vector calculation
  const getHeight = (x: number, y: number): number => {
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    return heightMap[cy * w + cx];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const alpha = alphaMap[idx];

      if (alpha === 0) {
        // Transparent remains fully transparent
        output.data[idx] = 0;
        continue;
      }

      // Sobel kernel for dX and dY
      const tl = getHeight(x - 1, y - 1);
      const l  = getHeight(x - 1, y);
      const bl = getHeight(x - 1, y + 1);
      const tr = getHeight(x + 1, y - 1);
      const r  = getHeight(x + 1, y);
      const br = getHeight(x + 1, y + 1);
      const t  = getHeight(x, y - 1);
      const b  = getHeight(x, y + 1);

      const dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
      const dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

      let nx = -dX * strength;
      let ny = (invertY ? dY : -dY) * strength;
      let nz = 1.0;

      // Isometric projection adjustment (tilt normals to match ~30 degree isometric angle)
      if (isoTilted) {
        // Tilt Z towards top-right slightly
        const isoAngle = Math.PI / 6;
        const cosA = Math.cos(isoAngle);
        const sinA = Math.sin(isoAngle);
        const tempY = ny * cosA - nz * sinA;
        nz = ny * sinA + nz * cosA;
        ny = tempY;
      }

      // Normalize
      const len = Math.hypot(nx, ny, nz) || 1.0;
      nx /= len;
      ny /= len;
      nz /= len;

      // Map from [-1, 1] to [0, 255]
      const red = Math.round((nx * 0.5 + 0.5) * 255);
      const green = Math.round((ny * 0.5 + 0.5) * 255);
      const blue = Math.round((nz * 0.5 + 0.5) * 255);

      output.data[idx] = rgbaToUint32(red, green, blue, alpha);
    }
  }

  return output;
}

/**
 * Renders a dynamic 2.5D lit preview using diffuse colors, normal vectors, and a point light source.
 */
export function renderLitPreview(
  diffuseBuffer: PixelBuffer,
  normalBuffer: PixelBuffer,
  lightX: number,
  lightY: number,
  lightZ: number = 32,
  options: LightOptions = {}
): PixelBuffer {
  const {
    lightColor = '#FFFFFF',
    lightIntensity = 1.3,
    ambientColor = '#27272A',
    ambientIntensity = 0.4,
    specularShininess = 16,
    specularIntensity = 0.45
  } = options;

  const w = diffuseBuffer.width;
  const h = diffuseBuffer.height;
  const output = new PixelBuffer(w, h);

  const [lR, lG, lB] = uint32ToRgba(hexToUint32(lightColor));
  const [aR, aG, aB] = uint32ToRgba(hexToUint32(ambientColor));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const diffuseUint = diffuseBuffer.data[idx];
      const normalUint = normalBuffer.data[idx];

      const [diffR, diffG, diffB, alpha] = uint32ToRgba(diffuseUint);
      if (alpha === 0) {
        output.data[idx] = 0;
        continue;
      }

      const [normR, normG, normB] = uint32ToRgba(normalUint);
      // Unpack normal vector from [0..255] to [-1..1]
      const nx = (normR / 255.0) * 2.0 - 1.0;
      const ny = (normG / 255.0) * 2.0 - 1.0;
      const nz = (normB / 255.0) * 2.0 - 1.0;

      // Vector to light source
      const lx = lightX - x;
      const ly = lightY - y;
      const lz = lightZ;
      const dist = Math.hypot(lx, ly, lz) || 1.0;

      const dirX = lx / dist;
      const dirY = ly / dist;
      const dirZ = lz / dist;

      // Lambertian diffuse dot product (N . L)
      const nDotL = Math.max(0, nx * dirX + ny * dirY + nz * dirZ);

      // Distance attenuation
      const radius = Math.max(w, h) * 1.5;
      const attenuation = Math.max(0, 1.0 - (dist / radius) * 0.4);

      // Blinn-Phong Specular
      // View vector is straight on [0, 0, 1]
      const halfX = dirX;
      const halfY = dirY;
      const halfZ = dirZ + 1.0;
      const halfLen = Math.hypot(halfX, halfY, halfZ) || 1.0;
      const hDotN = Math.max(0, nx * (halfX / halfLen) + ny * (halfY / halfLen) + nz * (halfZ / halfLen));
      const spec = Math.pow(hDotN, specularShininess) * specularIntensity;

      // Lighting combination
      const ambR = (aR / 255.0) * ambientIntensity;
      const ambG = (aG / 255.0) * ambientIntensity;
      const ambB = (aB / 255.0) * ambientIntensity;

      const lightFactor = nDotL * (lightIntensity * attenuation);

      const finalR = Math.min(255, Math.round(diffR * (ambR + (lR / 255.0) * lightFactor) + lR * spec));
      const finalG = Math.min(255, Math.round(diffG * (ambG + (lG / 255.0) * lightFactor) + lG * spec));
      const finalB = Math.min(255, Math.round(diffB * (ambB + (lB / 255.0) * lightFactor) + lB * spec));

      output.data[idx] = rgbaToUint32(finalR, finalG, finalB, alpha);
    }
  }

  return output;
}

/**
 * Triggers PNG file download of a normal map buffer at a given scale.
 */
export function exportNormalMapToPng(
  normalBuffer: PixelBuffer,
  scale: number = 4,
  filename: string = 'garden_normal_map.png'
): void {
  const canvas = document.createElement('canvas');
  canvas.width = normalBuffer.width * scale;
  canvas.height = normalBuffer.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = normalBuffer.width;
  tempCanvas.height = normalBuffer.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  const imgData = tempCtx.createImageData(normalBuffer.width, normalBuffer.height);
  const uint32View = new Uint32Array(imgData.data.buffer);
  uint32View.set(normalBuffer.data);
  tempCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  a.click();
}
