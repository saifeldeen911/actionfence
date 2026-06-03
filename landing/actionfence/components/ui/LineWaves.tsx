"use client";

import { useEffect, useRef, useState } from 'react';

interface LineWavesProps {
  speed?: number;
  innerLineCount?: number;
  outerLineCount?: number;
  warpIntensity?: number;
  rotation?: number;
  edgeFadeWidth?: number;
  colorCycleSpeed?: number;
  brightness?: number;
  color1?: string;
  color2?: string;
  color3?: string;
  enableMouseInteraction?: boolean;
  mouseInfluence?: number;
  className?: string;
}

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ];
}

const vertexShaderSource = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uSpeed;
uniform float uInnerLines;
uniform float uOuterLines;
uniform float uWarpIntensity;
uniform float uRotation;
uniform float uEdgeFadeWidth;
uniform float uColorCycleSpeed;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform bool uEnableMouse;

varying vec2 vUv;

#define HALF_PI 1.5707963

float hashF(float n) {
  return fract(sin(n * 127.1) * 43758.5453123);
}

float smoothNoise(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hashF(i), hashF(i + 1.0), u);
}

float displaceA(float coord, float t) {
  float result = sin(coord * 2.123) * 0.2;
  result += sin(coord * 3.234 + t * 4.345) * 0.1;
  result += sin(coord * 0.589 + t * 0.934) * 0.5;
  return result;
}

float displaceB(float coord, float t) {
  float result = sin(coord * 1.345) * 0.3;
  result += sin(coord * 2.734 + t * 3.345) * 0.2;
  result += sin(coord * 0.189 + t * 0.934) * 0.3;
  return result;
}

vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

