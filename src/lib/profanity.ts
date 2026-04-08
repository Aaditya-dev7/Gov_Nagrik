import profanityData from '../../profanity_data.json';

export interface ProfanityResult {
  hasProfanity: boolean;
  matchedWords: string[];
  severity: 'none' | 'medium' | 'high';
}

// Create Sets for O(1) lookup instead of massive regex
const highSeveritySet = new Set<string>();
const mediumSeveritySet = new Set<string>();

// Populate sets once on module load
const data = profanityData as any;
if (data?.high_severity) {
  data.high_severity.forEach((word: string) => {
    highSeveritySet.add(word.toLowerCase());
  });
}
if (data?.medium_severity) {
  data.medium_severity.forEach((word: string) => {
    mediumSeveritySet.add(word.toLowerCase());
  });
}

/**
 * Check text for profanity - efficient word-by-word check
 * @param text - The text to check
 * @returns ProfanityResult with hasProfanity, matchedWords, and severity
 */
export function checkProfanity(text: string): ProfanityResult {
  if (!text || typeof text !== 'string') {
    return { hasProfanity: false, matchedWords: [], severity: 'none' };
  }

  const lowerText = text.toLowerCase();
  const matchedWords: Set<string> = new Set();
  let maxSeverity: 'none' | 'medium' | 'high' = 'none';

  // 1. Check for multi-word phrases directly in the text (e.g. Hindi slang with spaces)
  for (const profaneWord of highSeveritySet) {
    if (profaneWord.includes(' ') && lowerText.includes(profaneWord)) {
      matchedWords.add(profaneWord);
      maxSeverity = 'high';
    }
  }
  for (const profaneWord of mediumSeveritySet) {
    if (profaneWord.includes(' ') && lowerText.includes(profaneWord)) {
      matchedWords.add(profaneWord);
      if (maxSeverity === 'none') {
        maxSeverity = 'medium';
      }
    }
  }

  // 2. Split text into individual words for single-word matching
  const words = lowerText.split(/\s+/);
  
  for (const word of words) {
    // Remove typical exact edge punctuation but preserve word internals
    const cleanWord = word.replace(/^[\.,\?\"\'\:\;\[\]\{\}\(\)\-]+|[\.,\?\"\'\:\;\[\]\{\}\(\)\-]+$/g, '');
    
    if (!cleanWord || cleanWord.length < 2) continue;
    
    // Exact match checks for high and medium severity
    if (highSeveritySet.has(cleanWord)) {
      matchedWords.add(cleanWord);
      maxSeverity = 'high';
    } else if (mediumSeveritySet.has(cleanWord)) {
      matchedWords.add(cleanWord);
      if (maxSeverity === 'none') {
        maxSeverity = 'medium';
      }
    }
  }

  return {
    hasProfanity: matchedWords.size > 0,
    matchedWords: Array.from(matchedWords),
    severity: maxSeverity
  };
}

/**
 * Check if text contains profanity (simple boolean check)
 * @param text - The text to check
 * @returns true if profanity found, false otherwise
 */
export function hasProfanity(text: string): boolean {
  return checkProfanity(text).hasProfanity;
}

/**
 * Get a user-friendly error message for profanity
 * @param result - The profanity check result
 * @returns Error message string or null if no profanity
 */
export function getProfanityErrorMessage(result: ProfanityResult): string | null {
  if (!result.hasProfanity) return null;
  
  if (result.severity === 'high') {
    return 'Your text contains inappropriate language. Please remove offensive words and try again.';
  }
  return 'Your text contains language that may be inappropriate. Please revise and try again.';
}
