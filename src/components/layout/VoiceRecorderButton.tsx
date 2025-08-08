// VoiceRecorderButton.tsx
import React, { useState, useRef } from "react";

const VoiceRecorderButton: React.FC<{ onResult: (result: string) => void }> = ({ onResult }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const handleRecordClick = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => chunks.current.push(e.data);
        recorder.onstop = async () => {
          const blob = new Blob(chunks.current, { type: chunks.current[0]?.type || 'audio/webm' });
          chunks.current = [];
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            try {
              const result = await window.electronAPI.analyzeAudioFromBase64(base64Data, blob.type);
              onResult(result.text);
            } catch {
              onResult("Audio analysis failed.");
            }
          };
          reader.readAsDataURL(blob);
        };
        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);
      } catch {
        onResult("Could not start recording.");
      }
    } else {
      mediaRecorder?.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  return (
    <button
      className={`bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-white/70 flex items-center gap-1 ${
        isRecording ? "bg-red-500/70 hover:bg-red-500/90" : ""
      }`}
      onClick={handleRecordClick}
      type="button"
    >
      {isRecording ? <span className="animate-pulse">● Stop Recording</span> : <span>🎤 Record Voice</span>}
    </button>
  );
};

export default VoiceRecorderButton;
