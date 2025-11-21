// ipcHandlers.ts

import { ipcMain, app, clipboard, dialog } from "electron";
import { AppState } from "./main";
import fs from "fs";
import path from "path";

export function initializeIpcHandlers(appState: AppState): void {
  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        appState.setWindowDimensions(width, height);
      }
    }
  );

  // --- NEW: Handle file selection via native dialog ---
  ipcMain.handle("select-file", async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          { name: "All Supported", extensions: ["jpg", "jpeg", "png", "gif", "webp", "txt", "md", "json", "js", "ts", "py", "html", "css"] },
          { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
          { name: "Text Files", extensions: ["txt", "md", "json", "js", "ts", "py", "html", "css"] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error: any) {
      console.error("Error in select-file handler:", error);
      return null;
    }
  });

  // --- Handle creating the overlay and sending data ---
  ipcMain.handle("open-file-overlay", async (event, filePath: string) => {
    try {
      // 1. Create (or get) the overlay window
      const overlayWindow = appState.windowHelper.createFileOverlayWindow();
      
      // 2. Read the file content
      const ext = path.extname(filePath).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      
      let fileData;
      if (isImage) {
        const bitmap = await fs.promises.readFile(filePath);
        fileData = `data:image/${ext.replace('.', '')};base64,${bitmap.toString('base64')}`;
      } else {
        fileData = await fs.promises.readFile(filePath, 'utf-8');
      }

      const payload = {
        type: isImage ? 'image' : 'text',
        content: fileData,
        name: path.basename(filePath)
      };

      // 3. Wait for window to be ready then send data
      if (overlayWindow.webContents.isLoading()) {
        overlayWindow.webContents.once('did-finish-load', () => {
          overlayWindow.webContents.send('file-overlay-data', payload);
        });
      } else {
        overlayWindow.webContents.send('file-overlay-data', payload);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error opening file overlay:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("process-screenshots", async () => {
    await appState.processingHelper.processScreenshots();
  });

  ipcMain.handle("process-audio", async (event, data: string, mimeType: string) => {
    try {
      await appState.processingHelper.processAudioAsProblem(data, mimeType);
      return { success: true };
    } catch (error: any) {
      console.error("Error in process-audio handler:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return appState.deleteScreenshot(path);
  });

  ipcMain.handle('copy-text', (event, text) => {
    clipboard.writeText(text);
    return { success: true };
  });

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeScreenshot();
      const preview = await appState.getImagePreview(screenshotPath);
      return { path: screenshotPath, preview };
    } catch (error) {
      console.error("Error taking screenshot:", error);
      throw error;
    }
  });

  ipcMain.handle("get-screenshots", async () => {
    console.log({ view: appState.getView() });
    try {
      let previews = [];
      if (appState.getView() === "queue") {
        previews = await Promise.all(
          appState.getScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path),
          }))
        );
      } else {
        previews = await Promise.all(
          appState.getExtraScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path),
          }))
        );
      }
      previews.forEach((preview: any) => console.log(preview.path));
      return previews;
    } catch (error) {
      console.error("Error getting screenshots:", error);
      throw error;
    }
  });

  ipcMain.handle("toggle-window", async () => {
    appState.toggleMainWindow();
  });

  ipcMain.handle("reset-queues", async () => {
    try {
      appState.clearQueues();
      console.log("Screenshot queues have been cleared.");
      return { success: true };
    } catch (error: any) {
      console.error("Error resetting queues:", error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle("analyze-audio-file", async (event, path: string) => {
    try {
      const result = await appState.processingHelper.processAudioFile(path);
      return result;
    } catch (error: any) {
      console.error("Error in analyze-audio-file handler:", error);
      throw error;
    }
  });

  ipcMain.handle("analyze-image-file", async (event, path: string) => {
    try {
      const result = await appState.processingHelper
        .getLLMHelper()
        .analyzeImageFile(path);
      return result;
    } catch (error: any) {
      console.error("Error in analyze-image-file handler:", error);
      throw error;
    }
  });

  ipcMain.handle("quit-app", () => {
    app.quit();
  });
}