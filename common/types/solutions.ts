export interface NewProblemStatementData {
  problem_type: 'coding' | 'multiple_choice' | 'q_and_a' | 'general_reasoning' | 'math';
  problem_statement: string;
  details: {
    language?: string;
    code_snippet?: string;
    error_message?: string;
    questions?: {
      question_text: string;
      options: string[];
    }[];
    question?: string;
    context?: string;
  };
  validation_type?: string;
  output_format?: { subtype?: string };
}

export interface NewSolutionData {
  solution: {
    answer: any;
    reasoning: string;
    time_complexity: string | null;
    space_complexity: string | null;
    suggested_next_steps: string[];
  }
}
