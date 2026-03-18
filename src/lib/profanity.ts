import profanityData from '../../profanity_data.json';

export interface ProfanityResult {
  hasProfanity: boolean;
  matchedWords: string[];
  severity: 'none' | 'medium' | 'high';
}

// Flatten all profanity words into a single array with severity info
const allProfanityWords: Map<string, 'high' | 'medium'> = new Map();

// Process high severity words
(profanityData as any).high_severity.forEach((word: string) => {
  allProfanityWords.set(word.toLowerCase(), 'high');
});

// Process medium severity words  
(profanityData as any).medium_severity.forEach((word: string) => {
  allProfanityWords.set(word.toLowerCase(), 'medium');
});

// Create regex pattern for matching
const profanityPattern = new RegExp(
  Array.from(allProfanityWords.keys())
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'gi'
);

/**
 * Check text for profanity
 * @param text - The text to check
 * @returns ProfanityResult with hasProfanity, matchedWords, and severity
 */
export function checkProfanity(text: string): ProfanityResult {
  if (!text || typeof text !== 'string') {
    return { hasProfanity: false, matchedWords: [], severity: 'none' };
  }

  const lowerText = text.toLowerCase();
  const matchedWords: string[] = [];
  let maxSeverity: 'none' | 'medium' | 'high' = 'none';

  // Find all matches
  const words = lowerText.split(/\s+/);
  
  for (const word of words) {
    // Remove punctuation from word edges
    const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
    
    if (allProfanityWords.has(cleanWord)) {
      const severity = allProfanityWords.get(cleanWord)!;
      matchedWords.push(cleanWord);
      if (severity === 'high') {
        maxSeverity = 'high';
      } else if (maxSeverity !== 'high') {
        maxSeverity = 'medium';
      }
    }
    
    // Also check for partial matches within the word (for obfuscated words)
    for (const [profaneWord, severity] of allProfanityWords.entries()) {
      if (cleanWord.includes(profaneWord) && !matchedWords.includes(profaneWord)) {
        matchedWords.push(profaneWord);
        if (severity === 'high') {
          maxSeverity = 'high';
        } else if (maxSeverity !== 'high') {
          maxSeverity = 'medium';
        }
      }
    }
  }

  // Also use regex for additional pattern matching
  const regexMatches = lowerText.match(profanityPattern);
  if (regexMatches) {
    for (const match of regexMatches) {
      const cleanMatch = match.toLowerCase();
      if (!matchedWords.includes(cleanMatch)) {
        matchedWords.push(cleanMatch);
        const severity = allProfanityWords.get(cleanMatch);
        if (severity === 'high') {
          maxSeverity = 'high';
        } else if (maxSeverity !== 'high') {
          maxSeverity = 'medium';
        }
      }
    }
  }

  return {
    hasProfanity: matchedWords.length > 0,
    matchedWords: [...new Set(matchedWords)], // Remove duplicates
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
