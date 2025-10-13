import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import fs from "fs";

// Type definitions for better type safety
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

export class LLMHelper {
  private model: GenerativeModel;
  private readonly systemPrompt = `You are Hindsight AI, an expert assistant specializing in problem analysis and solution generation.

Your core competencies include:
- **Software Engineering**: Analyzing code, debugging errors, optimizing algorithms, and providing production-ready solutions
- **Academic Support**: Solving problems across mathematics, sciences, humanities, and standardized tests
- **General Problem-Solving**: Interpreting diagrams, charts, visual data, and complex reasoning tasks

Your approach:
1. Carefully analyze the problem to understand its type and requirements
2. Classify the problem accurately into one of: coding, multiple_choice, q_and_a, general_reasoning, or math
3. Extract all relevant details systematically
4. Provide clear, structured, and actionable solutions`;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      // model: "gemini-2.5-pro",
    });
  }

  /**
   * Analyzes audio from base64 data, transcribes it, and extracts problem information
   */
  public async analyzeAudioFromBase64(
    data: string,
    mimeType: string
  ): Promise<AudioAnalysisResult> {
    try {
      const audioPart = {
        inlineData: { data, mimeType },
      };

      // Step 1: Transcribe audio
      const transcriptionPrompt = `Transcribe the following audio clip accurately. 
Output ONLY the transcribed text with no additional commentary, formatting, or metadata.`;

      const transcriptionResult = await this.model.generateContent([
        transcriptionPrompt,
        audioPart,
      ]);
      const transcribedText = transcriptionResult.response.text().trim();

      if (!transcribedText) {
        throw new Error("Audio transcription failed or returned empty text.");
      }

      // Step 2: Analyze transcribed text and extract problem structure
      const analysisPrompt = `${this.systemPrompt}

Analyze the following transcribed text and perform two tasks:

1. **Classify the Problem Type**: Determine which category best fits:
   - 'coding': Programming tasks, debugging, algorithm questions
   - 'multiple_choice': Quiz questions with multiple options
   - 'q_and_a': Open-ended questions requiring detailed answers
   - 'math': Mathematical problems requiring calculations
   - 'general_reasoning': Logic puzzles, interpretations, analysis tasks

2. **Extract Structured Details**: Based on classification, extract information into the appropriate JSON format.

**TRANSCRIBED TEXT:**
---
${transcribedText}
---

**REQUIRED OUTPUT FORMAT:**

Respond with ONLY a valid JSON object. No markdown, no code blocks, no additional text.

**Examples by Problem Type:**

For 'coding':
{
  "problem_type": "coding",
  "problem_statement": "Clear summary of the coding task or error",
  "details": {
    "language": "python",
    "code_snippet": "The relevant code from the transcription",
    "error_message": "Any error message mentioned (or empty string if none)"
  }
}

For 'multiple_choice':
{
  "problem_type": "multiple_choice",
  "problem_statement": "Summary of the quiz topic",
  "details": {
    "questions": [
      {
        "question_text": "Full text of the question",
        "options": ["Option A text", "Option B text", "Option C text", "Option D text"]
      }
    ]
  }
}

For 'q_and_a', 'math', or 'general_reasoning':
{
  "problem_type": "q_and_a",
  "problem_statement": "The main question being asked",
  "details": {
    "question": "Full question text",
    "context": "Any relevant background information or constraints"
  }
}`;

      const analysisResult = await this.model.generateContent(analysisPrompt);
      const rawText = analysisResult.response.text();
      const cleanText = this.cleanJsonResponse(rawText);

      if (!cleanText) {
        throw new Error(
          "Could not extract valid JSON from the audio analysis response."
        );
      }

      return JSON.parse(cleanText);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("[LLMHelper] JSON parsing error in audio analysis:", error);
        throw new Error("The AI response was not valid JSON. Please try again.");
      }
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

Analyze the provided image(s) and extract problem information:

1. **Understand the Content**: Carefully examine all images to understand the complete problem
2. **Classify the Problem Type**: Determine which category fits. **If the image contains a code snippet, error message, or is primarily about a programming task, it MUST be classified as 'coding', even if there is a natural language question present.** The 'q_and_a' category is for questions that do NOT primarily involve code.
   - 'coding': Code snippets, error messages, programming tasks
   - 'multiple_choice': Questions with multiple choice options
   - 'q_and_a': Questions requiring detailed answers
   - 'math': Mathematical equations, calculations, proofs
   - 'general_reasoning': Logic problems, interpretations, analysis

3. **Extract Structured Data**: Format the information according to the problem type

**OUTPUT REQUIREMENTS:**

Return ONLY a valid JSON object. No markdown, no code blocks, no explanations.

**JSON Format Examples:**

For 'coding':
{
  "problem_type": "coding",
  "problem_statement": "Concise summary of the coding task or error",
  "details": {
    "language": "javascript",
    "code_snippet": "The complete code visible in the image(s)",
    "error_message": "Any error messages shown (or empty string)"
  }
}

For 'multiple_choice':
{
  "problem_type": "multiple_choice",
  "problem_statement": "Topic or subject of the question(s)",
  "details": {
    "questions": [
      {
        "question_text": "Complete question text",
        "options": ["A: First option", "B: Second option", "C: Third option", "D: Fourth option"]
      }
    ]
  }
}

For 'q_and_a', 'math', or 'general_reasoning':
{
  "problem_type": "q_and_a",
  "problem_statement": "The primary question or task",
  "details": {
    "question": "Complete question with all relevant parts",
    "context": "Any diagrams, equations, or supporting information described"
  }
}`;

    try {
      const imageParts = await Promise.all(
        imagePaths.map((path) => this.fileToGenerativePart(path))
      );

      const result = await this.model.generateContent([prompt, ...imageParts]);
      const rawText = result.response.text();
      const cleanText = this.cleanJsonResponse(rawText);

      if (!cleanText) {
        throw new Error(
          "Could not extract valid JSON from the image analysis response."
        );
      }

      return JSON.parse(cleanText);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("[LLMHelper] JSON parsing error in extractProblemFromImages:", error);
        throw new Error("The AI response was not valid JSON. Please try again.");
      }
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
      const result = await this.model.generateContent(prompt);
      const rawText = result.response.text();
      const cleanText = this.cleanJsonResponse(rawText);

      if (!cleanText) {
        throw new Error(
          "Could not extract valid JSON from the solution generation response."
        );
      }

      return JSON.parse(cleanText);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("[LLMHelper] JSON parsing error in generateSolution:", error);
        throw new Error("The AI response was not valid JSON. Please try again.");
      }
      console.error("[LLMHelper] Error in generateSolution:", error);
      throw error;
    }
  }

  /**
   * Builds the appropriate prompt based on problem type
   */
  private buildSolutionPrompt(problemInfo: ProblemInfo): string {
    switch (problemInfo.problem_type) {
      case "coding":
        return this.buildCodingPrompt(problemInfo);
      case "multiple_choice":
      case "q_and_a":
      case "general_reasoning":
        return this.buildQAPrompt(problemInfo);
      case "math":
      default:
        return this.buildMathPrompt(problemInfo);
    }
  }

  /**
   * Builds prompt for coding problems
   */
  private buildCodingPrompt(problemInfo: ProblemInfo): string {
    return `You are a senior software engineer and competitive programming expert.

**OBJECTIVE**: Generate the most optimal, production-ready solution possible.

**PRIORITIES** (in order):
1. **Correctness**: Solution must handle all edge cases correctly
2. **Time Complexity**: Minimize Big O time complexity
3. **Space Complexity**: Minimize Big O space complexity
4. **Code Quality**: Clean, readable, well-documented code

**PROBLEM DETAILS:**
${JSON.stringify(problemInfo, null, 2)}

**RESPONSE REQUIREMENTS:**

1. **Solution Code**:
   - Write the most efficient algorithm possible
   - Include detailed inline comments explaining:
     * Key algorithmic decisions
     * Data structure choices
     * Edge case handling
     * Complex logic sections
   - Use clear variable names
   - Follow best practices for the language

2. **High-Level Explanation**:
   - Explain the approach at a conceptual level
   - Justify data structure and algorithm choices
   - Explain why this approach is optimal
   - Suitable for technical interview discussion

3. **Complexity Analysis**:
   - Provide accurate Big O notation for time and space
   - Brief justification for each

4. **Alternative Solutions** (if applicable):
   - If meaningful trade-offs exist (e.g., time vs space)
   - Explain when the alternative might be preferred

**OUTPUT FORMAT:**

Return ONLY a valid JSON object:

{
  "solution": {
    "focus": "Time Complexity",
    "answer": "def solution(nums):\\n    # HashMap for O(1) lookup\\n    seen = {}\\n    for i, num in enumerate(nums):\\n        # Check if complement exists\\n        if target - num in seen:\\n            return [seen[target - num], i]\\n        seen[num] = i\\n    return []",
    "reasoning": "High-level explanation of the approach and why it's optimal...",
    "time_complexity": "O(n)",
    "space_complexity": "O(n)",
    "code_explanation": [
      {
        "part": "HashMap usage",
        "explanation": "We use a HashMap to achieve O(1) lookups, trading space for time..."
      },
      {
        "part": "Single pass algorithm",
        "explanation": "By checking for the complement during insertion, we only need one pass..."
      }
    ]
  },
  "alternative_solutions": [
    {
      "focus": "Space Complexity",
      "approach": "Two pointer technique with sorted array",
      "time_complexity": "O(n log n)",
      "space_complexity": "O(1)",
      "trade_off": "Better space complexity but requires sorting"
    }
  ]
}`;
  }

  /**
   * Builds prompt for Q&A style problems
   */
  private buildQAPrompt(problemInfo: ProblemInfo): string {
    return `You are a knowledgeable expert across multiple domains.

**OBJECTIVE**: Provide accurate, clear, and helpful answers.

**PROBLEM DETAILS:**
${JSON.stringify(problemInfo, null, 2)}

**RESPONSE REQUIREMENTS:**

1. **Answer Accuracy**: Ensure all answers are factually correct
2. **Clarity**: Present answers in a clear, understandable format
3. **Completeness**: Address all parts of each question
4. **Conciseness**: Be thorough but avoid unnecessary verbosity

**OUTPUT FORMAT:**

Return ONLY a valid JSON object:

{
  "solution": {
    "answer": [
      {
        "question": "What is the capital of France?",
        "correct_option": "Paris is the capital and largest city of France."
      },
      {
        "question": "When was the Eiffel Tower built?",
        "correct_option": "The Eiffel Tower was built between 1887 and 1889."
      }
    ]
  }
}

**NOTES:**
- For multiple choice: State the correct option clearly
- For Q&A: Provide a complete answer to the question
- For general reasoning: Explain your reasoning process`;
  }

  /**
   * Builds prompt for math problems
   */
  private buildMathPrompt(problemInfo: ProblemInfo): string {
    return `You are a mathematics expert with deep knowledge across all mathematical domains.

**OBJECTIVE**: Solve the mathematical problem with clear step-by-step explanations.

**PROBLEM DETAILS:**
${JSON.stringify(problemInfo, null, 2)}

**RESPONSE REQUIREMENTS:**

1. **Solution**: Present the final answer clearly
2. **Work**: Show all steps in your solution
3. **Formatting**: Use proper mathematical notation
4. **Clarity**: Explain each major step

**OUTPUT FORMAT:**

Return ONLY a valid JSON object:

{
  "solution": {
    "answer": "Step 1: Identify the problem type\\n\\nThis is a quadratic equation in the form ax² + bx + c = 0\\n\\nStep 2: Apply the quadratic formula\\n\\nx = [-b ± √(b² - 4ac)] / (2a)\\n\\nStep 3: Substitute values\\n\\na = 1, b = -5, c = 6\\nx = [5 ± √(25 - 24)] / 2\\nx = [5 ± 1] / 2\\n\\nStep 4: Calculate solutions\\n\\nx₁ = (5 + 1) / 2 = 3\\nx₂ = (5 - 1) / 2 = 2\\n\\nFinal Answer: x = 2 or x = 3",
    "reasoning": "This quadratic equation can be solved using the quadratic formula. The discriminant is positive (b² - 4ac = 1), indicating two distinct real solutions."
  }
}`;
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

      // Step 1: Analyze the error
      const errorAnalysis = await this._analyzeDebugError(
        currentCode,
        imageParts
      );

      if (!errorAnalysis?.trim()) {
        throw new Error(
          "Error analysis failed to produce a description of the issue."
        );
      }

      // Step 2: Generate corrected code
      const synthesisPrompt = `${this.systemPrompt}

You are a debugging and code correction expert.

**ORIGINAL PROBLEM:**
${JSON.stringify(problemInfo, null, 2)}

**INCORRECT CODE:**
\`\`\`
${currentCode}
\`\`\`

**ERROR ANALYSIS:**
${errorAnalysis}

**YOUR TASK:**

Generate corrected code that fixes the identified issues while maintaining optimal performance.

**REQUIREMENTS:**

1. **Fix the Error**: Implement the correction described in the error analysis
2. **Maintain Efficiency**: Ensure the fix doesn't compromise time/space complexity
3. **Add Comments**: Include inline comments explaining the fix
4. **Complete Code**: Provide the full corrected code, not just the changed parts

**OUTPUT FORMAT:**

Return ONLY a valid JSON object:

{
  "solution": {
    "answer": "The complete corrected code with comments explaining the fix",
    "reasoning": "${errorAnalysis.replace(/"/g, '\\"')}",
    "time_complexity": "O(n)",
    "space_complexity": "O(1)",
    "suggested_next_steps": [
      "Test with edge cases",
      "Verify the fix handles all error conditions"
    ]
  }
}`;

      const result = await this.model.generateContent(synthesisPrompt);
      const rawText = result.response.text();
      const cleanText = this.cleanJsonResponse(rawText);

      if (!cleanText) {
        throw new Error(
          "Could not extract valid JSON from the debug response."
        );
      }

      const parsed: SolutionResponse = JSON.parse(cleanText);

      // Format code with language-specific markdown
      if (problemInfo.problem_type === "coding" && parsed.solution?.answer) {
        const language =
          problemInfo.details?.language?.toLowerCase() || "python";
        const normalizedLang = language
          .replace("c++", "cpp")
          .split(/[\s(]/)[0];
        parsed.solution.answer = `\`\`\`${normalizedLang}\n${parsed.solution.answer}\n\`\`\``;
      }

      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("[LLMHelper] JSON parsing error in debugSolutionWithImages:", error);
        throw new Error("The AI response was not valid JSON. Please try again.");
      }
      console.error("[LLMHelper] Error in debugSolutionWithImages:", error);
      throw error;
    }
  }

  /**
   * Analyzes code and error images to identify the issue
   */
  private async _analyzeDebugError(
    incorrectCode: string,
    errorImageParts: any[]
  ): Promise<string> {
    const analysisPrompt = `You are a senior debugging expert with deep expertise in identifying and explaining code errors.

**TASK**: Analyze the provided code and error message(s) in the attached image(s).

**INCORRECT CODE:**
\`\`\`
${incorrectCode}
\`\`\`

**REQUIREMENTS:**

Provide a concise analysis that includes:
1. **Root Cause**: What is causing the error?
2. **Specific Issue**: Which line(s) or logic are problematic?
3. **Required Fix**: What needs to be changed to resolve the issue?
4. **Why It Matters**: Briefly explain why this error occurs

**FORMAT**: Plain text explanation (no JSON, no code). Be direct and actionable.`;

    const result = await this.model.generateContent([
      analysisPrompt,
      ...errorImageParts,
    ]);

    return result.response.text();
  }

  /**
   * Analyzes an audio file (legacy support)
   */
  public async analyzeAudioFile(audioPath: string) {
    try {
      const audioData = await fs.promises.readFile(audioPath);
      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: "audio/mp3",
        },
      };

      const prompt = `${this.systemPrompt}

Analyze this audio clip and provide:
1. A concise description of what you hear
2. 2-3 relevant follow-up actions or suggestions based on the content

Be natural and conversational. No JSON format needed.`;

      const result = await this.model.generateContent([prompt, audioPart]);
      const text = result.response.text();

      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("[LLMHelper] Error analyzing audio file:", error);
      throw error;
    }
  }

  /**
   * Analyzes an image file (legacy support)
   */
  public async analyzeImageFile(imagePath: string) {
    try {
      const imageData = await fs.promises.readFile(imagePath);
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png",
        },
      };

      const prompt = `${this.systemPrompt}

Analyze this image concisely:
1. Describe what you see in 1-2 sentences
2. Suggest 2-3 relevant actions the user could take

Be brief and actionable. No JSON format needed.`;

      const result = await this.model.generateContent([prompt, imagePart]);
      const text = result.response.text();

      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("[LLMHelper] Error analyzing image file:", error);
      throw error;
    }
  }

  /**
   * Converts a file to a generative part for the AI model
   */
  private async fileToGenerativePart(imagePath: string) {
    const imageData = await fs.promises.readFile(imagePath);
    return {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/png",
      },
    };
  }

  /**
   * Cleans and extracts JSON from AI response text
   */
  private cleanJsonResponse(text: string): string {
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    const firstBracket = cleaned.indexOf("{");
    const lastBracket = cleaned.lastIndexOf("}");

    if (
      firstBracket === -1 ||
      lastBracket === -1 ||
      lastBracket < firstBracket
    ) {
      console.error(
        "[LLMHelper] Could not find valid JSON object in response:",
        text.substring(0, 200)
      );
      return "";
    }

    return cleaned.substring(firstBracket, lastBracket + 1);
  }
}