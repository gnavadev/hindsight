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
      const prompt = `${this.systemPrompt}\n\nAnalyze the user-provided image(s) and extract the key information into a structured JSON object. First, classify the problem, then extract the relevant details.
        Your analysis MUST be in the following JSON format:
        {
          "problem_type": "Classify the problem. Use ONE of the following: 'coding', 'multiple_choice', 'q_and_a', 'general_reasoning', 'math'.",
          "problem_statement": "A concise, one-sentence statement of the user's core task or question.",
          "context": "Key details from the image. For 'coding', this includes language, frameworks, variables, and error messages. For 'q_and_a', it's the background information. For 'multiple_choice', it's the question stem.",
          "options": "For 'multiple_choice' problems, provide an array of the available options (e.g., ['A', 'B', 'C', 'D']). For other types, this can be an empty array []."
        }

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
    }\n\nGiven the following problem analysis:
      ${JSON.stringify(problemInfo, null, 2)}

      Your task is to generate a complete solution. The format of your response MUST be a JSON object and should be tailored to the 'problem_type'.

      **Instructions based on 'problem_type'**:
      - If 'problem_type' is 'coding': The 'answer' field should contain only the complete, functional code. The 'reasoning' should explain the logic, algorithms, and syntax choices.
      - If 'problem_type' is 'multiple_choice': The 'answer' field should contain ONLY the letter of the correct option (e.g., "C"). The 'reasoning' must explain why this option is correct AND why the other options are incorrect.
      - If 'problem_type' is 'q_and_a' or 'math': The 'answer' field should contain the direct answer, calculation, or written response. The 'reasoning' should show the steps, logic, or evidence used.
      - If 'problem_type' is 'general_reasoning': The 'answer' field should contain your conclusion or interpretation. The 'reasoning' should explain how you arrived at it based on the context.

      Please provide your response in the following JSON format:
      {
        "solution": {
          "answer": "The final code, multiple-choice letter, or text answer, based on the instructions above.",
          "reasoning": "A detailed explanation for your answer, tailored to the problem type.",
          "suggested_next_steps": ["A relevant follow-up action the user could take.", "Another possible action."]
        }
      }

      Important: Return ONLY the raw JSON object, without any markdown formatting or code blocks.`;

    console.log("[LLMHelper] Calling Gemini LLM for solution...");
    try {
      const result = await this.model.generateContent(prompt);
      console.log("[LLMHelper] Gemini LLM returned result.");
      const response = result.response;
      const text = this.cleanJsonResponse(response.text());
      const parsed = JSON.parse(text);
      console.log("[LLMHelper] Parsed LLM response:", parsed);
      return parsed;
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
