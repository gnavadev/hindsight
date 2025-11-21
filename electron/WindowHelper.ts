import { BrowserWindow, screen } from "electron";
import { AppState } from "./main.js";
import path from "node:path";

let isDev = false;
(async () => {
  const mod = await import("electron-is-dev");
  isDev = mod.default;
})();

export class WindowHelper {
  private mainWindow: BrowserWindow | null = null;
  private fileWindow: BrowserWindow | null = null;
  private isWindowVisible: boolean = false;
  private windowPosition: { x: number; y: number } | null = null;
  private windowSize: { width: number; height: number } | null = null;
  private appState: AppState;

  private screenWidth: number = 0;
  private screenHeight: number = 0;
  private step: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  public setWindowDimensions(width: number, height: number): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const [currentX, currentY] = this.mainWindow.getPosition();
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;

    const maxAllowedWidth = Math.floor(
      workArea.width * (this.appState.getHasDebugged() ? 0.75 : 0.5)
    );

    const newWidth = Math.min(width + 32, maxAllowedWidth);
    const newHeight = Math.ceil(height);

    const maxX = workArea.width - newWidth;
    const newX = Math.min(Math.max(currentX, 0), maxX);

    this.mainWindow.setBounds({
      x: newX,
      y: currentY,
      width: newWidth,
      height: newHeight,
    });

