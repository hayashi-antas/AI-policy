import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import './DigitalWaveBackground.css';

export type WavePreset = 'abyssCyan' | 'midnightViolet' | 'steelBlue';

export type ColorScheme = {
  deep: string;
  mid: string;
  high: string;
  accent: string;
};

export type DigitalWaveBackgroundProps = {
  className?: string;
  zIndex?: number;
  opacity?: number;
  tileSize?: number;
  waveHeight?: number;
  waveSpeed?: number;
  driftSpeed?: number;
  detailStrength?: number;
  targetFps?: number;
  dprCap?: number;
  veilOpacity?: number;
  preset?: WavePreset;
  colorScheme?: ColorScheme;
  pauseWhenHidden?: boolean;
  reducedMotionMode?: 'static' | 'slow';
};

type RGB = {
  r: number;
  g: number;
  b: number;
};

const PRESET_SCHEMES: Record<WavePreset, ColorScheme> = {
  abyssCyan: {
    deep: '#112846',
    mid: '#2a6f82',
    high: '#39d9bf',
    accent: '#8b74e3',
  },
  midnightViolet: {
    deep: '#151a34',
    mid: '#3a437d',
    high: '#67b5ea',
    accent: '#ab78df',
  },
  steelBlue: {
    deep: '#12263a',
    mid: '#356286',
    high: '#70ccdd',
    accent: '#9178d9',
  },
};

const LIGHT_DIR = normalize3(-0.34, -0.25, 0.91);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
}

function hexToRgb(hex: string): RGB {
  const normalized = hex.trim().replace('#', '');
  const compact = normalized.length === 3
    ? normalized
        .split('')
        .map((c) => c + c)
        .join('')
    : normalized;

  if (!/^[a-fA-F0-9]{6}$/.test(compact)) {
    return { r: 0, g: 0, b: 0 };
  }

  const r = Number.parseInt(compact.slice(0, 2), 16);
  const g = Number.parseInt(compact.slice(2, 4), 16);
  const b = Number.parseInt(compact.slice(4, 6), 16);
  return { r, g, b };
}

function mixColor(a: RGB, b: RGB, t: number): RGB {
  const tt = clamp(t, 0, 1);
  return {
    r: a.r + (b.r - a.r) * tt,
    g: a.g + (b.g - a.g) * tt,
    b: a.b + (b.b - a.b) * tt,
  };
}

function scaleColor(rgb: RGB, factor: number): RGB {
  return {
    r: clamp(rgb.r * factor, 0, 255),
    g: clamp(rgb.g * factor, 0, 255),
    b: clamp(rgb.b * factor, 0, 255),
  };
}

function rgbToString(rgb: RGB): string {
  return `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)})`;
}

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z);
  if (len === 0) {
    return [0, 0, 1];
  }
  return [x / len, y / len, z / len];
}

function getHeightColor(value: number, deep: RGB, mid: RGB, high: RGB): RGB {
  const t = clamp(value, 0, 1);
  if (t < 0.55) {
    return mixColor(deep, mid, t / 0.55);
  }
  return mixColor(mid, high, (t - 0.55) / 0.45);
}

