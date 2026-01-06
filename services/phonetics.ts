
/**
 * Polish Phonetic Rules:
 * y -> i
 * ó -> u
 * ą -> o
 * ę -> e
 */

const VOWELS = ['a', 'e', 'i', 'o', 'u', 'y', 'ą', 'ę', 'ó'];
const REPLACEMENTS: Record<string, string> = {
  'y': 'i',
  'ó': 'u',
  'ą': 'o',
  'ę': 'e'
};

export function getVowelPattern(word: string): string {
  const cleanWord = word.toLowerCase().normalize('NFC');
  let pattern = '';
  
  for (const char of cleanWord) {
    if (VOWELS.includes(char)) {
      pattern += REPLACEMENTS[char] || char;
    }
  }
  
  return pattern;
}

export function countSyllables(word: string): number {
  return getVowelPattern(word).length;
}

export const RHYME_COLORS = [
  '#FF0000', // Red
  '#FF8C00', // Orange
  '#FFD700', // Yellow
  '#32CD32', // Green
  '#1E90FF', // Blue
  '#9370DB', // Purple
  '#FF1493', // Pink
  '#00CED1'  // Cyan
];

export function cleanWord(word: string): string {
  return word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
}
