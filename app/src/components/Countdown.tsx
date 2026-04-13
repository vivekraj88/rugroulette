import { useState, useEffect } from 'react';

interface CountdownProps {
  resolveAt: number;
}

function formatCountdown(resolveAt: number): string {
  const now = Date.now() / 1000;
  const diff = resolveAt - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400);
  const hrs = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = Math.floor(diff % 60);

  if (days > 0) return `${days}d ${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

export function Countdown({ resolveAt }: CountdownProps) {
  const [display, setDisplay] = useState(() => formatCountdown(resolveAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(formatCountdown(resolveAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [resolveAt]);

  const now = Date.now() / 1000;
  const diff = resolveAt - now;
  const isUrgent = diff > 0 && diff < 3600;

  return (
    <span className={isUrgent ? 'text-yellow-400 font-bold' : ''}>
      {display}
    </span>
  );
}
