"use client";

import { useEffect, useState } from "react";

export function TalkRatio({
  rep,
  prospect,
}: {
  rep: number;
  prospect: number;
}) {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(rep), 100);
    return () => clearTimeout(timer);
  }, [rep]);

  const insight =
    prospect >= 60
      ? "Great discovery ratio — the prospect did most of the talking"
      : prospect >= 45
        ? "Balanced conversation — good give-and-take"
        : "The rep dominated the conversation — consider asking more open questions";

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Talk Ratio</h3>

      <div className="h-10 rounded-lg overflow-hidden flex">
        <div
          className="flex items-center justify-center transition-all duration-1000 ease-out"
          style={{
            width: `${animatedWidth}%`,
            backgroundColor: "#D4735E",
          }}
        >
          {rep >= 15 && (
            <span className="text-xs font-semibold text-white">{rep}%</span>
          )}
        </div>
        <div
          className="flex items-center justify-center transition-all duration-1000 ease-out"
          style={{
            width: `${100 - animatedWidth}%`,
            backgroundColor: "#0C7489",
          }}
        >
          {prospect >= 15 && (
            <span className="text-xs font-semibold text-white">
              {prospect}%
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-2">
        <span className="text-xs text-secondary font-medium">Rep</span>
        <span className="text-xs text-primary font-medium">Prospect</span>
      </div>

      <p className="text-xs text-muted-foreground mt-3">{insight}</p>
    </div>
  );
}
