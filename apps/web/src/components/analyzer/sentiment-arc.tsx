"use client";

import { useState } from "react";
import type { SentimentPoint } from "@/lib/analysis/types";

export function SentimentArc({ data }: { data: SentimentPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) return null;

  const width = 600;
  const height = 200;
  const padX = 40;
  const padY = 30;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  function toX(pos: number) {
    return padX + (pos / 100) * chartW;
  }
  function toY(sent: number) {
    return padY + ((1 - sent) / 2) * chartH;
  }

  // Build smooth path
  const points = data.map((d) => ({ x: toX(d.position), y: toY(d.sentiment) }));
  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const cpx = (prev.x + curr.x) / 2;
    path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Fill area path
  const fillPath = `${path} L ${points[points.length - 1]!.x} ${toY(0)} L ${points[0]!.x} ${toY(0)} Z`;

  const zeroY = toY(0);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Buyer Sentiment Arc
      </h3>
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minWidth: 500 }}
        >
          {/* Positive background */}
          <rect
            x={padX}
            y={padY}
            width={chartW}
            height={chartH / 2}
            fill="#2D8A4E"
            opacity={0.04}
          />
          {/* Negative background */}
          <rect
            x={padX}
            y={padY + chartH / 2}
            width={chartW}
            height={chartH / 2}
            fill="#C74B3B"
            opacity={0.04}
          />

          {/* Grid lines */}
          {[-0.5, 0, 0.5].map((v) => (
            <line
              key={v}
              x1={padX}
              y1={toY(v)}
              x2={padX + chartW}
              y2={toY(v)}
              stroke="#E8E5E0"
              strokeWidth={v === 0 ? 1.5 : 0.5}
              strokeDasharray={v === 0 ? "none" : "4 4"}
            />
          ))}

          {/* Fill under curve */}
          <path d={fillPath} fill="#0C7489" opacity={0.06} />

          {/* Main curve */}
          <path
            d={path}
            fill="none"
            stroke="#0C7489"
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle
                cx={toX(d.position)}
                cy={toY(d.sentiment)}
                r={hoveredIdx === i ? 6 : 4}
                fill={d.sentiment >= 0 ? "#2D8A4E" : "#C74B3B"}
                stroke="white"
                strokeWidth={2}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          ))}

          {/* Axis labels */}
          <text
            x={padX - 4}
            y={padY + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={9}
          >
            Positive
          </text>
          <text
            x={padX - 4}
            y={padY + chartH}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={9}
          >
            Negative
          </text>
          <text
            x={padX + chartW}
            y={height - 6}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={9}
          >
            Conversation Progress →
          </text>
        </svg>

        {/* Tooltip */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="absolute bg-card border border-border rounded-lg shadow-lg p-3 text-xs z-10 max-w-[220px] pointer-events-none"
            style={{
              left: `${(toX(data[hoveredIdx]!.position) / width) * 100}%`,
              top: `${(toY(data[hoveredIdx]!.sentiment) / height) * 100 - 15}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-semibold text-foreground">
              {data[hoveredIdx]!.label}
            </p>
            <p className="text-muted-foreground italic mt-1">
              &ldquo;{data[hoveredIdx]!.quote}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
