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

  const heightClass =
    size === 'sm'
      ? 'h-10 gap-1.5'
      : size === 'md'
      ? 'h-20 gap-2'
      : size === 'lg'
      ? 'h-32 sm:h-36 gap-2.5 sm:gap-3'
      : 'h-40 sm:h-48 gap-3 sm:gap-4';

  const widthClass =
    size === 'sm'
      ? 'w-1.5 min-h-[6px]'
      : size === 'md'
      ? 'w-2.5 min-h-[10px]'
      : size === 'lg'
      ? 'w-3.5 sm:w-4 min-h-[14px]'
      : 'w-4 sm:w-5 min-h-[16px]';

  return (
    <div
      className={cn(
        'relative flex items-center justify-center select-none max-w-full px-4 py-2',
        heightClass,
        className
      )}
    >
      {bands.map((b, i) => (
        <div
          key={i}
          style={{
            height: `${Math.max(12, b.fraction * 100)}%`,
            backgroundColor: color,
            opacity: b.active ? 0.95 : 0.35,
            boxShadow: b.active ? `0 0 20px ${color}80, 0 0 40px ${color}33` : 'none',
          }}
          className={cn('rounded-full transition-all duration-150 ease-out', widthClass)}
        />
      ))}
    </div>
  );
}
