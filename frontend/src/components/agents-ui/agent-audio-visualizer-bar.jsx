import React, { useMemo, useEffect, useState, useRef } from 'react';
import { cn } from '../../lib/utils';

export function AgentAudioVisualizerBar({
  size = 'xl',
  state = 'listening',
  color = '#E2E8F0',
  barCount = 5,
  volume = 0,
  className,
}) {
  const [animIndex, setAnimIndex] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    let startTime = performance.now();
    const interval = state === 'thinking' ? 140 : state === 'listening' ? 400 : 250;

    const animate = (time) => {
      if (time - startTime >= interval) {
        setAnimIndex((prev) => prev + 1);
        startTime = time;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [state]);

  const bands = useMemo(() => {
    const center = Math.floor(barCount / 2);
    return Array.from({ length: barCount }, (_, i) => {
      const dist = Math.abs(i - center);
      const weight = 1 - dist * 0.22;

      let fraction = 0.15;
      let active = false;

      if (state === 'speaking') {
        const wave = Math.sin(animIndex * 0.35 + i * 0.8) * 0.5 + 0.5;
        fraction = Math.max(0.2, (0.3 + wave * 0.7) * (0.3 + volume * 2.0) * weight);
        active = true;
      } else if (state === 'listening') {
        active = dist === 0 || (animIndex % 2 === 0 && dist === 1);
        fraction = Math.max(0.18, (0.2 + volume * 2.2) * weight);
      } else if (state === 'thinking') {
        active = (animIndex % barCount) === i;
        fraction = active ? 0.6 : 0.2;
      }

      return { fraction: Math.min(1, Math.max(0.12, fraction)), active };
    });
  }, [barCount, state, volume, animIndex]);

  const heightClass = size === 'sm' ? 'h-14 gap-1' : size === 'lg' ? 'h-56 gap-4' : 'h-72 sm:h-80 gap-5 sm:gap-7';
  const widthClass = size === 'sm' ? 'w-2 min-h-2' : size === 'lg' ? 'w-8 min-h-8' : 'w-11 sm:w-14 min-h-11 sm:min-h-14';

  return (
    <div className={cn('relative flex items-center justify-center select-none', heightClass, className)}>
      {bands.map((b, i) => (
        <div
          key={i}
          style={{
            height: `${b.fraction * 100}%`,
            backgroundColor: color,
            opacity: b.active ? 0.95 : 0.28,
            boxShadow: b.active ? `0 0 24px ${color}66` : 'none',
          }}
          className={cn('rounded-full transition-all duration-150 ease-out', widthClass)}
        />
      ))}
    </div>
  );
}