    this.windowPosition = { x: newX, y: currentY };
    this.windowSize = { width: newWidth, height: newHeight };
    this.currentX = newX;
  }

  public createWindow(): void {
    if (this.mainWindow !== null) return;
    const windowSettings: Electron.BrowserWindowConstructorOptions = {
      height: 600,
      minWidth: undefined,
      maxWidth: undefined,
      x: this.currentX,
      y: 0,
      type: "panel",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: isDev
          ? path.join(__dirname, "../dist-electron/preload.js")
          : path.join(__dirname, "preload.js"),
        experimentalFeatures: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        backgroundThrottling: false,
      },
      show: true,
      alwaysOnTop: true,
      frame: false,
      transparent: true,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000",
      focusable: false,
      minimizable: false,
      maximizable: false,
      resizable: false,
      skipTaskbar: true,
      titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
      thickFrame: false,
      acceptFirstMouse: false,
      disableAutoHideCursor: true,
      enableLargerThanScreen: true,
      opacity: 0.8,
    };

    this.mainWindow = new BrowserWindow(windowSettings);

    this.mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    this.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
    this.mainWindow.setContentProtection(true);

    this.mainWindow.webContents.on("did-finish-load", () => {
      const css = `
        *::-webkit-scrollbar { 
          width: 0px !important;
          height: 0px !important;
          display: none !important; 
        }
        * { 
          -ms-overflow-style: none !important; 
          scrollbar-width: none !important; 
        }
        body, html {
          overflow: auto !important;
          scroll-behavior: smooth !important;
        }
      `;
      this.mainWindow.webContents.insertCSS(css);
    });

    if (isDev) {
      this.mainWindow.loadURL("http://localhost:5173");
    } else {
      this.mainWindow.loadFile(
        path.join(__dirname, "..", "dist", "index.html")
      );
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    this.screenWidth = workArea.width;
    this.screenHeight = workArea.height;

    this.step = Math.floor(this.screenWidth / 10);
    this.currentX = 0;
    this.mainWindow.setContentProtection(true);

    this.applyStealthSettings();

    const bounds = this.mainWindow.getBounds();
    this.windowPosition = { x: bounds.x, y: bounds.y };
    this.windowSize = { width: bounds.width, height: bounds.height };
    this.currentX = bounds.x;
    this.currentY = bounds.y;

    this.setupWindowListeners();
    this.isWindowVisible = true;
  }

  // --- File Overlay Window - BIGGER SIZE ---
  public createFileOverlayWindow(): BrowserWindow {
    if (this.fileWindow && !this.fileWindow.isDestroyed()) {
      return this.fileWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;

    // Calculate overlay size - even bigger
    const overlayWidth = 800;
    const overlayHeight = 900;

    // Position opposite to main window
    let overlayX = 50;
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const mainBounds = this.mainWindow.getBounds();
      if (mainBounds.x < workArea.width / 2) {
        overlayX = workArea.width - overlayWidth - 50;
      } else {
        overlayX = 50;
      }
    }

    // Center vertically
    const overlayY = Math.floor((workArea.height - overlayHeight) / 2);

    this.fileWindow = new BrowserWindow({
      width: overlayWidth,
      height: overlayHeight,
      x: overlayX,
      y: overlayY,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: isDev
          ? path.join(__dirname, "../dist-electron/preload.js")
          : path.join(__dirname, "preload.js"),
        webSecurity: false,
      }
    });

    this.fileWindow.setContentProtection(true);
    this.fileWindow.setIgnoreMouseEvents(true, { forward: true });
    this.fileWindow.setAlwaysOnTop(true, "screen-saver", 2);

    const url = isDev
      ? "http://localhost:5173?mode=overlay"
      : `file://${path.join(__dirname, "..", "dist", "index.html")}?mode=overlay`;
    
    this.fileWindow.loadURL(url);

    this.fileWindow.on("closed", () => {
      this.fileWindow = null;
    });

    return this.fileWindow;
  }

  public getFileWindow(): BrowserWindow | null {
    return this.fileWindow;
  }

  private applyStealthSettings(): void {
    if (!this.mainWindow) return;
    this.mainWindow.setMenuBarVisibility(false);
    this.mainWindow.setSkipTaskbar(true);
    this.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
    this.mainWindow.setVisibleOnAllWorkspaces(true);
    this.mainWindow.setIgnoreMouseEvents(true, { forward: true });

    if (process.platform === "darwin") {
      this.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });
      this.mainWindow.setHiddenInMissionControl(true);
      this.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
    }

    if (process.platform === "linux") {
      if (this.mainWindow.setHasShadow) {
        this.mainWindow.setHasShadow(false);
      }
      this.mainWindow.setFocusable(false);
    }

    if (process.platform === "win32") {
      this.mainWindow.setSkipTaskbar(true);
    }
  }

  private setupWindowListeners(): void {
    if (!this.mainWindow) return;

    this.mainWindow.on("move", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds();
        this.windowPosition = { x: bounds.x, y: bounds.y };
        this.currentX = bounds.x;
        this.currentY = bounds.y;
      }
    });

    this.mainWindow.on("resize", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds();
        this.windowSize = { width: bounds.width, height: bounds.height };
      }
    });

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
      this.isWindowVisible = false;
      this.windowPosition = null;
      this.windowSize = null;
    });
  }

  public enableMouseEvents(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.setIgnoreMouseEvents(false);
  }

  public disableMouseEvents(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.setIgnoreMouseEvents(true, { forward: true });
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public isVisible(): boolean {
    return this.isWindowVisible;
  }

  public hideMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn("Main window does not exist or is destroyed.");
      return;
    }

    const bounds = this.mainWindow.getBounds();
    this.windowPosition = { x: bounds.x, y: bounds.y };
    this.windowSize = { width: bounds.width, height: bounds.height };
    this.mainWindow.hide();
    this.isWindowVisible = false;
  }

  public showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn("Main window does not exist or is destroyed.");
      return;
    }

    if (this.windowPosition && this.windowSize) {
      this.mainWindow.setBounds({
        x: this.windowPosition.x,
        y: this.windowPosition.y,
        width: this.windowSize.width,
        height: this.windowSize.height,
      });
    }

    this.mainWindow.showInactive();
    this.mainWindow.setContentProtection(true);

    this.applyStealthSettings();
    this.isWindowVisible = true;
  }

  public toggleMainWindow(): void {
    if (this.isWindowVisible) {
      this.hideMainWindow();
    } else {
      this.showMainWindow();
    }
  }

  public moveWindowRight(): void {
    if (!this.mainWindow) return;

    const windowWidth = this.windowSize?.width || 0;
    const halfWidth = windowWidth / 2;

    this.currentX = Number(this.currentX) || 0;
    this.currentY = Number(this.currentY) || 0;

    this.currentX = Math.min(
      this.screenWidth - halfWidth,
      this.currentX + this.step
    );
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    );
  }

  public moveWindowLeft(): void {
    if (!this.mainWindow) return;

    const windowWidth = this.windowSize?.width || 0;
    const halfWidth = windowWidth / 2;

    this.currentX = Number(this.currentX) || 0;
    this.currentY = Number(this.currentY) || 0;

    this.currentX = Math.max(-halfWidth, this.currentX - this.step);
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    );
  }

  public moveWindowDown(): void {
    if (!this.mainWindow) return;

    this.currentX = Number(this.currentX) || 0;
    this.currentY = Number(this.currentY) || 0;

    const minVisibleHeight = 100;
    const maxY = this.screenHeight - minVisibleHeight;

    this.currentY = Math.min(maxY, this.currentY + this.step);

    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    );
  }

  public moveWindowUp(): void {
    if (!this.mainWindow) return;

    const windowHeight = this.windowSize?.height || 0;

    this.currentX = Number(this.currentX) || 0;
    this.currentY = Number(this.currentY) || 0;

    const minVisibleHeight = 100;
    const minY = -(windowHeight - minVisibleHeight);

    this.currentY = Math.max(minY, this.currentY - this.step);

    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    );
  }

  public resetWindowPosition(): void {
    if (!this.mainWindow) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    const windowWidth = this.windowSize?.width || 400;

    this.currentX = Math.floor((workArea.width - windowWidth) / 2);
    this.currentY = 0;

    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    );
  }

  public scrollToShowContent(contentHeight: number): void {
    if (!this.mainWindow) return;

    const windowHeight = this.windowSize?.height || 600;

    if (contentHeight > windowHeight) {
      const maxNegativeY = -(contentHeight - windowHeight);
      this.currentY = Math.floor(maxNegativeY / 2);

      this.mainWindow.setPosition(
        Math.round(this.currentX),
        Math.round(this.currentY)
      );
    }
  }
}