void main() {
  vec2 coords = gl_FragCoord.xy / uResolution.xy;
  coords = coords * 2.0 - 1.0;
  coords = rotate2D(coords, uRotation);

  float halfT = uTime * uSpeed * 0.5;
  float fullT = uTime * uSpeed;

  float mouseWarp = 0.0;
  if (uEnableMouse) {
    vec2 mPos = rotate2D(uMouse * 2.0 - 1.0, uRotation);
    float mDist = length(coords - mPos);
    mouseWarp = uMouseInfluence * exp(-mDist * mDist * 4.0);
  }

  float warpAx = coords.x + displaceA(coords.y, halfT) * uWarpIntensity + mouseWarp;
  float warpAy = coords.y - displaceA(coords.x * cos(fullT) * 1.235, halfT) * uWarpIntensity;
  float warpBx = coords.x + displaceB(coords.y, halfT) * uWarpIntensity + mouseWarp;
  float warpBy = coords.y - displaceB(coords.x * sin(fullT) * 1.235, halfT) * uWarpIntensity;

  vec2 fieldA = vec2(warpAx, warpAy);
  vec2 fieldB = vec2(warpBx, warpBy);
  vec2 blended = mix(fieldA, fieldB, mix(fieldA, fieldB, 0.5));

  float fadeTop = smoothstep(uEdgeFadeWidth, uEdgeFadeWidth + 0.4, blended.y);
  float fadeBottom = smoothstep(-uEdgeFadeWidth, -(uEdgeFadeWidth + 0.4), blended.y);
  float vMask = 1.0 - max(fadeTop, fadeBottom);

  float tileCount = mix(uOuterLines, uInnerLines, vMask);
  float scaledY = blended.y * tileCount;
  float nY = smoothNoise(abs(scaledY));

  float ridge = pow(
    step(abs(nY - blended.x) * 2.0, HALF_PI) * cos(2.0 * (nY - blended.x)),
    5.0
  );

  float lines = 0.0;
  for (float i = 1.0; i < 3.0; i += 1.0) {
    lines += pow(max(fract(scaledY), fract(-scaledY)), i * 2.0);
  }

  float pattern = vMask * lines;

  float cycleT = fullT * uColorCycleSpeed;
  float rChannel = (pattern + lines * ridge) * (cos(blended.y + cycleT * 0.234) * 0.5 + 1.0);
  float gChannel = (pattern + vMask * ridge) * (sin(blended.x + cycleT * 1.745) * 0.5 + 1.0);
  float bChannel = (pattern + lines * ridge) * (cos(blended.x + cycleT * 0.534) * 0.5 + 1.0);

  vec3 col = (rChannel * uColor1 + gChannel * uColor2 + bChannel * uColor3) * uBrightness;
  float alpha = clamp(length(col), 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null {
  const vs = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export default function LineWaves({
  speed = 0.2, // Subtle, slow waving
  innerLineCount = 36.0,
  outerLineCount = 40.0,
  warpIntensity = 0.8,
  rotation = -30,
  edgeFadeWidth = 0.1,
  colorCycleSpeed = 0.4,
  brightness = 0.35,
  color1 = '#3f3f46', // Muted zinc-700
  color2 = '#52525b', // Muted zinc-600
  color3 = '#27272a', // Muted zinc-800
  enableMouseInteraction = true,
  mouseInfluence = 1.8,
  className = ''
}: LineWavesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRunWebGl, setShouldRunWebGl] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCompactViewport = window.matchMedia('(max-width: 767px)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

    if (prefersReducedMotion || isCompactViewport || saveData) {
      return;
    }

    const win = window as Window & typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (win.requestIdleCallback) {
      const idleId = win.requestIdleCallback(() => setShouldRunWebGl(true), { timeout: 1800 });
      return () => win.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(() => setShouldRunWebGl(true), 900);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!shouldRunWebGl) return;
    if (!containerRef.current) return;
    const container = containerRef.current;
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
               canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false }) as WebGLRenderingContext;
    if (!gl) {
      console.error('WebGL not supported');
      container.removeChild(canvas);
      return;
    }

    gl.clearColor(0, 0, 0, 0);

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!program) {
      container.removeChild(canvas);
      return;
    }

    gl.useProgram(program);

    // Setup full-screen quad
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Get Uniform Locations
    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
    const uSpeedLoc = gl.getUniformLocation(program, 'uSpeed');
    const uInnerLinesLoc = gl.getUniformLocation(program, 'uInnerLines');
    const uOuterLinesLoc = gl.getUniformLocation(program, 'uOuterLines');
    const uWarpIntensityLoc = gl.getUniformLocation(program, 'uWarpIntensity');
    const uRotationLoc = gl.getUniformLocation(program, 'uRotation');
    const uEdgeFadeWidthLoc = gl.getUniformLocation(program, 'uEdgeFadeWidth');
    const uColorCycleSpeedLoc = gl.getUniformLocation(program, 'uColorCycleSpeed');
    const uBrightnessLoc = gl.getUniformLocation(program, 'uBrightness');
    const uColor1Loc = gl.getUniformLocation(program, 'uColor1');
    const uColor2Loc = gl.getUniformLocation(program, 'uColor2');
    const uColor3Loc = gl.getUniformLocation(program, 'uColor3');
    const uMouseLoc = gl.getUniformLocation(program, 'uMouse');
    const uMouseInfluenceLoc = gl.getUniformLocation(program, 'uMouseInfluence');
    const uEnableMouseLoc = gl.getUniformLocation(program, 'uEnableMouse');

    const currentMouse = [0.5, 0.5];
    let targetMouse = [0.5, 0.5];

    const resize = () => {
      const displayWidth = container.clientWidth;
      const displayHeight = container.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };
    window.addEventListener('resize', resize);
    resize();

    let animationFrameId: number;

    const render = (time: number) => {
      animationFrameId = requestAnimationFrame(render);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Damp mouse coordinates
      if (enableMouseInteraction) {
        currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
      }

      // Convert rotation from degrees to radians
      const rotationRad = (rotation * Math.PI) / 180;

      // Set Uniforms
      gl.uniform1f(uTimeLoc, time * 0.001);
      gl.uniform3f(uResolutionLoc, canvas.width, canvas.height, canvas.width / canvas.height);
      gl.uniform1f(uSpeedLoc, speed);
      gl.uniform1f(uInnerLinesLoc, innerLineCount);
      gl.uniform1f(uOuterLinesLoc, outerLineCount);
      gl.uniform1f(uWarpIntensityLoc, warpIntensity);
      gl.uniform1f(uRotationLoc, rotationRad);
      gl.uniform1f(uEdgeFadeWidthLoc, edgeFadeWidth);
      gl.uniform1f(uColorCycleSpeedLoc, colorCycleSpeed);
      gl.uniform1f(uBrightnessLoc, brightness);
      gl.uniform3fv(uColor1Loc, hexToVec3(color1));
      gl.uniform3fv(uColor2Loc, hexToVec3(color2));
      gl.uniform3fv(uColor3Loc, hexToVec3(color3));
      gl.uniform2f(uMouseLoc, currentMouse[0], currentMouse[1]);
      gl.uniform1f(uMouseInfluenceLoc, mouseInfluence);
      gl.uniform1i(uEnableMouseLoc, enableMouseInteraction ? 1 : 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    animationFrameId = requestAnimationFrame(render);

    const handlePointerMove = (e: PointerEvent) => {
      if (!enableMouseInteraction) return;
      const rect = container.getBoundingClientRect();
      targetMouse = [
        (e.clientX - rect.left) / rect.width,
        1.0 - (e.clientY - rect.top) / rect.height
      ];
    };

    const handlePointerLeave = () => {
      targetMouse = [0.5, 0.5];
    };

    window.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [
    shouldRunWebGl,
    speed,
    innerLineCount,
    outerLineCount,
    warpIntensity,
    rotation,
    edgeFadeWidth,
    colorCycleSpeed,
    brightness,
    color1,
    color2,
    color3,
    enableMouseInteraction,
    mouseInfluence
  ]);

  return (
    <div ref={containerRef} className={`w-full h-full relative overflow-hidden ${className}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(125deg,transparent_0%,rgba(124,131,255,0.28)_28%,rgba(63,63,70,0.18)_46%,transparent_68%),repeating-linear-gradient(125deg,rgba(124,131,255,0.16)_0_1px,transparent_1px_9px)] opacity-80 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_42%,transparent_78%)]"
      />
    </div>
  );
}
