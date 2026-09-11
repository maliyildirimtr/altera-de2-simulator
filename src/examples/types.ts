export type ExampleCategory = 'combinational' | 'sequential' | 'arithmetic' | 'routing' | 'fpga';

export type ExampleDifficulty = 'beginner' | 'intermediate';

export interface ExampleSourceFile {
  filename: string;
  language: 'systemverilog';
  code: string;
}

export interface ExampleDE2Config {
  supported: boolean;
  filename: string;
  source: string;
  topModule: string;
}

export interface ExampleToolSupport {
  schematic: boolean;
  waveform: boolean;
  de2: boolean;
}

export interface LearningExample {
  id: string;
  title: string;
  description: string;
  difficulty: ExampleDifficulty;
  category: ExampleCategory;
  topics: string[];
  learningObjectives: string[];
  source: ExampleSourceFile;
  testbench?: ExampleSourceFile;
  de2?: ExampleDE2Config;
  tools: ExampleToolSupport;
  topModule: string;
}
