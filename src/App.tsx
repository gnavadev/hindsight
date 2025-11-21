import React, { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { ToastProvider } from "./components/ui/Toast";
import { ToastViewport } from "@radix-ui/react-toast";
import Queue from "./pages/Queue";
import Solutions from "./pages/Solutions";
import { OsrsTheme } from "./themes";
import {
  NewProblemStatementData,
  NewSolutionData,
} from "../common/types/solutions";

// Declare API interfaces
declare global {
  interface Window {
    electronAPI: {
      updateContentDimensions: (dimensions: {
        width: number;
        height: number;
      }) => Promise<void>;
      getScreenshots: () => Promise<Array<{ path: string; preview: string }>>;

      onUnauthorized: (callback: () => void) => () => void;
      onScreenshotTaken: (
        callback: (data: { path: string; preview: string }) => void
      ) => () => void;
      onProcessingNoScreenshots: (callback: () => void) => () => void;
      onResetView: (callback: () => void) => () => void;
      takeScreenshot: () => Promise<void>;
      copyText: (text: string) => Promise<{ success: boolean }>;

      deleteScreenshot: (
        path: string
      ) => Promise<{ success: boolean; error?: string }>;
      onSolutionStart: (callback: () => void) => () => void;
      onSolutionError: (callback: (error: string) => void) => () => void;
      onSolutionSuccess: (
        callback: (data: NewSolutionData) => void
      ) => () => void;
      onProblemExtracted: (
        callback: (data: NewProblemStatementData) => void
      ) => () => void;

      onDebugSuccess: (callback: (data: NewSolutionData) => void) => () => void;
      onDebugStart: (callback: () => void) => () => void;
      onDebugError: (callback: (error: string) => void) => () => void;

      analyzeAudioFile: (
        path: string
      ) => Promise<{ text: string; timestamp: number }>;
      processAudio: (
        data: string,
        mimeType: string
      ) => Promise<{ success: boolean; error?: string }>;
      onToggleRecording: (callback: () => void) => () => void;
      
      moveWindowLeft: () => Promise<void>;
      moveWindowRight: () => Promise<void>;
      quitApp: () => Promise<void>;

      selectFile: () => Promise<string | null>;
      openFileOverlay: (path: string) => Promise<{ success: boolean; error?: string }>;
      onFileOverlayData: (callback: (data: { type: 'image'|'text', content: string, name: string }) => void) => () => void;
    };
  }
}

// --- File Overlay Component (Separate from main app) ---
const FileOverlay: React.FC = () => {
  const [data, setData] = useState<{ type: 'image'|'text', content: string, name: string } | null>(null);

  useEffect(() => {
    const cleanup = window.electronAPI.onFileOverlayData((receivedData) => {
      console.log("FileOverlay received data:", receivedData);
      setData(receivedData);
    });
    return () => cleanup();
  }, []);

  if (!data) {
    return (
      <>
        <OsrsTheme />
        <div className="osrs-container h-screen w-screen flex items-center justify-center">
          <span className="osrs-header">Loading...</span>
        </div>
      </>
    );
  }

  return (
    <>
      <OsrsTheme />
      <div className="osrs-container h-screen w-screen flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-[#5a4a3a] pb-2 mb-3 text-center">
          <span className="osrs-header">{data.name}</span>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto scrollbar-hide">
          {data.type === 'image' ? (
            <img 
              src={data.content} 
              alt="Overlay" 
              className="max-w-full h-auto rounded border-2 border-[#5a4a3a]" 
            />
          ) : (
            <pre className="osrs-code-block whitespace-pre-wrap text-sm p-3 rounded">
              {data.content}
            </pre>
          )}
        </div>
      </div>
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  },
});

// --- Main Application Component ---
const MainApp: React.FC = () => {
  const [view, setView] = useState<"queue" | "solutions" | "debug">("queue");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanup = window.electronAPI.onResetView(() => {
      console.log("Received 'reset-view' message from main process.");
      queryClient.invalidateQueries(["screenshots"]);
      queryClient.invalidateQueries(["problem_statement"]);
      queryClient.invalidateQueries(["solution"]);
      queryClient.invalidateQueries(["new_solution"]);
      setView("queue");
    });

    return () => cleanup();
  }, []);

  const handleFileSelect = async () => {
    try {
      console.log("Opening file dialog...");
      const filePath = await window.electronAPI.selectFile();
      
      if (!filePath) {
        console.log("No file selected (user cancelled)");
        return;
      }

      console.log("Opening overlay for:", filePath);
      const result = await window.electronAPI.openFileOverlay(filePath);
      
      if (!result.success) {
        console.error("Failed to open overlay:", result.error);
      }
    } catch (error) {
      console.error("Error in handleFileSelect:", error);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const updateHeight = () => {
      if (!containerRef.current) return;
      const height = containerRef.current.scrollHeight;
      const width = containerRef.current.scrollWidth;
      window.electronAPI?.updateContentDimensions({ width, height });
    };

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(containerRef.current);

    const mutationObserver = new MutationObserver(updateHeight);
    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    updateHeight();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [view]);

  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onSolutionStart(() => {
        setView("solutions");
        console.log("Solution process started, switching to solutions view.");
      }),

      window.electronAPI.onSolutionSuccess((data) => {
        console.log("onSolutionSuccess called with new data structure:", data);
        if (!data?.solution) {
          console.warn(
            "Received data, but it's missing the 'solution' object.",
            data
          );
          return;
        }
        queryClient.setQueryData(["solution"], data);
      }),

      window.electronAPI.onSolutionError((error) => {
        console.error("Solution error:", error);
        queryClient.setQueryData(["solution"], null);
      }),

      window.electronAPI.onProblemExtracted((data) => {
        console.log("Problem extracted successfully:", data);
        queryClient.setQueryData(["problem_statement"], data);
      }),

      window.electronAPI.onUnauthorized(() => {
        console.log("Unauthorized access. Resetting view.");
        queryClient.removeQueries();
        setView("queue");
      }),

      window.electronAPI.onResetView(() => {
        console.log("View reset via shortcut. Clearing cache.");
        queryClient.removeQueries();
        setView("queue");
      }),
    ];

    return () => cleanupFunctions.forEach((cleanup) => cleanup());
  }, [view]);

  return (
    <div ref={containerRef} className="min-h-0 relative">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {view === "queue" ? (
            <Queue setView={setView} />
          ) : (
            <Solutions setView={setView} />
          )}
          
          {/* File button using your OSRS theme class - only render once */}
          {view && (
            <button 
              id="file-overlay-btn"
              onClick={handleFileSelect}
              className="osrs-button flex items-center gap-1"
              style={{
                position: 'fixed',
                bottom: '12px',
                right: '12px',
                zIndex: 9999,
              }}
              title="Open File in Overlay"
            >
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5"
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              File
            </button>
          )}
          
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  );
};

// --- Root App Component - Routes between Overlay and Main ---
const App: React.FC = () => {
  const [isOverlayMode, setIsOverlayMode] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsOverlayMode(params.get("mode") === "overlay");
  }, []);

  // Don't render anything until we know which mode we're in
  if (isOverlayMode === null) {
    return null;
  }

  // Completely separate render paths - no shared components
  if (isOverlayMode) {
    return <FileOverlay />;
  }

  return <MainApp />;
};

export default App;