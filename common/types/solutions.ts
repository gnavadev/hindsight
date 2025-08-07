export interface Solution {
  initial_thoughts: string[]
  thought_steps: string[]
  description: string
  code: string
}

export interface SolutionsResponse {
  [key: string]: Solution
}

export interface ProblemStatementData {
  problem_statement: string;
  input_format: {
    description: string;
    parameters: any[];
  };
  output_format: {
    description: string;
    type: string;
    subtype: string;
  };
  complexity: {
    time: string;
    space: string;
  };
  test_cases: any[];
  validation_type: string;
  difficulty: string;
}

export interface NewProblemStatementData {
  problem_type: 'coding' | 'multiple_choice' | 'q_and_a' | 'general_reasoning' | 'math';
  problem_statement: string;
  context: string;
  options: string[];
  // Keep these if your logic still uses them
  validation_type?: string;
  output_format?: { subtype?: string };
}

export interface NewSolutionData {
  solution: {
    answer: string;
    reasoning: string;
    time_complexity: string | null;
    space_complexity: string | null;
    suggested_next_steps: string[];
  }
}