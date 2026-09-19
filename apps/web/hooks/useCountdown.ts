'use client';

import { useEffect, useRef, useState } from 'react';

export interface CountdownState {
  minutes: string;
  seconds: string;
  milliseconds: string;
  totalMs: number;
  isExpired: boolean;
  isEndingSoon: boolean;
  isCritical: boolean;
  progressPercent: number;
}

export function useCountdown(endTimeMs: number, totalDurationMs: number = 120000): CountdownState {
  const [countdown, setCountdown] = useState<CountdownState>({
    minutes: '00',
    seconds: '00',
    milliseconds: '000',
    totalMs: 0,
    isExpired: false,
    isEndingSoon: false,
    isCritical: false,
    progressPercent: 100,
  });

  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateTicker = () => {
      const now = Date.now();
      const diff = Math.max(0, endTimeMs - now);

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const ms = diff % 1000;

      const formattedMins = String(mins).padStart(2, '0');
      const formattedSecs = String(secs).padStart(2, '0');
      const formattedMs = String(ms).padStart(3, '0');

      const isExpired = diff <= 0;
      const isEndingSoon = diff <= 30000 && !isExpired; // <= 30s
      const isCritical = diff <= 10000 && !isExpired; // <= 10s

      const progress = Math.min(100, Math.max(0, (diff / totalDurationMs) * 100));

      setCountdown({
        minutes: formattedMins,
        seconds: formattedSecs,
        milliseconds: formattedMs,
        totalMs: diff,
        isExpired,
        isEndingSoon,
        isCritical,
        progressPercent: progress,
      });

      if (!isExpired) {
        animFrameRef.current = requestAnimationFrame(updateTicker);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateTicker);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [endTimeMs, totalDurationMs]);

  return countdown;
}
