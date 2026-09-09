"use client";

import { useEffect, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number; // ms
  suffix?: string;
  className?: string;
}

export default function AnimatedNumber({
  value,
  duration = 1200,
  suffix = "%",
  className = "",
}: AnimatedNumberProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Smooth cubic ease-out
      const easeOutValue = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOutValue * value));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };

    requestAnimationFrame(step);
  }, [value, duration]);

  return (
    <span className={className}>
      {count}
      {suffix}
    </span>
  );
}
