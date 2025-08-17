import { AppState } from "./main";
import { LLMHelper } from "./LLMHelper";
// We no longer need dotenv for this temporary fix
// import dotenv from "dotenv";
// dotenv.config();

export class ProcessingHelper {
  private appState: AppState;
  private llmHelper: LLMHelper;
  private currentProcessingAbortController: AbortController | null = null;
  private currentExtraProcessingAbortController: AbortController | null = null;

  constructor(appState: AppState) {
    this.appState = appState;

    // --- TEMPORARY FIX FOR TESTING ---
    // Hardcode your API key here.
    // WARNING: This is insecure. Do not use this in a real application.
    const apiKey = "";

    if (!apiKey) {
      // This will still cause a crash, reminding you to add the key.
      console.error(
        "GEMINI_API_KEY has not been hardcoded for this test build."
      );
    }

    this.llmHelper = new LLMHelper(apiKey);
  }

  public setApiKey(apiKey: string): void {
    if (apiKey && typeof apiKey === "string") {
      this.llmHelper = new LLMHelper(apiKey);
      console.log("API Key has been set and LLMHelper is now active.");
    } else {
      console.error("An invalid API key was provided.");
    }
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.appState.getMainWindow();
    if (!mainWindow) return;

    if (!this.llmHelper) {
      console.log("Processing blocked because API key is not set.");
      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.UNAUTHORIZED);
      return;
    }

    const view = this.appState.getView();

    if (view === "queue") {
      // --- Initial Processing Flow ---
      const screenshotQueue = this.appState
        .getScreenshotHelper()
        .getScreenshotQueue();

      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS
        );
        return;
      }

      mainWindow.webContents.send(
        this.appState.PROCESSING_EVENTS.INITIAL_START
      );
      this.appState.setView("solutions");
      this.currentProcessingAbortController = new AbortController();

      try {
        console.log("ProcessingHelper: Calling extractProblemFromImages...");
        const problemInfo = await this.llmHelper.extractProblemFromImages(
          screenshotQueue
        );
        console.log("ProcessingHelper: Problem extracted:", problemInfo);

        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
          problemInfo
        );
        this.appState.setProblemInfo(problemInfo);

        console.log("ProcessingHelper: Calling generateSolution...");
        const solutionResult = await this.llmHelper.generateSolution(
          problemInfo
        );
        console.log("ProcessingHelper: Solution generated:", solutionResult);

        this.appState.setSolutionInfo(solutionResult);
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          solutionResult
        );
      } catch (error: any) {
        console.error("Error during initial processing:", error);

        // --- CHANGE: Send a user-friendly message instead of the raw error ---
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
          "The AI returned an invalid response. Please try again."
        );
      } finally {
        this.currentProcessingAbortController = null;
      }
    } else {
      // --- Debug Flow ---
      const extraScreenshotQueue = this.appState
        .getScreenshotHelper()
        .getExtraScreenshotQueue();

      if (extraScreenshotQueue.length === 0) {
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS
        );
        return;
      }

      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_START);
      this.currentExtraProcessingAbortController = new AbortController();

      try {
        const problemInfo = this.appState.getProblemInfo();
        const currentSolution = this.appState.getSolutionInfo();

        if (!problemInfo || !currentSolution) {
          throw new Error(
            "Cannot debug without initial problem and solution information."
          );
        }

        const currentCode = currentSolution.solution.answer;
        const debugResult = await this.llmHelper.debugSolutionWithImages(
          problemInfo,
          currentCode,
          extraScreenshotQueue
        );

        this.appState.setSolutionInfo(debugResult);
        this.appState.setHasDebugged(true);
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.DEBUG_SUCCESS,
          debugResult
        );

        await this.appState.getScreenshotHelper().clearExtraQueueFiles();
      } catch (error: any) {
        console.error("Debug processing error:", error);

        // --- CHANGE: Send a user-friendly message for debug errors as well ---
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.DEBUG_ERROR,
          "The AI returned an invalid response during debug. Please try again."
        );
      } finally {
        this.currentExtraProcessingAbortController = null;
      }
    }
  }

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
    if (!this.llmHelper) return null;
    return this.llmHelper.analyzeAudioFromBase64(data, mimeType);
  }

  public async processAudioFile(filePath: string) {
    if (!this.llmHelper) return null;
    return this.llmHelper.analyzeAudioFile(filePath);
  }

  public getLLMHelper() {
    return this.llmHelper;
  }
}
