/**
 * Prompt Injection Filter
 * Detects and prevents prompt injection attacks
 */

interface FilterResult {
  safe: boolean;
  reason?: string;
  confidence: number;
  detectedPatterns: string[];
}

class PromptFilter {
  private injectionPatterns = [
    /ignore.*instruction|forget.*instruction/gi,
    /system.*override|override.*system/gi,
    /execute.*command|run.*command/gi,
    /bypass.*security|disable.*security/gi,
    /sql.*injection|injection.*sql/gi,
    /eval\s*\(/gi,
    /exec\s*\(/gi
  ];

  public async filter(content: string, userMessage?: string): Promise<FilterResult> {
    const combined = `${content} ${userMessage || ''}`;
    const detectedPatterns: string[] = [];
    let confidence = 0;

    for (const pattern of this.injectionPatterns) {
      if (pattern.test(combined)) {
        detectedPatterns.push(pattern.source);
        confidence += 0.2;
      }
    }

    confidence = Math.min(confidence, 1);

    return {
      safe: confidence < 0.5,
      confidence,
      detectedPatterns,
      reason: detectedPatterns.length > 0 
        ? `Potential injection detected: ${detectedPatterns.join(', ')}`
        : undefined
    };
  }
}

export const promptFilter = new PromptFilter();
