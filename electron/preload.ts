import { contextBridge, ipcRenderer } from "electron"

// ---- Windows System Audio Recording (WASAPI Loopback via Chromium) ----
let mediaRecorder: MediaRecorder | null = null;

ipcRenderer.on('start-system-audio', async () => {
  try {
    const stream = await (navigator.mediaDevices as any).getDisplayMedia({
      audio: true,
      video: false
    });

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) {
        e.data.arrayBuffer().then(buf => {
          ipcRenderer.send('system-audio-data', Buffer.from(buf));
        });
      }
    };

    mediaRecorder.onstop = () => {
      ipcRenderer.send('system-audio-stop');
    };

    mediaRecorder.start(1000); // send chunks every 1 second
  } catch (err) {
    console.error('Failed to start system audio capture:', err);
  }
});

ipcRenderer.on('stop-system-audio', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
});

// ---- Types for the exposed Electron API ----
interface ElectronAPI {
  updateContentDimensions: (dimensions: { width: number; height: number }) => Promise<void>
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => () => void
  onSolutionsReady: (callback: (solutions: string) => void) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  takeScreenshot: () => Promise<void>
  moveWindowLeft: () => Promise<void>
  moveWindowRight: () => Promise<void>
  analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number }>
  analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number }>
  analyzeImageFile: (path: string) => Promise<void>
  quitApp: () => Promise<void>
}

export const PROCESSING_EVENTS = {
  UNAUTHORIZED: "procesing-unauthorized",
  NO_SCREENSHOTS: "processing-no-screenshots",
  INITIAL_START: "initial-start",
  PROBLEM_EXTRACTED: "problem-extracted",
  SOLUTION_SUCCESS: "solution-success",
  INITIAL_SOLUTION_ERROR: "solution-error",
  DEBUG_START: "debug-start",
  DEBUG_SUCCESS: "debug-success",
  DEBUG_ERROR: "debug-error"
} as const

// ---- Expose the Electron API ----
contextBridge.exposeInMainWorld("electronAPI", {
  updateContentDimensions: (dimensions) => ipcRenderer.invoke("update-content-dimensions", dimensions),
  takeScreenshot: () => ipcRenderer.invoke("take-screenshot"),
  getScreenshots: () => ipcRenderer.invoke("get-screenshots"),
  deleteScreenshot: (path: string) =>
    ipcRenderer.invoke("delete-screenshot", path),

  startSystemAudioRecording: () => ipcRenderer.send('start-system-audio-recording'),
  stopSystemAudioRecording: () => ipcRenderer.send('stop-system-audio-recording'),

  onScreenshotTaken: (callback) => {
    const subscription = (_: any, data: { path: string; preview: string }) => callback(data)
    ipcRenderer.on("screenshot-taken", subscription)
    return () => ipcRenderer.removeListener("screenshot-taken", subscription)
  },
  onSolutionsReady: (callback) => {
    const subscription = (_: any, solutions: string) => callback(solutions)
    ipcRenderer.on("solutions-ready", subscription)
    return () => ipcRenderer.removeListener("solutions-ready", subscription)
  },
  onResetView: (callback) => {
    const subscription = () => callback()
    ipcRenderer.on("reset-view", subscription)
    return () => ipcRenderer.removeListener("reset-view", subscription)
  },
  onSolutionStart: (callback) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_START, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_START, subscription)
  },
  onDebugStart: (callback) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_START, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_START, subscription)
  },
  onDebugSuccess: (callback) => {
    ipcRenderer.on("debug-success", (_event, data) => callback(data))
    return () => ipcRenderer.removeListener("debug-success", (_event, data) => callback(data))
  },
  onDebugError: (callback) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
  },
  onSolutionError: (callback) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription)
  },
  onProcessingNoScreenshots: (callback) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
  },
  onProblemExtracted: (callback) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription)
  },
  onSolutionSuccess: (callback) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription)
  },
  onUnauthorized: (callback) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
  },
  moveWindowLeft: () => ipcRenderer.invoke("move-window-left"),
  moveWindowRight: () => ipcRenderer.invoke("move-window-right"),
  analyzeAudioFromBase64: (data, mimeType) => ipcRenderer.invoke("analyze-audio-base64", data, mimeType),
  analyzeAudioFile: (path) => ipcRenderer.invoke("analyze-audio-file", path),
  analyzeImageFile: (path) => ipcRenderer.invoke("analyze-image-file", path),
  quitApp: () => ipcRenderer.invoke("quit-app")
} as ElectronAPI)
