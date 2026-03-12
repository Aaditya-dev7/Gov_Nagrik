// AI Summarizer utility using summarizer.json configuration
import summarizerConfig from '../../summarizer.json';

interface CategoryMatch {
  category: string;
  score: number;
  keywords: string[];
  description: string;
  priority: number;
}

// Normalize text for matching
function normalizeText(text: string): string {
  try {
    return (text || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

// Find matching category based on description
export function findMatchingCategory(description: string): CategoryMatch | null {
  try {
    if (!description) return null;
    
    const normalizedDesc = normalizeText(description);
    if (!normalizedDesc) return null;
    
    const categories = summarizerConfig?.categories as Record<string, any>;
    if (!categories) return null;
    
    let bestMatch: CategoryMatch | null = null;
    let bestScore = 0;
    
    for (const [categoryKey, categoryData] of Object.entries(categories)) {
      if (!categoryData) continue;
      
      let score = 0;
      const matchedKeywords: string[] = [];
      
      // Check keywords in all languages
      const keywords = categoryData.keywords as Record<string, string[]>;
      if (keywords) {
        for (const langKeywords of Object.values(keywords)) {
          if (!langKeywords) continue;
          for (const keyword of langKeywords) {
            const normalizedKeyword = normalizeText(keyword);
            if (normalizedKeyword && normalizedDesc.includes(normalizedKeyword)) {
              score += keyword.split(' ').length; // Multi-word keywords score higher
              matchedKeywords.push(keyword);
            }
          }
        }
      }
      
      // Check variations (misspellings, slang, shortforms)
      const variations = categoryData.variations as Record<string, string[]>;
      if (variations) {
        for (const variationList of Object.values(variations)) {
          if (!variationList) continue;
          for (const variation of variationList) {
            const normalizedVariation = normalizeText(variation);
            if (normalizedVariation && normalizedDesc.includes(normalizedVariation)) {
              score += 0.5; // Variations score lower
              matchedKeywords.push(variation);
            }
          }
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          category: categoryKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          score,
          keywords: [...new Set(matchedKeywords)].slice(0, 5),
          description: categoryData.description || '',
          priority: categoryData.priority || 5,
        };
      }
    }
    
    return bestMatch;
  } catch (err) {
    console.error('findMatchingCategory error:', err);
    return null;
  }
}

// Generate AI summary from description
export function generateSummaryFromDescription(description: string, location?: string): string {
  try {
    if (!description) return location ? `Report at ${location}` : 'No description';
    
    const match = findMatchingCategory(description);
    
    if (!match || match.score < 1) {
      // No good match, return truncated description
      const truncated = description.length > 100 
        ? description.substring(0, 100).trim() + '...'
        : description;
      return location ? `${truncated} Location: ${location}` : truncated;
    }
    
    // Build summary based on matched category
    let summary = match.description || '';
    
    // Add location if provided
    if (location) {
      summary += ` at ${location}`;
    }
    
    // Add detected keywords context
    if (match.keywords && match.keywords.length > 0) {
      summary += `. Detected issue: ${match.keywords[0].toLowerCase()}`;
    }
    
    return summary;
  } catch (err) {
    console.error('generateSummaryFromDescription error:', err);
    return description || 'No description';
  }
}

// Get priority recommendation based on description
export function getPriorityFromDescription(description: string): 'Low' | 'Medium' | 'High' | 'Urgent' {
  try {
    if (!description) return 'Medium';
    
    const match = findMatchingCategory(description);
    
    if (!match) return 'Medium';
    
    // Map priority number to priority level
    if (match.priority >= 9) return 'Urgent';
    if (match.priority >= 7) return 'High';
    if (match.priority >= 5) return 'Medium';
    return 'Low';
  } catch (err) {
    console.error('getPriorityFromDescription error:', err);
    return 'Medium';
  }
}

// Get category suggestions for autocomplete
export function getCategorySuggestions(input: string): string[] {
  try {
    if (!input) return [];
    
    const normalizedInput = normalizeText(input);
    if (!normalizedInput) return [];
    
    const categories = summarizerConfig?.categories as Record<string, any>;
    if (!categories) return [];
    
    const suggestions: string[] = [];
    
    for (const [categoryKey, categoryData] of Object.entries(categories)) {
      if (!categoryData) continue;
      
      const keywords = categoryData.keywords as Record<string, string[]>;
      if (!keywords) continue;
      
      // Check if any keyword matches the input
      for (const langKeywords of Object.values(keywords)) {
        if (!langKeywords) continue;
        for (const keyword of langKeywords) {
          if (normalizeText(keyword).startsWith(normalizedInput)) {
            const categoryName = categoryKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            if (!suggestions.includes(categoryName)) {
              suggestions.push(categoryName);
            }
            break;
          }
        }
        if (suggestions.length >= 5) break;
      }
      if (suggestions.length >= 5) break;
    }
    
    return suggestions;
  } catch (err) {
    console.error('getCategorySuggestions error:', err);
    return [];
  }
}

export { summarizerConfig };
