import React from "react";

interface HotkeyDisplayProps {
  label: string;
  keys: string[];
}

const HotkeyDisplay: React.FC<HotkeyDisplayProps> = ({ label, keys }) => (
  <div className="flex items-center gap-2">
    <span className="text-[11px] leading-none truncate">{label}</span>
    <div className="flex gap-1">
      {keys.map((key, i) => (
        <button
          key={i}
          className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70"
        >
          {key}
        </button>
      ))}
    </div>
  </div>
);

export default HotkeyDisplay;
