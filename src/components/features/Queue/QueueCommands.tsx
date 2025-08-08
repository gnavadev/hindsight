import React, { useState, useEffect, useRef } from "react";
import { IoLogOutOutline } from "react-icons/io5";
import { ThemeToggleButton, TooltipHelp } from "../../layout";
import { useTheme } from "../../../contexts/ThemeContext";

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void;
  screenshots: Array<{ path: string; preview: string }>;
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshots
}) => {
  const { theme } = useTheme();
  const [audioResult, setAudioResult] = useState<string | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tooltipHeight = 0;
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10;
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight);
  }, [isTooltipVisible, onTooltipVisibilityChange]);

  return (
    <div className={`pt-2 w-fit ${theme === "osrs" ? "osrs-container" : ""}`}>
      <div
        className={`text-xs ${
          theme === "osrs"
            ? "flex items-center justify-center gap-4 py-2 px-4"
            : "text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4"
        }`}
      >
        {/* Show/Hide */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] leading-none">Show/Hide</span>
          <div className="flex gap-1">
            <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
              ⌘
            </button>
            <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
              B
            </button>
          </div>
        </div>

        {/* Screenshot */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] leading-none truncate">
            {screenshots.length === 0 ? "Take first screenshot" : "Screenshot"}
          </span>
          <div className="flex gap-1">
            <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
              ⌘
            </button>
            <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
              H
            </button>
          </div>
        </div>

        {/* Solve Command */}
        {screenshots.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] leading-none">Solve</span>
            <div className="flex gap-1">
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                ⌘
              </button>
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                ↵
              </button>
            </div>
          </div>
        )}

        {/* Tooltip */}
        <TooltipHelp onTooltipVisibilityChange={onTooltipVisibilityChange} />

        {/* Theme Toggle */}
        <ThemeToggleButton />

        {/* Sign Out */}
        <button
          className="text-red-500/70 hover:text-red-500/90 transition-colors hover:cursor-pointer"
          title="Sign Out"
          onClick={() => window.electronAPI.quitApp()}
        >
          <IoLogOutOutline className="w-4 h-4" />
        </button>
      </div>

      {/* Audio Result */}
      {audioResult && (
        <div className="mt-2 p-2 bg-white/10 rounded text-white text-xs max-w-md">
          <span className="font-semibold">Audio Result:</span> {audioResult}
        </div>
      )}
    </div>
  );
};

export default QueueCommands;
