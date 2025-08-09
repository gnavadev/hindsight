import React, { useState, useEffect, useRef } from "react";

interface TooltipHelpProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void;
  theme: 'default' | 'osrs';
}

const TooltipHelp: React.FC<TooltipHelpProps> = ({ onTooltipVisibilityChange, theme }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tooltipHeight = 0;
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10;
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight);
  }, [isTooltipVisible, onTooltipVisibilityChange]);

  const handleMouseEnter = () => setIsTooltipVisible(true);
  const handleMouseLeave = () => setIsTooltipVisible(false);

  // Conditionally choose the class names based on the theme
  const containerClasses = theme === 'osrs'
    ? "p-3 text-xs osrs-container rounded-lg shadow-lg" // Uses osrs-container for the border
    : "p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg";

  const headerClasses = theme === 'osrs' ? "osrs-header" : "font-medium whitespace-nowrap";
  const textClasses = theme === 'osrs' ? "osrs-content" : "";
  const keybindClasses = theme === 'osrs' ? "osrs-toolbar-btn" : "bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none";
  const descClasses = theme === 'osrs' ? "text-[14px] leading-relaxed text-white/70" : "text-[10px] leading-relaxed text-white/70";
  const tooltipButtonClasses = theme === 'osrs' 
    ? "osrs-toolbar-btn" 
    : "w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors flex items-center justify-center cursor-help z-10";

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Help Icon */}
      <div className={tooltipButtonClasses}>
        <span className={'text-xs text-white/70'}>?</span>
      </div>

      {/* Tooltip Content */}
      {isTooltipVisible && (
        <div
          ref={tooltipRef}
          className="absolute top-full right-0 mt-2 w-80"
          style={{ zIndex: 9999 }}
        >
        <div className={containerClasses}>
            <div className="space-y-4">
              <h3 className={headerClasses}>Keyboard Shortcuts</h3>
              <div className="space-y-3">
                {[
                  { label: "Toggle Window", keys: ["CTRL", "B"], desc: "Show or hide this window." },
                  { label: "Take Screenshot", keys: ["CTRL", "H"], desc: "Capture context for the AI." },
                  { label: "Get Solution", keys: ["CTRL", "↵"], desc: "Generate a solution for the context." },
                  { label: "Start Over", keys: ["CTRL", "R"], desc: "Start fresh with a new question." },
                  { label: "Toggle Click-through", keys: ["CTRL", "I"], desc: "Enable or disable clicking through the app." }
                ].map((cmd, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`${textClasses} whitespace-nowrap`}>{cmd.label}</span>
                      <div className="flex gap-1">
                        {cmd.keys.map((k) => (
                          <span
                            key={k}
                            className={keybindClasses}
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className={descClasses}>
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

export default TooltipHelp;
