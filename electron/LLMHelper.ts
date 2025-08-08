import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import fs from "fs";

export class LLMHelper {
  private model: GenerativeModel;
  private readonly systemPrompt = `You are Wingman AI, a helpful and proactive assistant. Your specialty is analyzing images to identify and solve a wide range of problems, including:
  - **Coding & Debugging Tasks**: Analyzing screenshots of code, error messages, or IDEs.
  - **Academic Questions**: Solving multiple-choice, short answer, or essay questions from subjects like math, science, history, etc.
  - **General Reasoning**: Interpreting diagrams, charts, or general situations.

  For any user input, you will first analyze and classify the problem, then provide a structured and actionable solution.`;
  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    // this.model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
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
    // Remove markdown code block syntax if present
    text = text.replace(/^```(?:json)?\n/, "").replace(/\n```$/, "");
    // Remove any leading/trailing whitespace
    text = text.trim();
    return text;
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const imageParts = await Promise.all(
        imagePaths.map((path) => this.fileToGenerativePart(path))
      );

      // This prompt is now a powerful, multi-purpose extractor.
      const prompt = `${this.systemPrompt}\n\nAnalyze the user-provided image(s) and perform two steps:
1.  **Classify the Problem**: Determine the type of problem. It must be one of: 'coding', 'multiple_choice', 'q_and_a', 'general_reasoning', 'math'.
2.  **Extract Details**: Based on the classification, extract the relevant information into the correct JSON structure.

Your final output MUST be a single JSON object formatted according to the examples below.

**JSON FORMAT EXAMPLES:**

* **For 'coding'**:
    \`\`\`json
    {
      "problem_type": "coding",
      "problem_statement": "A summary of the coding task or error.",
      "details": {
        "language": "e.g., Python, JavaScript",
        "code_snippet": "The main block of code.",
        "error_message": "Any error message shown, if applicable."
      }
    }
    \`\`\`

* **For 'multiple_choice'**:
    \`\`\`json
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
    \`\`\`

* **For 'q_and_a' or 'math'**:
    \`\`\`json
    {
      "problem_type": "q_and_a",
      "problem_statement": "The user's primary question.",
      "details": {
        "question": "The full text of the question.",
        "context": "Any surrounding text or data needed to answer."
      }
    }
    \`\`\`

Important: Return ONLY the raw JSON object, without any markdown formatting, code blocks, or extraneous text.`;

      const result = await this.model.generateContent([prompt, ...imageParts]);
      const response = result.response;
      const text = this.cleanJsonResponse(response.text());
      return JSON.parse(text);
    } catch (error) {
      console.error("Error extracting problem from images:", error);
      throw error;
    }
  }
  public async generateSolution(problemInfo: any) {
    const prompt = `${
      this.systemPrompt
    }\n\nBased on the following classified problem, generate a helpful solution.
The problem type is: **${problemInfo.problem_type}**

**Problem Details:**
${JSON.stringify(problemInfo, null, 2)}

**Instructions for Your Response:**
Your response MUST be a valid JSON object.

-   If the problem_type is **'coding'**, the "answer" field should contain ONLY the raw code as a single-line JSON string. You must also provide the 'time_complexity' and 'space_complexity' in Big O notation.
-   If the problem_type is **'multiple_choice'**, the "answer" string should be a Markdown-formatted string. For each question, use a heading (e.g., '### Question 1'), and then on new lines, use the format: "**Correct Answer:** [The Answer]" and "**Justification:** [The Explanation]".
-   If the problem_type is **'q_and_a'** or **'math'**, the "answer" string should be a clear, well-formatted textual explanation.

**CRITICAL RULE: All double quotes (") inside JSON string values MUST be escaped with a backslash (\\"). All newlines inside a string value must be escaped as \\n.**

**JSON Response Format:**
{
  "solution": {
    "answer": "The solution content, following the rules above.",
    "reasoning": "A high-level, one-sentence summary of the overall approach taken.",
    "time_complexity": "For 'coding' problems, the Big O time complexity (e.g., 'O(n)'). For others, null.",
    "space_complexity": "For 'coding' problems, the Big O space complexity (e.g., 'O(1)'). For others, null.",
    "suggested_next_steps": ["A relevant follow-up action.", "Another possible action."]
  }
}

Important: Return ONLY the raw JSON object, without any markdown formatting or code blocks.`;

    let result: any;
    console.log("[LLMHelper] Calling Gemini LLM for solution...");
    try {
      result = await this.model.generateContent(prompt);
      const response = result.response;
      
      const text = this.cleanJsonResponse(response.text());

      if (!text) {
        console.error("[LLMHelper] The API response did not contain a valid JSON object.");
        throw new Error("The API response was empty or malformed.");
      }
      const parsed = JSON.parse(text);
      console.log("[LLMHelper] Parsed LLM response:", parsed);

      if (problemInfo.problem_type === 'coding' && parsed.solution?.answer) {
        const language = problemInfo.details?.language?.toLowerCase() || 'python';
        parsed.solution.answer = `\`\`\`${language}\n${parsed.solution.answer}\n\`\`\``;
      }
      return parsed;
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      if (result && result.response) {
          console.error("[LLMHelper] Raw text that failed to parse:", result.response.text());
      }
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
      const prompt = `${
        this.systemPrompt
      }\n\nYou are a wingman. Given:\n1. The original problem or situation: ${JSON.stringify(
        problemInfo,
        null,
        2
      )}\n2. The current response or approach: ${currentCode}\n3. The debug information in the provided images\n\nPlease analyze the debug information and provide feedback in this JSON format:\n{
        "solution": {
          "code": "The code or main answer here.",
          "problem_statement": "Restate the problem or situation.",
          "context": "Relevant background/context.",
          "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
          "reasoning": "Explanation of why these suggestions are appropriate."
        }
      }\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`;

      const result = await this.model.generateContent([prompt, ...imageParts]);
      const response = result.response;
      const text = this.cleanJsonResponse(response.text());
      const parsed = JSON.parse(text);
      console.log("[LLMHelper] Parsed debug LLM response:", parsed);
      return parsed;
    } catch (error) {
      console.error("Error debugging solution with images:", error);
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