export default function DigitalWaveBackground({
  className,
  zIndex = 0,
  opacity = 1,
  tileSize = 72,
  waveHeight = 34,
  waveSpeed = 0.26,
  driftSpeed = 0.21,
  detailStrength = 0.42,
  targetFps = 30,
  dprCap = 1.75,
  veilOpacity = 0.38,
  preset = 'abyssCyan',
  colorScheme,
  pauseWhenHidden = true,
  reducedMotionMode = 'slow',
}: DigitalWaveBackgroundProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mergedScheme = useMemo<ColorScheme>(() => {
    const base = PRESET_SCHEMES[preset];
    return {
      deep: colorScheme?.deep ?? base.deep,
      mid: colorScheme?.mid ?? base.mid,
      high: colorScheme?.high ?? base.high,
      accent: colorScheme?.accent ?? base.accent,
    };
  }, [colorScheme, preset]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) {
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) {
      return;
    }

    const safeTile = Math.max(28, tileSize);
    const safeHeight = Math.max(4, waveHeight);
    const safeDetail = clamp(detailStrength, 0, 1.5);
    const safeFps = clamp(targetFps, 1, 60);
    const frameInterval = 1000 / safeFps;
    const safeDprCap = clamp(dprCap, 1, 3);
    const motionSlowdown = reducedMotionMode === 'slow' ? 0.33 : 1;
    const projectionSkew = 0.52;
    const projectionYScale = 0.66;

    const deepRgb = hexToRgb(mergedScheme.deep);
    const midRgb = hexToRgb(mergedScheme.mid);
    const highRgb = hexToRgb(mergedScheme.high);
    const accentRgb = hexToRgb(mergedScheme.accent);
    const sunGoldRgb = hexToRgb('#ffd56b');
    const sunOrangeRgb = hexToRgb('#ff9a58');
    const sunRoseRgb = hexToRgb('#ff6d67');

    let cssWidth = 0;
    let cssHeight = 0;
    let columns = 0;
    let rows = 0;
    let rafId: number | null = null;
    let lastFrame = 0;
    let vertexX = new Float32Array(0);
    let vertexY = new Float32Array(0);
    let vertexZ = new Float32Array(0);
    let vertexPhase = new Float32Array(0);
    let cellNoise = new Float32Array(0);
    let backgroundGradient: CanvasGradient | null = null;
    let skewOffsetX = 0;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;

    const isStaticMode = (): boolean => prefersReducedMotion && reducedMotionMode === 'static';

    const createBuffers = (): void => {
      const vertexCount = (columns + 1) * (rows + 1);
      vertexX = new Float32Array(vertexCount);
      vertexY = new Float32Array(vertexCount);
      vertexZ = new Float32Array(vertexCount);
      vertexPhase = new Float32Array(vertexCount);
      cellNoise = new Float32Array(columns * rows);

      for (let i = 0; i < vertexCount; i += 1) {
        vertexPhase[i] = (seededNoise(i + 19) - 0.5) * Math.PI * 2;
      }
      for (let i = 0; i < cellNoise.length; i += 1) {
        cellNoise[i] = (seededNoise(i + 111) - 0.5) * 2;
      }
    };

    const resizeCanvas = (): void => {
      const rect = root.getBoundingClientRect();
      cssWidth = Math.max(1, Math.round(rect.width));
      cssHeight = Math.max(1, Math.round(rect.height));

      const ratio = Math.min(window.devicePixelRatio || 1, safeDprCap);
      canvas.width = Math.round(cssWidth * ratio);
      canvas.height = Math.round(cssHeight * ratio);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      rows = Math.ceil(cssHeight / (safeTile * projectionYScale)) + 7;
      columns = Math.ceil((cssWidth + rows * safeTile * projectionSkew) / safeTile) + 7;
      skewOffsetX = rows * safeTile * projectionSkew * 0.58;
      createBuffers();

      backgroundGradient = ctx.createLinearGradient(0, 0, 0, cssHeight);
      backgroundGradient.addColorStop(0, rgbToString(scaleColor(highRgb, 1.08)));
      backgroundGradient.addColorStop(0.34, rgbToString(scaleColor(midRgb, 1.02)));
      backgroundGradient.addColorStop(0.7, rgbToString(scaleColor(midRgb, 0.84)));
      backgroundGradient.addColorStop(1, rgbToString(scaleColor(deepRgb, 0.72)));
    };

    const computeHeight = (x: number, y: number, t: number, phase: number): number => {
      const flowTime = t * waveSpeed * 2.2;
      const drift = t * driftSpeed * safeTile;
      const sampleX = x + drift + Math.sin((y / safeTile) * 0.58 + phase) * safeTile * 0.15;
      const sampleY = y + Math.cos((x / safeTile) * 0.46 - phase * 0.8) * safeTile * 0.1;

      const lowSwell = Math.sin(sampleX * 0.012 + flowTime * 0.72 + phase * 0.28);

      const ridgeRaw = Math.sin(
        sampleX * 0.024 - sampleY * 0.015 + flowTime * 1.62 + phase * 0.68,
      );
      const ridge = Math.sign(ridgeRaw) * Math.pow(Math.abs(ridgeRaw), 1.35);

      const pulse = 0.5 + 0.5 * Math.sin(flowTime * 0.42 + y * 0.0017 + phase * 0.5);
      const chop = Math.sin(
        sampleX * 0.05 + sampleY * 0.033 - flowTime * 2.38 + phase * 1.15,
      );
      const chopAmp = (0.09 + 0.2 * pulse) * safeDetail;

      return (lowSwell * 0.56 + ridge * 0.33 + chop * chopAmp) * safeHeight;
    };

    const getLight = (a: number, b: number, c: number): number => {
      const ax = vertexX[a];
      const ay = vertexY[a];
      const az = vertexZ[a];
      const bx = vertexX[b];
      const by = vertexY[b];
      const bz = vertexZ[b];
      const cx = vertexX[c];
      const cy = vertexY[c];
      const cz = vertexZ[c];

      const ux = (bx - ax) * 0.016;
      const uy = (by - ay) * 0.016;
      const uz = bz - az;
      const vx = (cx - ax) * 0.016;
      const vy = (cy - ay) * 0.016;
      const vz = cz - az;

      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const [lx, ly, lz] = normalize3(nx, ny, nz);
      const dot = lx * LIGHT_DIR[0] + ly * LIGHT_DIR[1] + lz * LIGHT_DIR[2];
      return clamp((dot + 1) * 0.5, 0, 1);
    };

    const drawTriangle = (
      a: number,
      b: number,
      c: number,
      cellNoiseValue: number,
      depthRatio: number,
      time: number,
    ): void => {
      const avgHeight = (vertexZ[a] + vertexZ[b] + vertexZ[c]) / 3;
      const heightNorm = clamp(0.5 + avgHeight / (safeHeight * 2.25), 0, 1);
      const depthNorm = clamp((1 - depthRatio) * 0.62 + heightNorm * 0.38, 0, 1);

      const baseColor = getHeightColor(depthNorm, deepRgb, midRgb, highRgb);
      const accentPulse = (
        Math.sin(
          (vertexX[a] + vertexX[b] + vertexX[c]) * 0.0045 +
            time * 0.24 +
            cellNoiseValue * 5.2,
        ) + 1
      ) * 0.5;
      const accentMix = clamp(
        0.02 + accentPulse * 0.03 + Math.abs(cellNoiseValue) * 0.016,
        0,
        0.06,
      );
      let blended = mixColor(baseColor, accentRgb, accentMix);

      const cx = (vertexX[a] + vertexX[b] + vertexX[c]) / 3;
      const cy = (vertexY[a] + vertexY[b] + vertexY[c]) / 3;
      const crest = clamp((heightNorm - 0.48) / 0.52, 0, 1);
      const upperBand = clamp(1 - cy / Math.max(cssHeight, 1), 0, 1);
      const reflectionBand = Math.max(
        0,
        Math.sin(cx * 0.009 - cy * 0.012 - time * 0.34 + cellNoiseValue * 1.7),
      );
      const reflectionSharp = Math.pow(reflectionBand, 6.5);
      const reflectionFlow = 0.55 + 0.45 * Math.sin(time * 0.12 + cx * 0.0012);
      const sunMix = clamp(
        reflectionSharp * (0.05 + crest * 0.2) * (0.25 + upperBand * 0.75) * reflectionFlow,
        0,
        0.24,
      );

      if (sunMix > 0.001) {
        const warmBase = mixColor(sunOrangeRgb, sunGoldRgb, clamp(upperBand * 0.72 + 0.2, 0, 1));
        const warmTint = mixColor(
          warmBase,
          sunRoseRgb,
          clamp((1 - upperBand) * 0.42 + (1 - crest) * 0.08, 0, 1),
        );
        blended = mixColor(blended, warmTint, sunMix);
      }

      const light = getLight(a, b, c);
      const brightness = clamp(
        0.86 + light * 0.2 + cellNoiseValue * 0.018 + reflectionSharp * 0.08,
        0.78,
        1.1,
      );
      const shaded = scaleColor(blended, brightness);

      ctx.beginPath();
      ctx.moveTo(vertexX[a], vertexY[a]);
      ctx.lineTo(vertexX[b], vertexY[b]);
      ctx.lineTo(vertexX[c], vertexY[c]);
      ctx.closePath();
      ctx.fillStyle = rgbToString(shaded);
      ctx.fill();
    };

    const drawFrame = (timestampMs: number): void => {
      const motionFactor = prefersReducedMotion ? motionSlowdown : 1;
      const t = (timestampMs * 0.001) * motionFactor;

      if (backgroundGradient) {
        ctx.fillStyle = backgroundGradient;
        ctx.fillRect(0, 0, cssWidth, cssHeight);
      } else {
        ctx.clearRect(0, 0, cssWidth, cssHeight);
      }

      for (let row = 0; row <= rows; row += 1) {
        const gridY = (row - 3) * safeTile;
        for (let col = 0; col <= columns; col += 1) {
          const index = row * (columns + 1) + col;
          const gridX = (col - 3) * safeTile;
          const phase = vertexPhase[index];
          const heightValue = computeHeight(gridX, gridY, t, phase);

          const projectedX = gridX + gridY * projectionSkew - skewOffsetX;
          const projectedY = gridY * projectionYScale;

          vertexX[index] = projectedX + heightValue * 0.2;
          vertexY[index] = projectedY + heightValue * 0.42;
          vertexZ[index] = heightValue;
        }
      }

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          const a = row * (columns + 1) + col;
          const b = a + 1;
          const c = a + (columns + 1);
          const d = c + 1;
          const noise = cellNoise[row * columns + col];
          const depthRatio = row / Math.max(1, rows - 1);

          if (((row + col) & 1) === 0) {
            drawTriangle(a, b, c, noise, depthRatio, t);
            drawTriangle(b, d, c, noise * 0.8, depthRatio, t);
          } else {
            drawTriangle(a, b, d, noise, depthRatio, t);
            drawTriangle(a, d, c, noise * 0.8, depthRatio, t);
          }
        }
      }
    };

    const animate = (timestampMs: number): void => {
      if (lastFrame === 0) {
        lastFrame = timestampMs;
      }

      const elapsed = timestampMs - lastFrame;
      if (elapsed >= frameInterval) {
        lastFrame = timestampMs - (elapsed % frameInterval);
        drawFrame(timestampMs);
      }
      rafId = window.requestAnimationFrame(animate);
    };

    const startAnimation = (): void => {
      if (rafId !== null || isStaticMode()) {
        return;
      }
      lastFrame = 0;
      rafId = window.requestAnimationFrame(animate);
    };

    const stopAnimation = (): void => {
      if (rafId === null) {
        return;
      }
      window.cancelAnimationFrame(rafId);
      rafId = null;
    };

    const redrawStatic = (): void => {
      drawFrame(performance.now());
    };

    const handleVisibility = (): void => {
      if (!pauseWhenHidden) {
        return;
      }
      if (document.hidden) {
        stopAnimation();
      } else if (isStaticMode()) {
        redrawStatic();
      } else {
        startAnimation();
      }
    };

    const handleMotionChange = (event: MediaQueryListEvent): void => {
      prefersReducedMotion = event.matches;
      if (isStaticMode()) {
        stopAnimation();
        redrawStatic();
        return;
      }
      if (!document.hidden || !pauseWhenHidden) {
        startAnimation();
      }
    };

    resizeCanvas();
    redrawStatic();

    if (!isStaticMode()) {
      startAnimation();
    }

    let resizeObserver: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
        if (isStaticMode()) {
          redrawStatic();
        }
      });
      resizeObserver.observe(root);
    }

    const handleWindowResize = (): void => {
      resizeCanvas();
      if (isStaticMode()) {
        redrawStatic();
      }
    };

    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('visibilitychange', handleVisibility);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      stopAnimation();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, [
    detailStrength,
    dprCap,
    driftSpeed,
    mergedScheme,
    pauseWhenHidden,
    reducedMotionMode,
    targetFps,
    tileSize,
    waveHeight,
    waveSpeed,
  ]);

  const style: CSSProperties = {
    zIndex,
    opacity,
  };

  const rootClassName = ['digital-wave-bg', className].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={rootClassName} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="digital-wave-canvas" />
      <div className="digital-wave-veil" style={{ opacity: veilOpacity }} />
    </div>
  );
}
