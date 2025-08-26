import React, { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { ToastProvider } from "./components/ui/Toast";
import { ToastViewport } from "@radix-ui/react-toast";
import Queue from "./pages/Queue";
import Solutions from "./pages/Solutions";
import {
  NewProblemStatementData,
  NewSolutionData,
} from "../common/types/solutions";

declare global {
  interface Window {
    electronAPI: {
      updateContentDimensions: (dimensions: {
        width: number;
        height: number;
      }) => Promise<void>;
      getScreenshots: () => Promise<Array<{ path: string; preview: string }>>;

      //GLOBAL EVENTS
      onUnauthorized: (callback: () => void) => () => void;
      onScreenshotTaken: (
        callback: (data: { path: string; preview: string }) => void
      ) => () => void;
      onProcessingNoScreenshots: (callback: () => void) => () => void;
      onResetView: (callback: () => void) => () => void;
      takeScreenshot: () => Promise<void>;
      copyText: (text: string) => Promise<{ success: boolean }>;

      //INITIAL SOLUTION EVENTS
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

      // DEBUG EVENTS
      onDebugSuccess: (callback: (data: NewSolutionData) => void) => () => void;
      onDebugStart: (callback: () => void) => () => void;
      onDebugError: (callback: (error: string) => void) => () => void;

      // Audio Processing
      // REMOVED: The old function that we are no longer using in the pipeline.
      // analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number }>;
      analyzeAudioFile: (
        path: string
      ) => Promise<{ text: string; timestamp: number }>;
      // ADDED: The new function that triggers the full backend process.
      processAudio: (
        data: string,
        mimeType: string
      ) => Promise<{ success: boolean; error?: string }>;

      // Window Management
      moveWindowLeft: () => Promise<void>;
      moveWindowRight: () => Promise<void>;
      quitApp: () => Promise<void>;
    };
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  },
});

const App: React.FC = () => {
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

    return () => {
      cleanup();
    };
  }, []);

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

  // This useEffect block contains the primary logic updates for event handling.
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
        console.log("Setting 'solution' query data with the new object:", data);
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
  }, [queryClient, view]);

  return (
    <div ref={containerRef} className="min-h-0">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {view === "queue" ? (
            <Queue setView={setView} />
          ) : (
            <Solutions setView={setView} />
          )}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  );
};

export default App;
