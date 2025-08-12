import React, { useState, useEffect, useRef } from "react";
import { IoLogOutOutline } from "react-icons/io5";
import { ThemeToggleButton, TooltipHelp } from "../../layout";
import { useTheme } from "../../../contexts";
import AudioRecordButton from "../../layout/AudioRecordButton";

interface SolutionCommandsProps {
  extraScreenshots: Array<{ path: string; preview: string }>;
  onTooltipVisibilityChange?: (visible: boolean, height: number) => void;
}

const SolutionCommands: React.FC<SolutionCommandsProps> = ({
  extraScreenshots,
  onTooltipVisibilityChange
}) => {
  const { theme } = useTheme();
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

  // helper for button style
  const btnClass =
    theme === "osrs"
      ? "osrs-toolbar-btn"
      : "bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70";

  return (
    <div className={`pt-2 w-fit relative z-20 ${theme === "osrs" ? "osrs-container" : ""}`}>
      <div
        className={
          theme === "osrs"
            ? "osrs-toolbar"
            : "text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4"
        }
      >
        {/* Show/Hide */}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className={theme === "osrs" ?  "leading-none truncate" : "text-[11px] leading-none truncate"}>Show/Hide</span>
          <div className="flex gap-1">
            <button className={btnClass}>CTRL</button>
            <button className={btnClass}>B</button>
          </div>
        </div>

        {/* Screenshot */}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className={theme === "osrs" ?  "leading-none truncate" : "text-[11px] leading-none truncate"}>
            {extraScreenshots.length === 0
              ? "Follow Up Screenshot"
              : "Screenshot"}
          </span>
          <div className="flex gap-1">
            <button className={btnClass}>CTRL</button>
            <button className={btnClass}>H</button>
          </div>
        </div>

        {/* Debug */}
        {extraScreenshots.length > 0 && (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span>Debug</span>
            <div className="flex gap-1">
              <button className={btnClass}>CTRL</button>
              <button className={btnClass}>↵</button>
            </div>
          </div>
        )}

        {/* Start Over */}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span>Start over</span>
          <div className="flex gap-1">
            <button className={btnClass}>CTRL</button>
            <button className={btnClass}>R</button>
          </div>
        </div>

        {/* Tooltip */}
        <TooltipHelp
          onTooltipVisibilityChange={onTooltipVisibilityChange || (() => {})}
          theme={theme}
        />


        {/* Audio Record Button */}
        <AudioRecordButton />
        
        {/* Theme Toggle */}
        <ThemeToggleButton />


        {/* Sign Out */}
        <button
          className={
            theme === "osrs"
              ? "osrs-quit"
              : "text-red-500/70 hover:text-red-500/90 transition-colors hover:cursor-pointer"
          }
          onClick={() => window.electronAPI.quitApp()}
        >
          <IoLogOutOutline className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SolutionCommands;
