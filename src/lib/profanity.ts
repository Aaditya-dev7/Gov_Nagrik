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

  // Split text into words and check each one
  const words = lowerText.split(/\s+/);
  
  for (const word of words) {
    // Remove punctuation from word edges
    const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
    
    if (!cleanWord || cleanWord.length < 2) continue;
    
    // Check exact match in high severity
    if (highSeveritySet.has(cleanWord)) {
      matchedWords.add(cleanWord);
      maxSeverity = 'high';
      continue;
    }
    
    // Check exact match in medium severity
    if (mediumSeveritySet.has(cleanWord)) {
      matchedWords.add(cleanWord);
      if (maxSeverity !== 'high') {
        maxSeverity = 'medium';
      }
      continue;
    }
    
    // Check if word contains any profane word (for obfuscated/leetspeak)
    // Only check shorter profanity words to avoid false positives
    for (const profaneWord of highSeveritySet) {
      if (profaneWord.length >= 3 && cleanWord.includes(profaneWord)) {
        matchedWords.add(profaneWord);
        maxSeverity = 'high';
        break;
      }
    }
    
    if (maxSeverity !== 'high') {
      for (const profaneWord of mediumSeveritySet) {
        if (profaneWord.length >= 4 && cleanWord.includes(profaneWord)) {
          matchedWords.add(profaneWord);
          maxSeverity = 'medium';
          break;
        }
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
