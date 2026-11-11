import { Injectable, Logger } from '@nestjs/common';
import { SafetyCheckResult, SensitivePattern } from '../interfaces/safety-filter.interface';

@Injectable()
export class CommentSafetyService {
  private readonly logger = new Logger(CommentSafetyService.name);
  
  private sensitivePatterns: SensitivePattern[] = [
    // Phone numbers
    {
      pattern: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      type: 'PHONE_NUMBER',
      replacement: '[PHONE REDACTED]'
    },
    // Email addresses
    {
      pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      type: 'EMAIL',
      replacement: '[EMAIL REDACTED]'
    },
    // URLs
    {
      pattern: /(https?:\/\/[^\s]+)/g,
      type: 'URL',
      replacement: '[LINK REDACTED]'
    },
    // Cryptocurrency addresses (basic pattern)
    {
      pattern: /(0x[a-fA-F0-9]{40})|(bitcoin:[13][a-km-zA-HJ-NP-Z1-9]{25,34})/g,
      type: 'CRYPTO_ADDRESS',
      replacement: '[CRYPTO ADDRESS REDACTED]'
    },
    // Social security numbers (US)
    {
      pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
      type: 'SSN',
      replacement: '[SSN REDACTED]'
    }
  ];

  private abusiveWords = [
    // Add list of abusive words (consider using external library for production)
    'hate', 'kill', 'stupid', 'idiot', // ... etc
  ];

  checkContentSafety(content: string): SafetyCheckResult {
    let filteredContent = content;
    const violations: string[] = [];
    
    // Check for sensitive patterns
    for (const pattern of this.sensitivePatterns) {
      const matches = content.match(pattern.pattern);
      if (matches && matches.length > 0) {
        filteredContent = filteredContent.replace(pattern.pattern, pattern.replacement);
        violations.push(`${pattern.type} detected: ${matches.length} occurrences`);
      }
    }

    // Check for abusive language (basic implementation)
    const words = content.toLowerCase().split(/\s+/);
    const foundAbusiveWords = words.filter(word => 
      this.abusiveWords.some(abusive => word.includes(abusive))
    );
    
    if (foundAbusiveWords.length > 0) {
      violations.push(`Potentially abusive language detected`);
      // In production, you might want to flag or block the comment
    }

    // Calculate safety score
    const isSafe = violations.length === 0 || 
                  (violations.length <= 1 && !violations.some(v => v.includes('abusive')));

    return {
      isSafe,
      filteredContent,
      violations,
      originalContent: content
    };
  }

  async moderateComment(content: string, skipSafetyCheck = false): Promise<SafetyCheckResult> {
    if (skipSafetyCheck) {
      return {
        isSafe: true,
        filteredContent: content,
        violations: [],
        originalContent: content
      };
    }

    return this.checkContentSafety(content);
  }
}