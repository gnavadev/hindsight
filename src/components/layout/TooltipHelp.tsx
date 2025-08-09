import React, { useState, useEffect, useRef } from "react";
import { useTheme } from '../../contexts/ThemeContext';

interface TooltipHelpProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void;
}

const TooltipHelp: React.FC<TooltipHelpProps> = ({ onTooltipVisibilityChange }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const containerClasses = theme === 'osrs'
    ? "p-3 text-xs osrs-container rounded-lg shadow-lg"
    : "p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg";

  const headerClasses = theme === 'osrs' ? "osrs-tooltip-header" : "font-medium whitespace-nowrap";
  const tooltipbtnClasses =
    theme === "osrs"
      ? "osrs-toolbar-btn"
      : "w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors flex items-center justify-center cursor-help z-10";

  useEffect(() => {
    let tooltipHeight = 0;
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10;
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight);
  }, [isTooltipVisible, onTooltipVisibilityChange]);

  const handleMouseEnter = () => setIsTooltipVisible(true);
  const handleMouseLeave = () => setIsTooltipVisible(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Help Icon */}
      <div className={tooltipbtnClasses}>
        <span className="text-xs text-white/70">?</span>
      </div>

      {/* Tooltip Content */}
      {isTooltipVisible && (
        <div
          ref={tooltipRef}
          className="absolute top-full right-0 mt-2 w-80"
        >
        <div className={containerClasses}>
            <div className="space-y-4">
              <h3 className={headerClasses}>Keyboard Shortcuts</h3>
              <div className="space-y-3">
                {/* Toggle Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate">Toggle Window</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-xs leading-none">CTRL</span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-xs leading-none">B</span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-white/70">
                    Show or hide this window.
                  </p>
                </div>

                {/* Screenshot Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate">Take Screenshot</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-xs leading-none">CTRL</span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-xs leading-none">H</span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-white/70">
                    Take a screenshot of the problem description. The tool will extract
                    and analyze the problem. The 5 latest screenshots are saved.
                  </p>
                </div>

                {/* Solve Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate">Solve Problem</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-xs leading-none">CTRL</span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-xs leading-none">↵</span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-white/70">
                    Generate a solution based on the current problem.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TooltipHelp;
