import { useEffect, useRef } from 'react';

interface BalatroProps {
  spinRotation?: number;
  spinSpeed?: number;
  offset?: [number, number];
  color1?: string;
  color2?: string;
  color3?: string;
  contrast?: number;
  lighting?: number;
  spinAmount?: number;
  pixelFilter?: number;
  spinEase?: number;
  isRotate?: boolean;
  mouseInteraction?: boolean;
  className?: string;
}

function hexToVec4(hex: string): [number, number, number, number] {
  const hexStr = hex.replace('#', '');
  let r = 0, g = 0, b = 0, a = 1;
  if (hexStr.length === 6) {
    r = parseInt(hexStr.slice(0, 2), 16) / 255;
    g = parseInt(hexStr.slice(2, 4), 16) / 255;
    b = parseInt(hexStr.slice(4, 6), 16) / 255;
  } else if (hexStr.length === 8) {
    r = parseInt(hexStr.slice(0, 2), 16) / 255;
    g = parseInt(hexStr.slice(2, 4), 16) / 255;
    b = parseInt(hexStr.slice(4, 6), 16) / 255;
    a = parseInt(hexStr.slice(6, 8), 16) / 255;
  }
  return [r, g, b, a];
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

#define PI 3.14159265359

uniform float iTime;
uniform vec3 iResolution;
uniform float uSpinRotation;
uniform float uSpinSpeed;
uniform vec2 uOffset;
uniform vec4 uColor1;
uniform vec4 uColor2;
uniform vec4 uColor3;
uniform float uContrast;
uniform float uLighting;
uniform float uSpinAmount;
uniform float uPixelFilter;
uniform float uSpinEase;
uniform bool uIsRotate;
uniform vec2 uMouse;

varying vec2 vUv;

vec4 effect(vec2 screenSize, vec2 screen_coords) {
    float pixel_size = length(screenSize.xy) / uPixelFilter;
    vec2 uv = (floor(screen_coords.xy * (1.0 / pixel_size)) * pixel_size - 0.5 * screenSize.xy) / length(screenSize.xy) - uOffset;
    float uv_len = length(uv);
    
    float speed = (uSpinRotation * uSpinEase * 0.2);
    if(uIsRotate){
       speed = iTime * speed;
    }
    speed += 302.2;
    
    float mouseInfluence = (uMouse.x * 2.0 - 1.0);
    speed += mouseInfluence * 0.1;
    
    float new_pixel_angle = atan(uv.y, uv.x) + speed - uSpinEase * 20.0 * (uSpinAmount * uv_len + (1.0 - uSpinAmount));
    vec2 mid = (screenSize.xy / length(screenSize.xy)) / 2.0;
    uv = (vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid);
    
    uv *= 30.0;
    float baseSpeed = iTime * uSpinSpeed;
    speed = baseSpeed + mouseInfluence * 2.0;
    
    vec2 uv2 = vec2(uv.x + uv.y);
    
    for(int i = 0; i < 5; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(
            cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
            sin(uv2.x - 0.113 * speed)
        );
        uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
    }
    
    float contrast_mod = (0.25 * uContrast + 0.5 * uSpinAmount + 1.2);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);
    float light = (uLighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + uLighting * max(c2p * 5.0 - 4.0, 0.0);
    
    return (0.3 / uContrast) * uColor1 + (1.0 - 0.3 / uContrast) * (uColor1 * c1p + uColor2 * c2p + vec4(c3p * uColor3.rgb, c3p * uColor1.a)) + light;
}

void main() {
    vec2 uv = vUv * iResolution.xy;
    gl_FragColor = effect(iResolution.xy, uv);
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

export default function Balatro({
  spinRotation = -2.0,
  spinSpeed = 4.0, // Muted speed to feel heavy and serious
  offset = [0.0, 0.0],
  color1 = '#09090b', // Deep zinc-950 base
  color2 = '#161619', // Slightly lighter zinc dark gray
  color3 = '#222226', // Muted charcoal for fluid waves
  contrast = 3.5,
  lighting = 0.3,
  spinAmount = 0.25,
  pixelFilter = 1000.0, // High filter for fine texture
  spinEase = 1.0,
  isRotate = false,
  mouseInteraction = true,
  className = ''
}: BalatroProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!program) return;

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
    const iTimeLoc = gl.getUniformLocation(program, 'iTime');
    const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
    const uSpinRotationLoc = gl.getUniformLocation(program, 'uSpinRotation');
    const uSpinSpeedLoc = gl.getUniformLocation(program, 'uSpinSpeed');
    const uOffsetLoc = gl.getUniformLocation(program, 'uOffset');
    const uColor1Loc = gl.getUniformLocation(program, 'uColor1');
    const uColor2Loc = gl.getUniformLocation(program, 'uColor2');
    const uColor3Loc = gl.getUniformLocation(program, 'uColor3');
    const uContrastLoc = gl.getUniformLocation(program, 'uContrast');
    const uLightingLoc = gl.getUniformLocation(program, 'uLighting');
    const uSpinAmountLoc = gl.getUniformLocation(program, 'uSpinAmount');
    const uPixelFilterLoc = gl.getUniformLocation(program, 'uPixelFilter');
    const uSpinEaseLoc = gl.getUniformLocation(program, 'uSpinEase');
    const uIsRotateLoc = gl.getUniformLocation(program, 'uIsRotate');
    const uMouseLoc = gl.getUniformLocation(program, 'uMouse');

    let currentMouse = [0.5, 0.5];

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
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Set Uniforms
      gl.uniform1f(iTimeLoc, time * 0.001);
      gl.uniform3f(iResolutionLoc, canvas.width, canvas.height, canvas.width / canvas.height);
      gl.uniform1f(uSpinRotationLoc, spinRotation);
      gl.uniform1f(uSpinSpeedLoc, spinSpeed);
      gl.uniform2f(uOffsetLoc, offset[0], offset[1]);
      gl.uniform4fv(uColor1Loc, hexToVec4(color1));
      gl.uniform4fv(uColor2Loc, hexToVec4(color2));
      gl.uniform4fv(uColor3Loc, hexToVec4(color3));
      gl.uniform1f(uContrastLoc, contrast);
      gl.uniform1f(uLightingLoc, lighting);
      gl.uniform1f(uSpinAmountLoc, spinAmount);
      gl.uniform1f(uPixelFilterLoc, pixelFilter);
      gl.uniform1f(uSpinEaseLoc, spinEase);
      gl.uniform1i(uIsRotateLoc, isRotate ? 1 : 0);
      gl.uniform2f(uMouseLoc, currentMouse[0], currentMouse[1]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    animationFrameId = requestAnimationFrame(render);

    const handlePointerMove = (e: PointerEvent) => {
      if (!mouseInteraction) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      currentMouse = [x, y];
    };

    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      container.removeChild(canvas);
    };
  }, [
    spinRotation,
    spinSpeed,
    offset,
    color1,
    color2,
    color3,
    contrast,
    lighting,
    spinAmount,
    pixelFilter,
    spinEase,
    isRotate,
    mouseInteraction
  ]);

  return <div ref={containerRef} className={`w-full h-full relative overflow-hidden ${className}`} />;
}
