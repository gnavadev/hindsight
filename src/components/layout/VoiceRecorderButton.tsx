import React, { useState, useRef, useEffect} from "react";
import { IoMicCircle } from "react-icons/io5";
import { useTheme } from "../../contexts/ThemeContext";

const VoiceRecorderButton: React.FC = () => {
  const { theme } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);

  const handleRecordClick = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);

        recorder.ondataavailable = (e) => chunks.current.push(e.data);

        recorder.onstop = async () => {
          const blob = new Blob(chunks.current, {
            type: chunks.current[0]?.type || "audio/webm",
          });
          chunks.current = [];
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(",")[1];
            try {
              console.log(
                "VoiceRecorderButton: Kicking off main process for audio..."
              );
              await window.electronAPI.processAudio(base64Data, blob.type);
            } catch (err) {
              console.error(
                "The main process failed to handle the audio.",
                err
              );
            }
          };
          reader.readAsDataURL(blob);
        };

        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Could not start recording.", err);
      }
    } else {
      mediaRecorder?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
      streamRef.current = null;
    }
  };

  useEffect(() => {
    const cleanup = window.electronAPI.onToggleRecording(() => {
      handleRecordClick();
    });
    return () => {
      cleanup();
    };
  }, [isRecording, mediaRecorder]);

  const defaultClasses = `bg-white/10 hover:bg-white/20 ${
    isRecording ? "bg-red-500/70 text-white animate-pulse" : "text-white/70"
  }`;
  const btnClass =
    theme === "osrs"
      ? "osrs-toolbar-btn"
      : `transition-colors rounded-md p-1 ${defaultClasses}`;

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span
        className={
          theme === "osrs"
            ? "leading-none truncate"
            : "text-[11px] leading-none truncate"
        }
      >
        {isRecording ? "Recording..." : "Record Audio"}
      </span>
      <button onClick={handleRecordClick} className={btnClass}>
        <IoMicCircle className="w-4 h-4" />
      </button>
    </div>
  );
};

export default VoiceRecorderButton;
