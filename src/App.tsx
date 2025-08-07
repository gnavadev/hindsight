import React, { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { ToastProvider } from "./components/ui/toast";
import { ToastViewport } from "@radix-ui/react-toast";
import Queue from "./_pages/Queue";
import Solutions from "./_pages/Solutions";
import { NewProblemStatementData, NewSolutionData } from "../common/types/solutions"; // CHANGE: Import the new types

declare global {
  interface Window {
    electronAPI: {
      //RANDOM GETTER/SETTERS
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

      //INITIAL SOLUTION EVENTS
      deleteScreenshot: (
        path: string
      ) => Promise<{ success: boolean; error?: string }>;
      onSolutionStart: (callback: () => void) => () => void;
      onSolutionError: (callback: (error: string) => void) => () => void;
      // CHANGE: Update the type definition for the callback data
      onSolutionSuccess: (callback: (data: NewSolutionData) => void) => () => void;
      onProblemExtracted: (callback: (data: NewProblemStatementData) => void) => () => void;

      // DEBUG EVENTS
      // CHANGE: Update the type definition for the callback data
      onDebugSuccess: (callback: (data: NewSolutionData) => void) => () => void;
      onDebugStart: (callback: () => void) => () => void;
      onDebugError: (callback: (error: string) => void) => () => void;

      // Audio Processing
      analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number }>;
      analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number }>;

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

  // This effect for resetting the view is correct and doesn't need changes.
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

  // This effect for managing window dimensions is also fine.
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

    // Initial update
    updateHeight();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [view]);

  // CHANGE: This useEffect block contains the primary logic updates for event handling.
  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onSolutionStart(() => {
        setView("solutions");
        console.log("Solution process started, switching to solutions view.");
      }),

      // The main change is here in onSolutionSuccess
      window.electronAPI.onSolutionSuccess((data) => {
        console.log("onSolutionSuccess called with new data structure:", data);

        // Check for the new nested structure
        if (!data?.solution) {
          console.warn("Received data, but it's missing the 'solution' object.", data);
          return;
        }
        
        // Set the entire data object into the query cache.
        // The Solutions.tsx component will handle accessing the nested properties.
        console.log("Setting 'solution' query data with the new object:", data);
        queryClient.setQueryData(["solution"], data);
      }),
      
      window.electronAPI.onSolutionError((error) => {
        console.error("Solution error:", error);
        // It's good practice to show a toast or error message to the user here.
        queryClient.setQueryData(["solution"], null);
      }),

      window.electronAPI.onProblemExtracted((data) => {
        // This logic is still correct. It receives the problem analysis and caches it.
        console.log("Problem extracted successfully:", data);
        queryClient.setQueryData(["problem_statement"], data);
      }),

      // Other listeners are mostly unchanged but are good to keep.
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
  }, [queryClient, view]); // Added 'view' to dependency array as onProblemExtracted depends on it.

  return (
    <div ref={containerRef} className="min-h-0">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {view === "queue" ? <Queue setView={setView} /> : <Solutions setView={setView} />}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  );
};

export default App;
