import { AppState } from "./main";
import { LLMHelper } from "./LLMHelper";

/**
 * ProcessingHelper handles all AI processing workflows including:
 * - Initial problem extraction from screenshots/audio
 * - Solution generation
 * - Debug/correction workflows
 */
export class ProcessingHelper {
  private appState: AppState;
  private llmHelper: LLMHelper | null = null;
  private currentProcessingAbortController: AbortController | null = null;
  private currentExtraProcessingAbortController: AbortController | null = null;

  constructor(appState: AppState) {
    this.appState = appState;

    // --- TEMPORARY FIX FOR TESTING ---
    // Hardcode your API key here.
    // WARNING: This is insecure. Do not use this in a real application.
    const apiKey = "";

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY has not been set. LLMHelper will not be initialized."
      );
    } else {
      this.llmHelper = new LLMHelper(apiKey);
      console.log("LLMHelper initialized successfully.");
    }
  }

  /**
   * Sets or updates the API key and reinitializes the LLMHelper
   */
  public setApiKey(apiKey: string): void {
    if (apiKey && typeof apiKey === "string" && apiKey.trim() !== "") {
      this.llmHelper = new LLMHelper(apiKey);
      console.log("API Key has been set and LLMHelper is now active.");
    } else {
      console.error("An invalid API key was provided.");
      this.llmHelper = null;
    }
  }

  /**
   * Checks if the LLMHelper is available and ready to process
   */
  private isLLMHelperAvailable(): boolean {
    const mainWindow = this.appState.getMainWindow();
    
    if (!this.llmHelper) {
      console.log("Processing blocked: API key is not set.");
      if (mainWindow) {
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.UNAUTHORIZED
        );
      }
      return false;
    }
    
    return true;
  }

  /**
   * Handles errors during processing and sends appropriate notifications
   */
  private handleProcessingError(
    error: any,
    eventType: string,
    context: string
  ): void {
    const mainWindow = this.appState.getMainWindow();
    if (!mainWindow) return;

    console.error(`Error during ${context}:`, error);

    let userMessage = "An unexpected error occurred. Please try again.";

    // Provide more specific error messages based on error type
    if (error.message?.includes("JSON")) {
      userMessage =
        "The AI response format was invalid. This usually resolves by trying again.";
    } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
      userMessage =
        "Network error. Please check your internet connection and try again.";
    } else if (error.message?.includes("API key")) {
      userMessage =
        "API key issue detected. Please verify your API key is valid.";
    } else if (error.message?.includes("transcription")) {
      userMessage =
        "Failed to transcribe audio. Please ensure the audio is clear and try again.";
    }

    mainWindow.webContents.send(eventType, userMessage);
  }

  /**
   * Processes audio data as a problem statement
   * Flow: Audio → Transcription → Problem Extraction → Solution Generation
   */
  public async processAudioAsProblem(
    data: string,
    mimeType: string
  ): Promise<void> {
    const mainWindow = this.appState.getMainWindow();
    if (!mainWindow) {
      console.error("Main window not available for audio processing.");
      return;
    }

    if (!this.isLLMHelperAvailable()) {
      return;
    }

    try {
      // Notify UI that processing has started
      mainWindow.webContents.send(
        this.appState.PROCESSING_EVENTS.INITIAL_START
      );
      this.appState.clearQueues();
      this.appState.setView("solutions");

      console.log("[Audio Processing] Step 1: Transcribing and analyzing audio...");
      
      const problemInfo = await this.llmHelper!.analyzeAudioFromBase64(
        data,
        mimeType
      );
      
      console.log("[Audio Processing] Step 2: Problem extracted successfully:", {
        type: problemInfo.problem_type,
        statement: problemInfo.problem_statement.substring(0, 100) + "...",
      });

      // Send problem info to renderer
      mainWindow.webContents.send(
        this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
        problemInfo
      );
      this.appState.setProblemInfo(problemInfo);

      console.log("[Audio Processing] Step 3: Generating solution...");
      
      const solutionResult = await this.llmHelper!.generateSolution(problemInfo);
      
      console.log("[Audio Processing] Step 4: Solution generated successfully");

      // Send solution to renderer
      this.appState.setSolutionInfo(solutionResult);
      mainWindow.webContents.send(
        this.appState.PROCESSING_EVENTS.SOLUTION_SUCCESS,
        solutionResult
      );
    } catch (error: any) {
      this.handleProcessingError(
        error,
        this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
        "audio processing"
      );
    }
  }

  /**
   * Processes screenshots from the queue
   * Handles both initial processing and debug workflows
   */
  public async processScreenshots(): Promise<void> {
    const mainWindow = this.appState.getMainWindow();
    if (!mainWindow) {
      console.error("Main window not available for screenshot processing.");
      return;
    }

    if (!this.isLLMHelperAvailable()) {
      return;
    }

    const view = this.appState.getView();

    if (view === "queue") {
      await this.processInitialScreenshots();
    } else {
      await this.processDebugScreenshots();
    }
  }

  /**
   * Processes initial screenshots to extract problem and generate solution
   */
  private async processInitialScreenshots(): Promise<void> {
    const mainWindow = this.appState.getMainWindow();
    if (!mainWindow) return;

    const screenshotQueue = this.appState
      .getScreenshotHelper()
      .getScreenshotQueue();

    if (screenshotQueue.length === 0) {
      console.log("No screenshots in queue for initial processing.");
      mainWindow.webContents.send(
        this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS
      );
      return;
    }

    console.log(
      `[Initial Processing] Starting with ${screenshotQueue.length} screenshot(s)`
    );

    // Notify UI and prepare state
    mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_START);
    this.appState.setView("solutions");
    this.currentProcessingAbortController = new AbortController();

    try {
      console.log("[Initial Processing] Step 1: Extracting problem from images...");
      
      const problemInfo = await this.llmHelper!.extractProblemFromImages(
        screenshotQueue
      );
      
      console.log("[Initial Processing] Step 2: Problem extracted successfully:", {
        type: problemInfo.problem_type,
        statement: problemInfo.problem_statement.substring(0, 100) + "...",
      });

      // Send problem info to renderer
      mainWindow.webContents.send(
        this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
        problemInfo
      );
      this.appState.setProblemInfo(problemInfo);

      console.log("[Initial Processing] Step 3: Generating optimal solution...");
      
      const solutionResult = await this.llmHelper!.generateSolution(problemInfo);
      
      console.log("[Initial Processing] Step 4: Solution generated successfully");

      // Send solution to renderer
      this.appState.setSolutionInfo(solutionResult);
      mainWindow.webContents.send(
        this.appState.PROCESSING_EVENTS.SOLUTION_SUCCESS,
        solutionResult
      );
    } catch (error: any) {
      this.handleProcessingError(
        error,
        this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
        "initial screenshot processing"
      );
    } finally {
      this.currentProcessingAbortController = null;
    }
  }

  /**
   * Processes debug screenshots to correct existing solution
   */
  private async processDebugScreenshots(): Promise<void> {
    const mainWindow = this.appState.getMainWindow();
    if (!mainWindow) return;

    const extraScreenshotQueue = this.appState
      .getScreenshotHelper()
      .getExtraScreenshotQueue();

    if (extraScreenshotQueue.length === 0) {
      console.log("No screenshots in extra queue for debug processing.");
      mainWindow.webContents.send(
        this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS
      );
      return;
    }

    console.log(
      `[Debug Processing] Starting with ${extraScreenshotQueue.length} screenshot(s)`
    );

    // Notify UI that debug has started
    mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_START);
    this.currentExtraProcessingAbortController = new AbortController();

    try {
      const problemInfo = this.appState.getProblemInfo();
      const currentSolution = this.appState.getSolutionInfo();

      // Validate that we have the necessary information to debug
      if (!problemInfo || !currentSolution) {
        throw new Error(
          "Cannot debug: Missing initial problem or solution information."
        );
      }

      if (!currentSolution.solution?.answer) {
        throw new Error(
          "Cannot debug: No solution code available to debug."
        );
      }

      // Validate that this is a coding problem (debugging only works for code)
      if (problemInfo.problem_type !== "coding") {
        throw new Error(
          "Cannot debug: Debugging is only available for coding problems."
        );
      }

      // Ensure the answer is a string (code) not structured answers
      const currentCode = currentSolution.solution.answer;
      if (typeof currentCode !== "string") {
        throw new Error(
          "Cannot debug: Current solution is not in code format."
        );
      }

      console.log("[Debug Processing] Step 1: Analyzing error from screenshots...");
      
      const debugResult = await this.llmHelper!.debugSolutionWithImages(
        problemInfo,
        currentCode,
        extraScreenshotQueue
      );
      
      console.log("[Debug Processing] Step 2: Corrected solution generated successfully");

      // Update state with debugged solution
      this.appState.setSolutionInfo(debugResult);
      this.appState.setHasDebugged(true);

      // Send debug success to renderer
      mainWindow.webContents.send(
        this.appState.PROCESSING_EVENTS.DEBUG_SUCCESS,
        debugResult
      );

      // Clean up extra screenshots after successful debug
      console.log("[Debug Processing] Step 3: Cleaning up debug screenshots...");
      await this.appState.getScreenshotHelper().clearExtraQueueFiles();
    } catch (error: any) {
      this.handleProcessingError(
        error,
        this.appState.PROCESSING_EVENTS.DEBUG_ERROR,
        "debug screenshot processing"
      );
    } finally {
      this.currentExtraProcessingAbortController = null;
    }
  }

  /**
   * Cancels all ongoing AI processing requests
   */
  public cancelOngoingRequests(): void {
    console.log("Cancelling all ongoing AI requests...");

    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort();
      this.currentProcessingAbortController = null;
      console.log("Initial processing request cancelled.");
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort();
      this.currentExtraProcessingAbortController = null;
      console.log("Debug processing request cancelled.");
    }

    this.appState.setHasDebugged(false);
  }

  /**
   * Processes a single audio file for analysis (legacy support)
   * Returns descriptive text rather than structured problem data
   */
  public async processAudioFile(filePath: string): Promise<any> {
    if (!this.llmHelper) {
      console.error("Cannot process audio file: LLMHelper not initialized.");
      return null;
    }

    try {
      console.log(`[Audio File] Analyzing audio file: ${filePath}`);
      const result = await this.llmHelper.analyzeAudioFile(filePath);
      console.log("[Audio File] Analysis complete");
      return result;
    } catch (error) {
      console.error("Error processing audio file:", error);
      return null;
    }
  }

  /**
   * Gets the LLMHelper instance for direct access if needed
   */
  public getLLMHelper(): LLMHelper | null {
    return this.llmHelper;
  }

  /**
   * Checks if the processor is ready to handle requests
   */
  public isReady(): boolean {
    return this.llmHelper !== null;
  }
}