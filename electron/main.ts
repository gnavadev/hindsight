import { app, BrowserWindow } from "electron";
import { initializeIpcHandlers } from "./ipcHandlers";
import { WindowHelper } from "./WindowHelper";
import { ScreenshotHelper } from "./ScreenshotHelper";
import { ShortcutsHelper } from "./shortcuts";
import { ProcessingHelper } from "./ProcessingHelper";
import { NewSolutionData } from "../common/types/solutions"; // CHANGE: Import the new types


export class AppState {
  private static instance: AppState | null = null;

  private windowHelper: WindowHelper;
  private screenshotHelper: ScreenshotHelper;
  public shortcutsHelper: ShortcutsHelper;
  public processingHelper: ProcessingHelper;

  // View management
  private view: "queue" | "solutions" = "queue";

  private problemInfo: any | null = null; // Using 'any' for simplicity, but a specific type is better.

  // CHANGE: Added a private property to store the generated solution.
  private solutionInfo: NewSolutionData | null = null;

  private hasDebugged: boolean = false;

  // Processing events
  public readonly PROCESSING_EVENTS = {
    //global states
    UNAUTHORIZED: "procesing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",

    //states for generating the initial solution
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",

    //states for processing the debugging
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error",
  } as const;

  constructor() {
    this.windowHelper = new WindowHelper(this);
    this.screenshotHelper = new ScreenshotHelper(this.view);
    this.processingHelper = new ProcessingHelper(this);
    this.shortcutsHelper = new ShortcutsHelper(this);
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  // --- Getters and Setters ---
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow();
  }

  public getView(): "queue" | "solutions" {
    return this.view;
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view;
    this.screenshotHelper.setView(view);
  }

  public getProblemInfo(): any {
    return this.problemInfo;
  }

  public setProblemInfo(problemInfo: any): void {
    this.problemInfo = problemInfo;
  }

  // CHANGE: Added getter and setter for the solution info.
  public getSolutionInfo(): NewSolutionData | null {
    return this.solutionInfo;
  }

  public setSolutionInfo(solutionInfo: NewSolutionData): void {
    this.solutionInfo = solutionInfo;
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged;
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value;
  }

  // --- Helpers ---
  public getScreenshotHelper(): ScreenshotHelper {
    return this.screenshotHelper;
  }

  // --- State Management ---
  public clearQueues(): void {
    this.screenshotHelper.clearQueues();
    this.problemInfo = null;
    // CHANGE: Ensure the solution info is also cleared on reset.
    this.solutionInfo = null;
    this.setView("queue");
  }
  
  // ... (rest of the class methods like isVisible, getScreenshotQueue, createWindow, etc. remain the same) ...
  public isVisible(): boolean {
    return this.windowHelper.isVisible();
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue();
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue();
  }

  public createWindow(): void {
    this.windowHelper.createWindow();
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow();
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow();
  }

  public toggleMainWindow(): void {
    this.windowHelper.toggleMainWindow();
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height);
  }

  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available");
    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    );
    return screenshotPath;
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath);
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path);
  }

  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft();
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight();
  }
  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown();
  }
  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp();
  }
}

// Application initialization
async function initializeApp() {
  const appState = AppState.getInstance();

  initializeIpcHandlers(appState);

  app.whenReady().then(() => {
    console.log("App is ready");
    appState.createWindow();
    appState.shortcutsHelper.registerGlobalShortcuts();
  });

  app.on("activate", () => {
    console.log("App activated");
    if (appState.getMainWindow() === null) {
      appState.createWindow();
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.dock?.hide();
  app.commandLine.appendSwitch("disable-background-timer-throttling");
}

// Start the application
initializeApp().catch(console.error);
