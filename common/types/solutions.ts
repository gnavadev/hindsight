/**
 * Type definitions for problem statements and solutions
 * Used throughout the application for type safety
 */

// ============================================================================
// PROBLEM STATEMENT TYPES
// ============================================================================

/**
 * Supported problem types in the application
 */
export type ProblemType = 
  | 'coding' 
  | 'multiple_choice' 
  | 'q_and_a' 
  | 'general_reasoning' 
  | 'math';

/**
 * Details specific to coding problems
 */
export interface CodingDetails {
  language?: string;
  code_snippet?: string;
  error_message?: string;
}

/**
 * Details specific to multiple choice problems
 */
export interface MultipleChoiceDetails {
  questions?: Array<{
    question_text: string;
    options: string[];
  }>;
}

/**
 * Details specific to Q&A, math, and general reasoning problems
 */
export interface QADetails {
  question?: string;
  context?: string;
}

/**
 * Union type for all possible problem details
 */
export type ProblemDetails = CodingDetails | MultipleChoiceDetails | QADetails;

/**
 * Complete problem statement structure
 */
export interface NewProblemStatementData {
  problem_type: ProblemType;
  problem_statement: string;
  details: {
    // Coding-specific fields
    language?: string;
    code_snippet?: string;
    error_message?: string;
    
    // Multiple choice-specific fields
    questions?: Array<{
      question_text: string;
      options: string[];
    }>;
    
    // Q&A/Math/General reasoning fields
    question?: string;
    context?: string;
  };
  
  // Optional legacy fields for backward compatibility
  validation_type?: string;
  output_format?: { 
    subtype?: string;
  };
}

// ============================================================================
// SOLUTION TYPES
// ============================================================================

/**
 * Code explanation entry for coding solutions
 */
export interface CodeExplanation {
  part: string;
  explanation: string;
}

/**
 * Answer format for Q&A, multiple choice, and general reasoning
 */
export interface StructuredAnswer {
  question: string;
  correct_option: string;
}

/**
 * Alternative solution for coding problems
 */
export interface AlternativeSolution {
  focus: string;
  approach: string;
  time_complexity: string;
  space_complexity: string;
  trade_off: string;
}

/**
 * Main solution structure for coding problems
 */
export interface CodingSolution {
  focus?: string;
  answer: string; // Code as string
  reasoning: string;
  time_complexity: string | null;
  space_complexity: string | null;
  code_explanation?: CodeExplanation[];
  suggested_next_steps?: string[];
}

/**
 * Solution structure for Q&A/Multiple Choice problems
 */
export interface QASolution {
  answer: StructuredAnswer[]; // Array of question-answer pairs
  reasoning?: string;
}

/**
 * Solution structure for math problems
 */
export interface MathSolution {
  answer: string; // Step-by-step solution as formatted text
  reasoning: string;
}

/**
 * Complete solution data structure
 * The 'answer' field type depends on the problem type
 */
export interface NewSolutionData {
  solution: {
    // Answer can be different types based on problem type:
    // - string for coding (code)
    // - StructuredAnswer[] for Q&A/multiple choice
    // - string for math (formatted steps)
    answer: string | StructuredAnswer[];
    
    reasoning: string;
    
    // Complexity fields (only for coding problems)
    time_complexity?: string | null;
    space_complexity?: string | null;
    
    // Optional fields
    focus?: string; // For coding: "Time Complexity" or "Space Complexity"
    code_explanation?: CodeExplanation[];
    suggested_next_steps?: string[];
  };
  
  // Alternative solutions (primarily for coding problems)
  alternative_solutions?: AlternativeSolution[];
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if answer is structured (Q&A format)
 */
export function isStructuredAnswer(
  answer: any
): answer is StructuredAnswer[] {
  return (
    Array.isArray(answer) &&
    answer.length > 0 &&
    typeof answer[0] === 'object' &&
    'question' in answer[0] &&
    'correct_option' in answer[0]
  );
}

/**
 * Type guard to check if answer is code (string format)
 */
export function isCodeAnswer(answer: any): answer is string {
  return typeof answer === 'string';
}

/**
 * Type guard to check if solution has complexity data
 */
export function hasCodingComplexity(
  solution: NewSolutionData['solution']
): solution is CodingSolution {
  return (
    solution.time_complexity !== undefined ||
    solution.space_complexity !== undefined
  );
}

/**
 * Type guard to check if solution has code explanations
 */
export function hasCodeExplanation(
  solution: NewSolutionData['solution']
): solution is CodingSolution {
  return (
    solution.code_explanation !== undefined &&
    Array.isArray(solution.code_explanation) &&
    solution.code_explanation.length > 0
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Partial problem statement for updates
 */
export type PartialProblemStatement = Partial<NewProblemStatementData>;

/**
 * Partial solution for updates
 */
export type PartialSolution = Partial<NewSolutionData>;

/**
 * Problem type specific details mapping
 */
export type ProblemTypeDetailsMap = {
  coding: CodingDetails;
  multiple_choice: MultipleChoiceDetails;
  q_and_a: QADetails;
  general_reasoning: QADetails;
  math: QADetails;
};

// ============================================================================
// RESPONSE TYPES (for API/IPC communication)
// ============================================================================

/**
 * Success response wrapper
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response wrapper
 */
export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

/**
 * Generic API response type
 */
export type APIResponse<T> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// PROCESSING STATE TYPES
// ============================================================================

/**
 * Processing state for UI feedback
 */
export type ProcessingState = 
  | 'idle'
  | 'extracting_problem'
  | 'generating_solution'
  | 'debugging'
  | 'complete'
  | 'error';

/**
 * Processing status with metadata
 */
export interface ProcessingStatus {
  state: ProcessingState;
  progress?: number; // 0-100
  message?: string;
  error?: string;
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Helper to create a coding problem statement
 */
export function createCodingProblem(
  statement: string,
  language: string,
  codeSnippet?: string,
  errorMessage?: string
): NewProblemStatementData {
  return {
    problem_type: 'coding',
    problem_statement: statement,
    details: {
      language,
      code_snippet: codeSnippet,
      error_message: errorMessage,
    },
  };
}

/**
 * Helper to create a Q&A problem statement
 */
export function createQAProblem(
  statement: string,
  question: string,
  context?: string
): NewProblemStatementData {
  return {
    problem_type: 'q_and_a',
    problem_statement: statement,
    details: {
      question,
      context,
    },
  };
}

/**
 * Helper to create a multiple choice problem statement
 */
export function createMultipleChoiceProblem(
  statement: string,
  questions: Array<{ question_text: string; options: string[] }>
): NewProblemStatementData {
  return {
    problem_type: 'multiple_choice',
    problem_statement: statement,
    details: {
      questions,
    },
  };
}