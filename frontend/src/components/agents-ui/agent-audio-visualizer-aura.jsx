import React, { useEffect, useRef, useMemo } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const AgentAudioVisualizerAuraVariants = cva('relative aspect-square flex items-center justify-center', {
  variants: {
    size: {
      icon: 'w-6 h-6',
      sm: 'w-16 h-16',
      md: 'w-36 h-36',
      lg: 'w-72 h-72',
      xl: 'w-80 h-80 sm:w-[420px] sm:h-[420px]',
    },
  },
  defaultVariants: {
    size: 'xl',
  },
});

function hexToRgb(hexColor) {
  try {
    const rgbColor = hexColor.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
    if (rgbColor) {
      const [, r, g, b] = rgbColor;
      return [parseInt(r, 16) / 255, parseInt(g, 16) / 255, parseInt(b, 16) / 255];
    }
  } catch (e) {
    // fallback
  }
  return [0.89, 0.91, 0.94]; // Elegant Platinum Gray (#E2E8F0)
}

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uColorShift;
uniform float uMix;

const float TAU = 6.28318530718;

// Ultra-fine high-frequency dither
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Crisp tone mapping
vec3 Tonemap(vec3 x) {
  x *= 2.8;
  return x / (1.0 + x * 0.8);
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

// High-fidelity turbulence displacement
vec2 turb(vec2 pos, float t, float it) {
  mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);
  mat2 layerRotation = mat2(0.7071, -0.7071, 0.7071, 0.7071);
  
  float frequency = mix(2.5, 12.0, uFrequency);
  float amplitude = uAmplitude;
  float frequencyGrowth = 1.35;
  float animTime = t * 0.12 * uSpeed;
  
  for(int i = 0; i < 4; i++) {
    vec2 rotatedPos = pos * rotation;
    vec2 wave = sin(frequency * rotatedPos + float(i) * animTime + it);
    pos += (amplitude / frequency) * rotation[0] * wave;
    rotation *= layerRotation;
    amplitude *= mix(1.0, max(wave.x, wave.y), 0.15);
    frequency *= frequencyGrowth;
  }
  return pos;
}

const float ITERATIONS = 48.0;

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / iResolution.xy;
  
  vec3 pp = vec3(0.0);
  vec3 bloom = vec3(0.0);
  float t = iTime * 0.6;
  vec2 pos = uv - 0.5;
  
  // Aspect ratio correction to keep perfectly round on all screens
  pos.x *= iResolution.x / iResolution.y;
      
  vec2 prevPos = turb(pos, t, 0.0 - 1.0 / ITERATIONS);
  float spacing = mix(1.0, TAU, 0.45);

  for(float i = 1.0; i <= ITERATIONS; i++) {
    float iter = i / ITERATIONS;
    vec2 st = turb(pos, t, iter * spacing);
    float d = abs(length(st) - uScale);
    float pd = distance(st, prevPos);
    prevPos = st;
    
    // Crisp sub-pixel edge definition
    float dynamicBlur = exp2(pd * 1.6) - 1.0;
    float ds = smoothstep(0.0, 0.022 + dynamicBlur * 0.08, d);
    
    // Subtle platinum / silver gradient variation
    vec3 color = uColor;
    float shade = mix(0.75, 1.25, iter);
    color *= shade;
    
    float invd = 1.0 / max(d * 1.5 + dynamicBlur * 0.6, 0.003);
    pp += (ds - 1.0) * color;
    bloom += clamp(invd * 0.4, 0.0, 180.0) * color;
  }

  pp *= (1.0 / ITERATIONS);
  bloom = bloom / (bloom + 8500.0);
  
  vec3 color = (-pp * 1.1 + bloom * 2.2) * 1.35;
  
  // Add subtle sub-pixel dither to eliminate banding entirely
  color += (hash(fragCoord + t) - 0.5) / 255.0;
  color = Tonemap(color);
  
  float alpha = smoothstep(0.02, 0.95, luma(color)) * uMix;
  
  gl_FragColor = vec4(color * uMix, alpha);
}
`;

export function AgentAudioVisualizerAura({
  size = 'xl',
  state = 'speaking', // 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error'
  color = '#E2E8F0', // Sleek Platinum / Silver Gray
  colorShift = 0.1,
  volume = 0,
  themeMode = 'dark',
  className,
  style,
  ...props
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const startTimeRef = useRef(performance.now());
  const rgbColor = useMemo(() => hexToRgb(color), [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });
    if (!gl) return;

    // Compile helper
    const createShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Quad buffer
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const iResLoc = gl.getUniformLocation(program, 'iResolution');
    const iTimeLoc = gl.getUniformLocation(program, 'iTime');
    const uColorLoc = gl.getUniformLocation(program, 'uColor');
    const uSpeedLoc = gl.getUniformLocation(program, 'uSpeed');
    const uScaleLoc = gl.getUniformLocation(program, 'uScale');
    const uFreqLoc = gl.getUniformLocation(program, 'uFrequency');
    const uAmpLoc = gl.getUniformLocation(program, 'uAmplitude');
    const uShiftLoc = gl.getUniformLocation(program, 'uColorShift');
    const uMixLoc = gl.getUniformLocation(program, 'uMix');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const render = () => {
      // 2x Retina Supersampling for Ultra-HD Razor Sharp Render
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      const elapsed = (performance.now() - startTimeRef.current) / 1000;

      // Dynamics based on state & volume
      let speed = 1.0;
      let scale = 0.23;
      let amplitude = 0.48;
      let frequency = 0.55;
      let brightness = 1.35;

      if (state === 'speaking') {
        speed = 2.2;
        scale = 0.23 + volume * 0.12;
        amplitude = 0.55 + volume * 0.45;
        frequency = 0.8 + volume * 0.35;
        brightness = 1.55;
      } else if (state === 'listening') {
        speed = 1.3;
        scale = 0.23 + volume * 0.1;
        amplitude = 0.45 + volume * 0.35;
        frequency = 0.6;
        brightness = 1.35;
      } else if (state === 'thinking') {
        speed = 1.9;
        scale = 0.21;
        amplitude = 0.38;
        frequency = 0.95;
        brightness = 1.25;
      } else {
        // Idle
        speed = 0.75;
        scale = 0.21;
        amplitude = 0.32;
        frequency = 0.45;
        brightness = 1.0;
      }

      gl.uniform2f(iResLoc, canvas.width, canvas.height);
      gl.uniform1f(iTimeLoc, elapsed);
      gl.uniform3fv(uColorLoc, rgbColor);
      gl.uniform1f(uSpeedLoc, speed);
      gl.uniform1f(uScaleLoc, scale);
      gl.uniform1f(uFreqLoc, frequency);
      gl.uniform1f(uAmpLoc, amplitude);
      gl.uniform1f(uShiftLoc, colorShift);
      gl.uniform1f(uMixLoc, brightness);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [state, rgbColor, colorShift, volume]);

  return (
    <div
      data-lk-state={state}
      className={cn(AgentAudioVisualizerAuraVariants({ size }), className)}
      style={style}
      {...props}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
