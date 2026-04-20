import { useState, useEffect } from 'react';

interface CountdownProps {
  resolveAt: number;
}

function formatCountdown(resolveAt: number): string {
  const diff = resolveAt - Date.now() / 1000;
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
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    function tick() {
      setDisplay(formatCountdown(resolveAt));
      const diff = resolveAt - Date.now() / 1000;
      setIsUrgent(diff > 0 && diff < 3600);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [resolveAt]);

  return (
    <span className={isUrgent ? 'text-warning font-bold' : ''} aria-label={`Time remaining: ${display}`}>
      {display}
    </span>
  );
}
