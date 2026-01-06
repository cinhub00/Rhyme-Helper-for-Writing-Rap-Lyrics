
export interface RhymeGroup {
  pattern: string;
  words: Set<string>;
  color: string;
}

export interface WordData {
  original: string;
  clean: string;
  pattern: string;
  groupIndex: number | null;
}

export interface Suggestion {
  word: string;
  pattern: string;
}
