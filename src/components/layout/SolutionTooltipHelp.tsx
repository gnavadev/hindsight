import React, { useState, useEffect, useRef } from "react";

interface SolutionTooltipHelpProps {
  onTooltipVisibilityChange?: (visible: boolean, height: number) => void;
}

const SolutionTooltipHelp: React.FC<SolutionTooltipHelpProps> = ({ onTooltipVisibilityChange }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onTooltipVisibilityChange) {
      let tooltipHeight = 0;
      if (tooltipRef.current && isTooltipVisible) {
        tooltipHeight = tooltipRef.current.offsetHeight + 10;
      }
      onTooltipVisibilityChange(isTooltipVisible, tooltipHeight);
    }
  }, [isTooltipVisible, onTooltipVisibilityChange]);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
    >
      <div className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors flex items-center justify-center cursor-help z-10">
        <span className="text-xs text-white/70">?</span>
      </div>

      {isTooltipVisible && (
        <div ref={tooltipRef} className="absolute top-full right-0 mt-2 w-80" style={{ zIndex: 100 }}>
          <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
            <div className="space-y-4">
              <h3 className="font-medium whitespace-nowrap">Keyboard Shortcuts</h3>
              <div className="space-y-3">
                {[
                  { label: "Toggle Window", keys: ["⌘", "B"], desc: "Show or hide this window." },
                  { label: "Take Screenshot", keys: ["⌘", "H"], desc: "Capture code or question for debugging help." },
                  { label: "Debug", keys: ["⌘", "↵"], desc: "Generate new solutions with all screenshots." },
                  { label: "Start Over", keys: ["⌘", "R"], desc: "Start fresh with a new question." }
                ].map((cmd, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="whitespace-nowrap">{cmd.label}</span>
                      <div className="flex gap-1">
                        {cmd.keys.map((k) => (
                          <span
                            key={k}
                            className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] leading-relaxed text-white/70 whitespace-nowrap truncate">
                      {cmd.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolutionTooltipHelp;
