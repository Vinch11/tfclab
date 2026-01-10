// =============================================
// Parser Utilities - Common extraction functions
// =============================================

/**
 * Extract a number from text using a regex pattern
 */
export function extractNumber(
  text: string,
  pattern: RegExp,
  groupIndex: number = 1
): number | null {
  const match = text.match(pattern);
  if (match && match[groupIndex]) {
    // Handle both . and , as decimal separators
    const numStr = match[groupIndex].replace(",", ".");
    const num = parseFloat(numStr);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Extract a date from text (various formats)
 */
export function extractDate(text: string): string | null {
  // Try DD/MM/YYYY or DD-MM-YYYY
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === datePatterns[0]) {
        // DD/MM/YYYY
        return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
      } else if (pattern === datePatterns[1]) {
        // YYYY-MM-DD
        return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
      } else {
        // French month name
        const months: Record<string, string> = {
          janvier: "01", février: "02", mars: "03", avril: "04",
          mai: "05", juin: "06", juillet: "07", août: "08",
          septembre: "09", octobre: "10", novembre: "11", décembre: "12",
        };
        const monthNum = months[match[2].toLowerCase()];
        if (monthNum) {
          return `${match[3]}-${monthNum}-${match[1].padStart(2, "0")}`;
        }
      }
    }
  }
  
  return null;
}

/**
 * Search for a value in text near a label
 */
export function findValueNearLabel(
  text: string,
  labelPattern: RegExp,
  valuePattern: RegExp = /[\d,.]+/
): number | null {
  const labelMatch = text.match(labelPattern);
  if (labelMatch && labelMatch.index !== undefined) {
    // Look for a number within 50 characters after the label
    const afterLabel = text.slice(labelMatch.index, labelMatch.index + 100);
    const valueMatch = afterLabel.match(valuePattern);
    if (valueMatch) {
      const numStr = valueMatch[0].replace(",", ".");
      const num = parseFloat(numStr);
      return isNaN(num) ? null : num;
    }
  }
  return null;
}

/**
 * Find page containing a specific pattern
 */
export function findPageWithPattern(pages: string[], pattern: RegExp): number | null {
  for (let i = 0; i < pages.length; i++) {
    if (pattern.test(pages[i])) {
      return i;
    }
  }
  return null;
}

/**
 * Extract text between two patterns
 */
export function extractBetween(
  text: string,
  startPattern: RegExp,
  endPattern: RegExp
): string | null {
  const startMatch = text.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return null;
  
  const afterStart = text.slice(startMatch.index + startMatch[0].length);
  const endMatch = afterStart.match(endPattern);
  
  if (endMatch && endMatch.index !== undefined) {
    return afterStart.slice(0, endMatch.index).trim();
  }
  
  return afterStart.slice(0, 200).trim(); // Return first 200 chars if no end found
}

/**
 * Clean and normalize text
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

/**
 * Convert VMA to pace (sec/km)
 */
export function vmaToSecsPerKm(vmaKmh: number): number {
  if (vmaKmh <= 0) return 0;
  return Math.round((3600 / vmaKmh));
}
