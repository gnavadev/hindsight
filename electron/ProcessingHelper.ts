// ProcessingHelper.ts

import { AppState } from "./main";
import { LLMHelper } from "./LLMHelper";
import dotenv from "dotenv";

dotenv.config();

// These variables are fine as they are.
const isDev = process.env.NODE_ENV === "development";
const isDevTest = process.env.IS_DEV_TEST === "true";
const MOCK_API_WAIT_TIME = Number(process.env.MOCK_API_WAIT_TIME) || 500;

export class ProcessingHelper {
  private appState: AppState;
  private llmHelper: LLMHelper;
  private currentProcessingAbortController: AbortController | null = null;
  private currentExtraProcessingAbortController: AbortController | null = null;

  constructor(appState: AppState) {
    this.appState = appState;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables");
    }
    this.llmHelper = new LLMHelper(apiKey);
  }

  // CHANGE: The entire processScreenshots method has been refactored.
  public async processScreenshots(): Promise<void> {
    const mainWindow = this.appState.getMainWindow();
    if (!mainWindow) return;

    const view = this.appState.getView();

    if (view === "queue") {
      // This is the initial problem-solving flow
      const screenshotQueue = this.appState.getScreenshotHelper().getScreenshotQueue();
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }

      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_START);
      this.appState.setView("solutions");
      this.currentProcessingAbortController = new AbortController();

      try {
        // --- STEP 1: Extract and Classify the Problem ---
        // This now uses the new, more powerful prompt to analyze and classify the problem.
        console.log("ProcessingHelper: Calling extractProblemFromImages...");
        const problemInfo = await this.llmHelper.extractProblemFromImages(screenshotQueue);
        console.log("ProcessingHelper: Problem extracted:", problemInfo);

        // Send the extracted problem details to the frontend so the UI can update.
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED, problemInfo);
        
        // Store this crucial information in the application's state for later use (e.g., for debugging).
        this.appState.setProblemInfo(problemInfo);

        // --- STEP 2: Generate the Solution ---
        // Now, generate a solution based on the *classified* problem information.
        console.log("ProcessingHelper: Calling generateSolution...");
        const solutionResult = await this.llmHelper.generateSolution(problemInfo);
        console.log("ProcessingHelper: Solution generated:", solutionResult);

        // Store the solution in the state. This is important for the debug flow.
        this.appState.setSolutionInfo(solutionResult); 

        // Send the final solution to the frontend.
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.SOLUTION_SUCCESS, solutionResult);

      } catch (error: any) {
        console.error("Error during initial processing:", error);
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, error.message);
      } finally {
        this.currentProcessingAbortController = null;
      }
    } else {
      // This is the debug flow (when view is 'solutions' or 'debug')
      const extraScreenshotQueue = this.appState.getScreenshotHelper().getExtraScreenshotQueue();
      if (extraScreenshotQueue.length === 0) {
        console.log("No extra screenshots to process for debugging.");
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }

      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_START);
      this.currentExtraProcessingAbortController = new AbortController();

      try {
        const problemInfo = this.appState.getProblemInfo();
        // CHANGE: Get the current solution from state instead of regenerating it.
        const currentSolution = this.appState.getSolutionInfo(); 

        if (!problemInfo || !currentSolution) {
          throw new Error("Cannot debug without initial problem and solution information.");
        }

        // The 'answer' field holds the code for 'coding' problems.
        const currentCode = currentSolution.solution.answer;

        // Debug the solution using the vision model and the extra screenshots.
        const debugResult = await this.llmHelper.debugSolutionWithImages(
          problemInfo,
          currentCode,
          extraScreenshotQueue
        );
        
        // Update the state with the new debugged solution.
        this.appState.setSolutionInfo(debugResult);
        this.appState.setHasDebugged(true);

        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_SUCCESS, debugResult);

      } catch (error: any) {
        console.error("Debug processing error:", error);
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_ERROR, error.message);
      } finally {
        this.currentExtraProcessingAbortController = null;
      }
    }
  }

  // The other methods are fine and do not need changes for this workflow.
  public cancelOngoingRequests(): void {
    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort();
      this.currentProcessingAbortController = null;
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort();
      this.currentExtraProcessingAbortController = null;
    }

    this.appState.setHasDebugged(false);
  }

  public async processAudioBase64(data: string, mimeType: string) {
    return this.llmHelper.analyzeAudioFromBase64(data, mimeType);
  }

  public async processAudioFile(filePath: string) {
    return this.llmHelper.analyzeAudioFile(filePath);
  }

  public getLLMHelper() {
    return this.llmHelper;
  }
}
