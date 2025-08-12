import React, { useState } from 'react';
import { IoMicCircle } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext'; // Assuming you have this context

const AudioRecordButton: React.FC = () => {
  const { theme } = useTheme();
  const [isRecording, setIsRecording] = useState(false);

  const handleRecordClick = () => {
    if (isRecording) {
      window.electronAPI.stopSystemAudioRecording();
      setIsRecording(false);
    } else {
      window.electronAPI.startSystemAudioRecording();
      setIsRecording(true);
    }
  };

  const defaultClasses = `bg-white/10 hover:bg-white/20 ${isRecording ? 'bg-red-500/50 text-white' : 'text-white/70'}`;
  const btnClass = theme === 'osrs' ? "osrs-toolbar-btn" : `transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none font-bold ${defaultClasses}`;

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className={theme === 'osrs' ? 'leading-none truncate' : 'text-[11px] leading-none truncate'}>
        {isRecording ? 'Recording...' : 'Record Audio'}
      </span>
      <button onClick={handleRecordClick} className={btnClass}>
        <IoMicCircle className="w-4 h-4" />
      </button>
    </div>
  );
};

export default AudioRecordButton;
