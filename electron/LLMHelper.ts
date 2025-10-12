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
      model: "gemini-2.5-flash-lite",
      // model: "gemini-2.5-pro",
    });
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    try {
      const audioPart = {
        inlineData: { data, mimeType },
      };

      const transcriptionPrompt = `Transcribe the following audio clip. Output only the transcribed text and nothing else.`;
      const transcriptionResult = await this.model.generateContent([
        transcriptionPrompt,
        audioPart,
      ]);
      const transcribedText = transcriptionResult.response.text();

      if (!transcribedText || transcribedText.trim() === "") {
        throw new Error("Audio transcription failed or returned empty text.");
      }

      const analysisPrompt = `${this.systemPrompt}\n\nAnalyze the following user-provided text and perform two steps:
1.  **Classify the Problem**: Determine the type of problem based on the text. It must be one of: 'coding', 'multiple_choice', 'q_and_a', 'general_reasoning', 'math'.
2.  **Extract Details**: Based on the classification, extract the relevant information into the correct JSON structure as shown in the examples.

**USER-PROVIDED TEXT:**
---
${transcribedText}
---

Your output must be a single JSON object. Do not include any other text or formatting.

**JSON FORMAT EXAMPLES:**

* **For 'coding'**:
    {
      "problem_type": "coding",
      "problem_statement": "A summary of the coding task or error.",
      "details": {
        "language": "e.g., cpp, python, javacript",
        "code_snippet": "The main block of code from the text.",
        "error_message": "Any error message mentioned in the text."
      }
    }

* **For 'multiple_choice'**:
    {
      "problem_type": "multiple_choice",
      "problem_statement": "A summary of the quiz topic from the text.",
      "details": {
        "questions": [
          {
            "question_text": "The full text of the first question mentioned.",
            "options": ["Option A", "Option B"]
          }
        ]
      }
    }

* **For 'q_and_a' or 'math'**:
    {
      "problem_type": "q_and_a",
      "problem_statement": "The user's primary question from the text.",
      "details": {
        "question": "The full text of the question from the text.",
        "context": "Any surrounding context mentioned in the text."
      }
    }
`;

      // Step 3: Call the model to get the structured JSON object.
      const analysisResult = await this.model.generateContent(analysisPrompt);
      const rawText = analysisResult.response.text();
      const cleanText = this.cleanJsonResponse(rawText);

      if (!cleanText) {
        throw new Error(
          "Could not extract a JSON object from the LLM's text analysis."
        );
      }

      try {
        return JSON.parse(cleanText); // Return the final structured object
      } catch (parseError) {
        console.error(
          "[LLMHelper] Failed to parse JSON response in audio analysis."
        );
        console.error("[LLMHelper] Raw text that failed:", rawText);
        throw new Error(
          "The LLM response for audio analysis was not valid JSON."
        );
      }
    } catch (error) {
      console.error("Error in analyzeAudioFromBase64:", error);
      throw error;
    }
  }

  // --- No other functions in this file were changed ---

  private async _analyzeDebugError(
    incorrectCode: string,
    errorImageParts: any[] // Pass the generated image parts here
  ): Promise<string> {
    const analysisPrompt = `You are a senior debugging expert.
Analyze the provided code and the error message in the attached image.
Describe the specific error and what needs to be changed in the code to fix it, be concise and direct.
Do NOT write the corrected code. Only provide your plain-text analysis.

INCORRECT CODE:
---
${incorrectCode}
---
`;

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
      return "";
    }

    return text.substring(firstBracket, lastBracket + 1);
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    const prompt = `${this.systemPrompt}\n\nSynthesize the information from all of the user-provided image(s) into a single, cohesive problem description. and perform two steps:
1.  **Classify the Problem**: Determine the type of problem. It must be one of: 'coding', 'multiple_choice', 'q_and_a', 'general_reasoning', 'math'.
2.  **Extract Details**: Based on the classification, extract the relevant information into the correct JSON structure as shown in the examples.

Your output will be a single JSON object.

**JSON FORMAT EXAMPLES:**

* **For 'coding'**:
    {
      "problem_type": "coding",
      "problem_statement": "A summary of the coding task or error.",
      "details": {
        "language": "e.g., cpp, python, javascript",
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

    try {
      const imageParts = await Promise.all(
        imagePaths.map((path) => this.fileToGenerativePart(path))
      );

      const result = await this.model.generateContent([prompt, ...imageParts]);
      const rawText = result.response.text();
      const cleanText = this.cleanJsonResponse(rawText);

      if (!cleanText) {
        throw new Error(
          "Could not extract a JSON object from the LLM response."
        );
      }

      try {
        return JSON.parse(cleanText);
      } catch (parseError) {
        console.error(
          "[LLMHelper] Failed to parse JSON response in extractProblemFromImages."
        );
        console.error("[LLMHelper] Raw text that failed:", rawText);
        throw new Error("The LLM response was not valid JSON.");
      }
    } catch (error) {
      console.error("Error extracting problem from images:", error);
      throw error;
    }
  }

  // LLMHelper.ts

  public async generateSolution(problemInfo: any) {
    const prompt = `You are an expert software engineer who excels in technical interviews and competitive programming (like LeetCode).
