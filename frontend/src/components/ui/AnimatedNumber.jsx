import React, { useEffect, useState } from 'react';

/**
 * Animated numeric counter component for telemetry metrics.
 * Runs smoothly via requestAnimationFrame with easeOutExpo easing.
 */
export const AnimatedNumber = ({ value, duration = 800, decimals = 0, suffix = '', prefix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = typeof value === 'number' && !isNaN(value) ? value : 0;
    const startTime = performance.now();
    let animId;

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = target * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(update);
      } else {
        setDisplayValue(target);
      }
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
};
