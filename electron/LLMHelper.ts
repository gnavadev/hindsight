import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from "@google/generative-ai";
import fs from "fs";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AudioAnalysisResult {
  problem_type: string;
  problem_statement: string;
  details: Record<string, any>;
}

interface ProblemInfo {
  problem_type: string;
  problem_statement: string;
  details?: Record<string, any>;
}

interface SolutionResponse {
  solution: {
    focus?: string;
    answer: string | Array<{ question: string; correct_option: string }>;
    reasoning: string;
    time_complexity?: string;
    space_complexity?: string;
    code_explanation?: Array<{ part: string; explanation: string }>;
    suggested_next_steps?: string[];
  };
  alternative_solutions?: any[];
}

// ============================================================================
// LLM HELPER CLASS
// ============================================================================

export class LLMHelper {
  private model: GenerativeModel;
  
  // Using the model you confirmed works.
  private readonly MODEL_NAME = "gemini-2.5-pro"; 

  private readonly systemPrompt = `You are Hindsight AI, an expert assistant specializing in problem analysis and solution generation.

Your core competencies include:
- **Software Engineering**: Analyzing code, debugging errors, optimizing algorithms.
- **Academic Support**: Solving problems across mathematics, sciences, humanities.
- **General Problem-Solving**: Interpreting visual data and complex reasoning.

Your approach:
1. Classify the problem accurately.
2. Extract all relevant details systematically.
3. Provide clear, structured, and actionable solutions.`;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: this.MODEL_NAME,
    });
  }

  /**
   * Wrapper to handle Rate Limits (429) and Server Errors (503) with Exponential Backoff
   */
  private async generateWithRetry(
    parts: any[], 
    config: GenerationConfig = {},
    maxRetries = 3
  ): Promise<string> {
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        const result = await this.model.generateContent({
          contents: [{ role: "user", parts: parts }],
          generationConfig: config,
        });
        return result.response.text();

      } catch (error: any) {
        attempt++;
        
        const isRateLimit = error.status === 429 || error.message?.includes("429") || error.message?.includes("Quota");
        const isOverload = error.status === 503;

        if ((isRateLimit || isOverload) && attempt <= maxRetries) {
          const delayMs = Math.pow(2, attempt) * 2000; 
          console.warn(`[LLMHelper] Quota hit. Retrying in ${delayMs}ms (Attempt ${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Max retries exceeded.");
  }

  /**
   * Analyzes audio from base64 data
   */
  public async analyzeAudioFromBase64(
    data: string,
    mimeType: string
  ): Promise<AudioAnalysisResult> {
    try {
      const audioPart = { inlineData: { data, mimeType } };

      const transcriptionPrompt = `Transcribe the following audio clip accurately. Output ONLY the transcribed text.`;
      const transcribedText = (await this.generateWithRetry(
        [{ text: transcriptionPrompt }, audioPart]
      )).trim();

      if (!transcribedText) throw new Error("Audio transcription failed.");

      const analysisPrompt = `${this.systemPrompt}

Analyze the transcribed text:
1. Classify: 'coding', 'multiple_choice', 'q_and_a', 'math', or 'general_reasoning'
2. Extract Details: JSON format.

**TRANSCRIBED TEXT:**
${transcribedText}

**OUTPUT:** Valid JSON object only.`;

      const jsonText = await this.generateWithRetry(
        [{ text: analysisPrompt }],
        { responseMimeType: "application/json" }
      );

      return JSON.parse(this.cleanJsonResponse(jsonText));
    } catch (error) {
      console.error("[LLMHelper] Error in analyzeAudioFromBase64:", error);
      throw error;
    }
  }

  /**
   * Extracts problem information from multiple images
   */
  public async extractProblemFromImages(
    imagePaths: string[]
  ): Promise<ProblemInfo> {
    const prompt = `${this.systemPrompt}

Analyze the provided image(s).

**STEP 1: CLASSIFY THE PROBLEM TYPE**
Determine the category based on visual content:
- 'coding': If the image contains code snippets, IDE screenshots, or error messages. **(Priority: If code is visible, it is ALWAYS 'coding')**
- 'multiple_choice': If it looks like a quiz with labeled options (A, B, C, D).
- 'math': If it contains mathematical equations, geometry, or calculus.
- 'q_and_a': General text-based questions.
- 'general_reasoning': Logic puzzles, charts, or data analysis.

**STEP 2: EXTRACT DATA INTO STRICT JSON**
You must return a FLAT JSON object. **DO NOT** nest content inside a "data" key.

**REQUIRED JSON SCHEMAS:**

**Type 1: 'coding'**
{
  "problem_type": "coding",
  "problem_statement": "FULL text of the problem description/question",
  "details": {
    "language": "python", 
    "code_snippet": "The raw code text visible in the image",
    "error_message": "Any visible error text"
  }
}

**Type 2: 'multiple_choice'**
{
  "problem_type": "multiple_choice",
  "problem_statement": "The main question text",
  "details": {
    "options": ["Option A", "Option B", "Option C", "Option D"]
  }
}

**Type 3: 'math' / 'q_and_a' / 'general_reasoning'**
{
  "problem_type": "q_and_a", 
  "problem_statement": "The full question or task",
  "details": {
    "context": "Any additional context or constraints"
  }
}

**CRITICAL CONSTRAINTS:**
1. **Root Level Only**: 'problem_statement' must be at the top level.
2. **No Infinite Loops**: Do not generate endless test cases.
3. **Stop Token**: Stop generating immediately after the closing '}' of the JSON object.
`;

    try {
      const imageParts = await Promise.all(
        imagePaths.map((path) => this.fileToGenerativePart(path))
      );

      const jsonText = await this.generateWithRetry(
        [{ text: prompt }, ...imageParts],
        { responseMimeType: "application/json" }
      );

      return JSON.parse(this.cleanJsonResponse(jsonText));
    } catch (error) {
      console.error("[LLMHelper] Error extracting problem from images:", error);
      throw error;
    }
  }

  /**
   * Generates a solution based on the problem information
   */
  public async generateSolution(problemInfo: ProblemInfo): Promise<SolutionResponse> {
    const prompt = this.buildSolutionPrompt(problemInfo);

    try {
      const jsonText = await this.generateWithRetry(
        [{ text: prompt }],
        { responseMimeType: "application/json" }
      );

      return JSON.parse(this.cleanJsonResponse(jsonText));
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      throw new Error("Failed to generate valid JSON solution.");
    }
  }

  /**
   * Debugs solution with error images
   */
  public async debugSolutionWithImages(
    problemInfo: ProblemInfo,
    currentCode: string,
    debugImagePaths: string[]
  ): Promise<SolutionResponse> {
    try {
      const imageParts = await Promise.all(
        debugImagePaths.map((path) => this.fileToGenerativePart(path))
      );

      // 1. Get Textual Analysis of the visual error
      const errorAnalysis = await this._analyzeDebugError(
        currentCode,
        imageParts
      );

      if (!errorAnalysis?.trim()) throw new Error("Error analysis failed.");

      // 2. Generate Corrected Code
      const synthesisPrompt = `${this.systemPrompt}

You are a debugging expert.
**ORIGINAL PROBLEM:** ${JSON.stringify(problemInfo)}
**INCORRECT CODE:** \n${currentCode}\n
**ERROR ANALYSIS:** ${errorAnalysis}

**TASK:**
Fix the code based on the error analysis.

**RESPONSE FORMAT (Strict JSON):**
{
  "solution": {
    "answer": "THE COMPLETE CORRECTED CODE. Do not truncate. Return the full file so diffs work.",
    "reasoning": "Explain exactly what was fixed and why based on the error analysis.",
    "focus": "Debugging",
    "time_complexity": "O(n)",
    "space_complexity": "O(n)"
  }
}
`;

      const jsonText = await this.generateWithRetry(
        [{ text: synthesisPrompt }],
        { responseMimeType: "application/json" }
      );

      const cleanText = this.cleanJsonResponse(jsonText);
      const parsed: SolutionResponse = JSON.parse(cleanText);

      // 3. Ensure strict type safety and markdown wrapping
      if (
        problemInfo.problem_type === "coding" && 
        parsed.solution?.answer && 
        typeof parsed.solution.answer === 'string' 
      ) {
        const language = problemInfo.details?.language?.toLowerCase() || "python";
        if (!parsed.solution.answer.startsWith("```")) {
            parsed.solution.answer = `\`\`\`${language}\n${parsed.solution.answer}\n\`\`\``;
        }
      }

      return parsed;
    } catch (error) {
      console.error("[LLMHelper] Error in debugSolutionWithImages:", error);
      throw error;
    }
  }

  /**
   * Analyzes debug images (Plain Text Response)
   * FIX: Explicitly asks to read Console/Terminal output
   */
  private async _analyzeDebugError(
    incorrectCode: string,
    errorImageParts: any[]
  ): Promise<string> {
    const analysisPrompt = `
Analyze the provided screenshot(s) for debugging.

**LOOK FOR:**
1. **Console/Terminal Output**: Read any text in the "Run" or "Console" panels. Look for "SyntaxError", "Runtime Error", or stack traces.
2. **Visual Indicators**: Look for red squiggles, error icons, or highlighted lines in the code editor.
3. **The Code**: Compare the visible code against the console errors.

**OUTPUT:**
Provide a concise root cause analysis. Quote the specific error message if visible in the screenshot.
`;
    
    return await this.generateWithRetry([
        { text: analysisPrompt },
        ...errorImageParts
    ]);
  }

  // ============================================================================
  // HELPERS & PROMPTS
  // ============================================================================

  private buildSolutionPrompt(problemInfo: ProblemInfo): string {
    switch (problemInfo.problem_type) {
      case "coding": return this.buildCodingPrompt(problemInfo);
      case "multiple_choice":
      case "q_and_a":
      case "general_reasoning": return this.buildQAPrompt(problemInfo);
      case "math":
      default: return this.buildMathPrompt(problemInfo);
    }
  }

  private buildCodingPrompt(problemInfo: ProblemInfo): string {
    return `You are a senior software engineer.
**OBJECTIVE**: Generate optimal solution.
**PROBLEM DETAILS:** ${JSON.stringify(problemInfo, null, 2)}
**RESPONSE REQUIREMENTS:**
Return a JSON object:
{ "solution": { "focus": "Time Complexity", "answer": "code...", "reasoning": "...", "time_complexity": "...", "space_complexity": "...", "code_explanation": [] }, "alternative_solutions": [] }`;
  }

  private buildQAPrompt(problemInfo: ProblemInfo): string {
    return `You are a knowledgeable expert.
**PROBLEM DETAILS:** ${JSON.stringify(problemInfo, null, 2)}
**RESPONSE REQUIREMENTS:**
Return a JSON object: { "solution": { "answer": "Detailed answer or options", "reasoning": "..." } }`;
  }

  private buildMathPrompt(problemInfo: ProblemInfo): string {
    return `You are a mathematics expert.
**PROBLEM DETAILS:** ${JSON.stringify(problemInfo, null, 2)}
**RESPONSE REQUIREMENTS:**
Return a JSON object: { "solution": { "answer": "Step-by-step solution", "reasoning": "..." } }`;
  }

  public async analyzeAudioFile(audioPath: string) {
    try {
      const audioData = await fs.promises.readFile(audioPath);
      const text = await this.generateWithRetry([
        { text: "Describe what you hear concisely." },
        { inlineData: { data: audioData.toString("base64"), mimeType: "audio/mp3" } }
      ]);
      return { text, timestamp: Date.now() };
    } catch (error) { return { text: "Error analyzing audio", timestamp: Date.now() }; }
  }

  public async analyzeImageFile(imagePath: string) {
    try {
      const imageData = await fs.promises.readFile(imagePath);
      const text = await this.generateWithRetry([
        { text: "Describe this image concisely." },
        { inlineData: { data: imageData.toString("base64"), mimeType: "image/png" } }
      ]);
      return { text, timestamp: Date.now() };
    } catch (error) { return { text: "Error analyzing image", timestamp: Date.now() }; }
  }

  private async fileToGenerativePart(imagePath: string) {
    const imageData = await fs.promises.readFile(imagePath);
    return { inlineData: { data: imageData.toString("base64"), mimeType: "image/png" } };
  }

  private cleanJsonResponse(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?/, "").replace(/```$/, "");
    cleaned = cleaned.trim();
    const firstBracket = cleaned.indexOf("{");
    const lastBracket = cleaned.lastIndexOf("}");
    if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) return text; 
    return cleaned.substring(firstBracket, lastBracket + 1);
  }
}