Your primary goal is to generate the most optimal, production-grade code possible based on the user's problem.

**Your priorities are, in this exact order:**
1.  **Correctness & Reliability**: The code must produce the correct result for all edge cases.
2.  **Time Complexity**: The solution must have the lowest possible Big O time complexity.
3.  **Space Complexity**: The solution must use the lowest possible Big O space complexity.

**Problem Details:**
${JSON.stringify(problemInfo, null, 2)}

---
**CRITICAL INSTRUCTIONS FOR YOUR RESPONSE:**

1.  **Optimal Solution**: Generate the most efficient solution. For Object-Oriented problems, design the class as a single, cohesive unit, avoiding redundant methods that increase overall complexity.
2.  **Trade-offs**: If a meaningful trade-off exists between time and space complexity, your primary solution in the "solution" field should be the one with the best time complexity. Then, you MUST provide the alternative (e.g., the space-optimized version) in the "alternative_solutions" array. If no meaningful trade-off exists, this array should be empty.
3.  **Code Explanation (High-Level)**: The "code_explanation" field is for a user who has a disability that makes it difficult to answer "why" questions in real-time. You MUST explain the high-level reasoning behind the code. Explain key data structure choices (e.g., "Why a HashMap instead of an array?") and algorithm choices as if you were explaining them to an interviewer.
4.  **Commented Code (Detailed)**: The code in the "answer" field MUST be well-commented. Add concise, inline comments to explain the purpose of crucial lines, complex logic, or non-obvious variable initializations. These comments should provide a detailed, line-by-line understanding.

**Your entire response MUST be a single, raw JSON object.**

**JSON Response Format EXAMPLE:**
{
  "solution": {
    "focus": "Time Complexity",
    "answer": "def twoSum(nums, target):\\n    # Use a hash map to store numbers we've seen and their indices.\\n    num_map = {}\\n    for i, num in enumerate(nums):\\n        # Calculate the complement needed to reach the target.\\n        complement = target - num\\n        # If the complement is already in our map, we've found a solution.\\n        if complement in num_map:\\n            return [num_map[complement], i]\\n        # Otherwise, store the current number and its index for future lookups.\\n        num_map[num] = i",
    "reasoning": "A high-level summary of the algorithm and data structures used.",
    "time_complexity": "O(n)",
    "space_complexity": "O(n)",
    "code_explanation": [
      {
        "part": "The use of a HashMap (Dictionary in Python)",
        "explanation": "We use a HashMap because it provides average O(1) time complexity for insertions and lookups. This allows us to check for the existence of the complement in constant time, which is the core of this efficient single-pass solution."
      }
    ]
  },
  "alternative_solutions": []
}
`;
    let rawText = "";
    try {
      const result = await this.model.generateContent(prompt);
      rawText = result.response.text();
      const cleanText = this.cleanJsonResponse(rawText);

      if (!cleanText) {
        throw new Error(
          "Could not extract a JSON object from the LLM response."
        );
      }

      try {
        const parsed = JSON.parse(cleanText);
        return parsed;
      } catch (parseError) {
        console.error(
          "[LLMHelper] Failed to parse JSON response in generateSolution."
        );
        console.error("[LLMHelper] Raw text that failed:", rawText);
        throw new Error("The LLM response was not valid JSON.");
      }
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      throw error;
    }
  }

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
- **Ensure the corrected code maintains the highest possible efficiency.**

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

      const result = await this.model.generateContent(synthesisPrompt);
      const rawText = result.response.text();
      const cleanText = this.cleanJsonResponse(rawText);

      let parsed;
      if (!cleanText) {
        throw new Error(
          "Could not extract a JSON object from the LLM response."
        );
      }

      try {
        parsed = JSON.parse(cleanText);
      } catch (parseError) {
        console.error(
          "[LLMHelper] Failed to parse JSON response in debugSolutionWithImages."
        );
        console.error("[LLMHelper] Raw text that failed:", rawText);
        throw new Error("The LLM response was not valid JSON.");
      }

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
