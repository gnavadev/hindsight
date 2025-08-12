import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import fs from "fs";

export class LLMHelper {
  private model: GenerativeModel;
  private readonly systemPrompt = `You are Hindsight AI, a helpful and proactive assistant. Your specialty is analyzing images to identify and solve a wide range of problems, including:
  - **Coding & Debugging Tasks**: Analyzing screenshots of code, error messages, or IDEs.
  - **Academic Questions**: Solving multiple-choice, short answer, or essay questions from subjects like math, science, history, etc.
  - **General Reasoning**: Interpreting diagrams, charts, or general situations.

  For any user input, you will first analyze and classify the problem, then provide a structured and actionable solution.`;
  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      // model: "gemini-2.5-pro",
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
  }

  // Add this new private method to your LLMHelper class
  private async _analyzeDebugError(
    incorrectCode: string,
    errorImageParts: any[] // Pass the generated image parts here
  ): Promise<string> {
    // A simple, non-JSON prompt focused ONLY on analysis.
    const analysisPrompt = `You are a senior debugging expert.
Analyze the provided code and the error message in the attached image.
In one or two sentences, describe the specific error and what needs to be changed in the code to fix it.
Do NOT write the corrected code. Only provide your plain-text analysis.

INCORRECT CODE:
---
${incorrectCode}
---
`;

    console.log("[LLMHelper] Calling Gemini LLM for error analysis...");
    const result = await this.model.generateContent([
      analysisPrompt,
      ...errorImageParts,
    ]);

    return result.response.text();
  }

  private async fileToGenerativePart(imagePath: string) {
    const imageData = await fs.promises.readFile(imagePath);
    return {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/png",
      },
    };
  }

  private cleanJsonResponse(text: string): string {
    const firstBracket = text.indexOf("{");
    const lastBracket = text.lastIndexOf("}");

    if (
      firstBracket === -1 ||
      lastBracket === -1 ||
      lastBracket < firstBracket
    ) {
      console.error("Could not find a valid JSON object in the response text.");
      return text;
    }

    return text.substring(firstBracket, lastBracket + 1);
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const imageParts = await Promise.all(
        imagePaths.map((path) => this.fileToGenerativePart(path))
      );

      const prompt = `${this.systemPrompt}\n\nAnalyze the user-provided image(s) and perform two steps:
1.  **Classify the Problem**: Determine the type of problem. It must be one of: 'coding', 'multiple_choice', 'q_and_a', 'general_reasoning', 'math'.
2.  **Extract Details**: Based on the classification, extract the relevant information into the correct JSON structure as shown in the examples.

Your output will be a single JSON object.

**JSON FORMAT EXAMPLES:**

* **For 'coding'**:
    {
      "problem_type": "coding",
      "problem_statement": "A summary of the coding task or error.",
      "details": {
        "language": "e.g., Python, JavaScript",
        "code_snippet": "The main block of code.",
        "error_message": "Any error message shown, if applicable."
      }
    }

* **For 'multiple_choice'**:
    {
      "problem_type": "multiple_choice",
      "problem_statement": "A summary of the quiz topic.",
      "details": {
        "questions": [
          {
            "question_text": "The full text of the first question.",
            "options": ["Option A", "Option B"]
          }
        ]
      }
    }

* **For 'q_and_a' or 'math'**:
    {
      "problem_type": "q_and_a",
      "problem_statement": "The user's primary question.",
      "details": {
        "question": "The full text of the question.",
        "context": "Any surrounding text or data needed to answer."
      }
    }
`;

      const result = await this.model.generateContent([prompt, ...imageParts]);

      const rawText = result.response.text();
      const cleanText = this.cleanJsonResponse(rawText);
      return JSON.parse(cleanText);
    } catch (error) {
      console.error("Error extracting problem from images:", error);
      throw error;
    }
  }

  public async generateSolution(problemInfo: any) {
    const prompt = `${
      this.systemPrompt
    }\n\nBased on the following classified problem, generate a helpful solution in the specified JSON format.

The problem type is: **${problemInfo.problem_type}**

**Problem Details:**
${JSON.stringify(problemInfo, null, 2)}

**Instructions for Your Response Content:**
-   If the problem_type is **'coding'**, the "answer" field should contain only the complete, raw code. Your priorities for the code are: 1-correctness, 2-efficiency, 3-clarity(Cyclomatic Complexity). Also provide 'time_complexity' and 'space_complexity' in Big O notation.
-   If the problem_type is **'multiple_choice'**, the "answer" field should be a Markdown-formatted string. For each question, use a heading (e.g., '### Question 1'), and then on new lines, use the format: "**Correct Answer:** [The Answer]" and "**Justification:** [The Explanation]".
-   If the problem_type is **'q_and_a'** or **'math'**, the "answer" field should be a clear, well-formatted textual explanation.

**JSON Response Format:**
{
  "solution": {
    "answer": "The solution content, following the rules above.",
    "reasoning": "A high-level summary of the overall approach taken, explaining the reasoning behind every decision.",
    "time_complexity": "For 'coding' problems, the Big O time complexity (e.g., 'O(n)'). For others, null.",
    "space_complexity": "For 'coding' problems, the Big O space complexity (e.g., 'O(1)'). For others, null.",
    "suggested_next_steps": ["A relevant follow-up action.", "Another possible action."]
  }
}
`;
    let result: any;
    console.log("[LLMHelper] Calling Gemini LLM for solution...");
    try {
      result = await this.model.generateContent(prompt);
      const text = this.cleanJsonResponse(result.response.text());

      if (!text) {
        console.error(
          "[LLMHelper] The API response did not contain a valid JSON object."
        );
        throw new Error("The API response was empty or malformed.");
      }
      const parsed = JSON.parse(text);
      console.log("[LLMHelper] Parsed LLM response:", parsed);

      return parsed;
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      if (result && result.response) {
        console.error(
          "[LLMHelper] Raw text that failed to parse:",
          result.response.text()
        );
      }
      throw error;
    }
  }

  /**
   * Analyzes new images (e.g., error messages) to correct a previous solution.
   *
   * @param problemInfo The original problem classification from `extractProblemFromImages`.
   * @param currentCode The user's current, potentially incorrect, code or solution text.
   * @param debugImagePaths Paths to new images showing the error or issue.
   * @returns A new solution object in the same format as `generateSolution`.
   */
  // Replace the existing debugSolutionWithImages with this new version.
  public async debugSolutionWithImages(
    problemInfo: any,
    currentCode: string,
    debugImagePaths: string[]
  ) {
    try {
      const imageParts = await Promise.all(
        debugImagePaths.map((path) => this.fileToGenerativePart(path))
      );

      const errorAnalysis = await this._analyzeDebugError(
        currentCode,
        imageParts
      );
      console.log("[LLMHelper] Received error analysis:", errorAnalysis);

      if (!errorAnalysis || errorAnalysis.trim() === "") {
        throw new Error(
          "The analysis step failed to produce a description of the error."
        );
      }

      const synthesisPrompt = `${this.systemPrompt}

You are a code synthesis expert. Your task is to write corrected code based on a provided analysis.

**1. The Original Problem:**
${JSON.stringify(problemInfo, null, 2)}

**2. The User's INCORRECT Code:**
${currentCode}

**3. REQUIRED FIX (Analysis of the error):**
${errorAnalysis}

---
**YOUR TASK:**
Write NEW code that implements the "REQUIRED FIX".
- The "answer" field must contain ONLY the raw corrected code.
- Use the provided "REQUIRED FIX" analysis as the "reasoning" for your solution.

**JSON Response Format:**
{
  "solution": {
    "answer": "The raw corrected code. No markdown.",
    "reasoning": "${errorAnalysis.replace(/"/g, '\\"')}",
    "time_complexity": "The Big O time complexity for your corrected code.",
    "space_complexity": "The Big O space complexity for your corrected code.",
    "suggested_next_steps": ["A relevant follow-up action based on the fix."]
  }
}
`;

      console.log("[LLMHelper] Calling Gemini LLM for code synthesis...");
      const result = await this.model.generateContent(synthesisPrompt);
      const cleanText = this.cleanJsonResponse(result.response.text());
      const parsed = JSON.parse(cleanText);

      console.log("[LLMHelper] Parsed debug LLM response:", parsed);

      if (problemInfo.problem_type === "coding" && parsed.solution?.answer) {
        const language =
          problemInfo.details?.language?.toLowerCase() || "python";
        parsed.solution.answer = `\`\`\`${language}\n${parsed.solution.answer}\n\`\`\``;
      }

      return parsed;
    } catch (error) {
      console.error("Error in debugSolutionWithImages:", error);
      throw error;
    }
  }
  public async analyzeAudioFile(audioPath: string) {
    try {
      const audioData = await fs.promises.readFile(audioPath);
      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: "audio/mp3",
        },
      };
      const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user.`;
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio file:", error);
      throw error;
    }
  }
  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    try {
      const audioPart = {
        inlineData: {
          data,
          mimeType,
        },
      };
      const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user and be concise.`;
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio from base64:", error);
      throw error;
    }
  }
  public async analyzeImageFile(imagePath: string) {
    try {
      const imageData = await fs.promises.readFile(imagePath);
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png",
        },
      };
      const prompt = `${this.systemPrompt}\n\nDescribe the content of this image in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the image. Do not return a structured JSON object, just answer naturally as you would to a user. Be concise and brief.`;
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing image file:", error);
      throw error;
    }
  }
}
