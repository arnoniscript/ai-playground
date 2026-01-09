"use client";

import { useState, useEffect, useRef } from "react";

interface TimeTrackerProps {
  onTimeUpdate?: (seconds: number) => void;
  isPaid: boolean;
}

export default function TimeTracker({
  onTimeUpdate,
  isPaid,
}: TimeTrackerProps) {
  const [timeSpent, setTimeSpent] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPaid) return;

    const handleVisibilityChange = () => {
      setIsActive(!document.hidden);
    };

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPaid]);

  useEffect(() => {
    if (!isPaid || !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start timer
    intervalRef.current = setInterval(() => {
      setTimeSpent((prev) => {
        const newTime = prev + 1;
        onTimeUpdate?.(newTime);
        return newTime;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaid, isActive, onTimeUpdate]);

  if (!isPaid) return null;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-600 shadow-xl rounded-xl px-6 py-3 flex items-center gap-3 z-50 border-2 border-white">
      <div
        className={`w-3 h-3 rounded-full ${
          isActive ? "bg-white animate-pulse shadow-lg" : "bg-gray-300"
        }`}
      />
      <div className="text-base">
        <span className="text-white font-medium">⏱️ Tempo: </span>
        <span className="font-mono font-bold text-white text-lg">
          {formatTime(timeSpent)}
        </span>
      </div>
      {!isActive && (
        <span className="text-sm text-yellow-200 font-medium bg-yellow-600 bg-opacity-40 px-2 py-0.5 rounded">
          PAUSADO
        </span>
      )}
    </div>
  );
}
