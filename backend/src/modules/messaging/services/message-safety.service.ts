import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DetectedPattern {
  type: string;
  count: number;
  matches: string[];
}

interface PatternMap {
  [key: string]: RegExp;
}

@Injectable()
export class MessageSafetyService {
  private readonly logger = new Logger(MessageSafetyService.name);

  // Regex patterns for sensitive data detection
  private readonly patterns: PatternMap = {
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    creditCard: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
    bankAccount: /\b\d{8,17}\b/g,
  };

  constructor(private configService: ConfigService) {}

  /**
   * Scan message for sensitive content and mask it
   */
  async scanAndMaskContent(content: string): Promise<{
    isSafe: boolean;
    maskedContent: string;
    originalContent?: string;
    safetyScore: number;
    scanResult: any;
  }> {
    try {
      let maskedContent = content;
      const detectedPatterns: DetectedPattern[] = [];
      let safetyScore = 100; // Start with perfect score

      // Check for sensitive patterns
      for (const [type, pattern] of Object.entries(this.patterns)) {
        const matches = content.match(pattern);
        if (matches) {
          detectedPatterns.push({
            type,
            count: matches.length,
            matches: matches.slice(0, 5), // Limit to first 5 matches
          });

          // Decrease safety score based on sensitivity
          safetyScore -= this.getPatternPenalty(type, matches.length);

          // Mask the content
          maskedContent = this.maskPattern(maskedContent, pattern, type);
        }
      }

      // Check for abusive language
      const abusiveScore = this.checkAbusiveLanguage(content);
      safetyScore -= abusiveScore;

      // Check for spam patterns
      const spamScore = this.checkSpamPatterns(content);
      safetyScore -= spamScore;

      // Ensure safety score is between 0-100
      safetyScore = Math.max(0, Math.min(100, safetyScore));

      const isSafe = safetyScore >= 60; // Threshold for safe content

      return {
        isSafe,
        maskedContent,
        originalContent: detectedPatterns.length > 0 ? content : undefined,
        safetyScore: Math.round(safetyScore),
        scanResult: {
          detectedPatterns,
          abusiveScore,
          spamScore,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Error scanning content: ${error.message}`, error.stack);
      return {
        isSafe: false,
        maskedContent: content,
        safetyScore: 0,
        scanResult: { error: error.message, timestamp: new Date().toISOString() },
      };
    }
  }

  /**
   * Check if content is likely spam
   */
  private checkSpamPatterns(content: string): number {
    const spamPatterns = [
      /\b(?:buy|sell|cheap|discount|offer|limited|urgent|click|link|http|www\.)/gi,
      /(.)\1{4,}/g, // Repeated characters
      /\b[A-Z]+\b/g, // All caps words
      /\b\d{10,}\b/g, // Long numbers
    ];

    let spamScore = 0;
    for (const pattern of spamPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        spamScore += matches.length * 5;
      }
    }

    return Math.min(spamScore, 30); // Cap spam score
  }

  /**
   * Check for abusive language
   */
  private checkAbusiveLanguage(content: string): number {
    const abusiveWords = [
      'hate', 'kill', 'stupid', 'idiot', 'moron', 'retard',
      'dumb', 'fool', 'loser', 'ugly', 'fat',
    ];

    const words = content.toLowerCase().split(/\s+/);
    let abusiveScore = 0;

    for (const word of words) {
      if (abusiveWords.includes(word)) {
        abusiveScore += 10;
      }
    }

    return Math.min(abusiveScore, 40);
  }

  /**
   * Get penalty for different pattern types
   */
  private getPatternPenalty(patternType: string, count: number): number {
    const penalties: { [key: string]: number } = {
      phone: 15,
      email: 10,
      ssn: 40,
      creditCard: 50,
      bankAccount: 45,
    };

    return (penalties[patternType] || 5) * count;
  }

  /**
   * Mask sensitive patterns in content
   */
  private maskPattern(content: string, pattern: RegExp, type: string): string {
    return content.replace(pattern, (match) => {
      switch (type) {
        case 'phone':
          return match.replace(/\d/g, (char, index) => 
            index < match.length - 4 ? '*' : char
          );
        case 'email':
          const [local, domain] = match.split('@');
          const maskedLocal = local.length > 2 
            ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
            : '*'.repeat(local.length);
          return `${maskedLocal}@${domain}`;
        case 'ssn':
        case 'creditCard':
        case 'bankAccount':
          return '***MASKED***';
        default:
          return match;
      }
    });
  }

  /**
   * Validate message content
   */
  validateMessage(content: string, type: string): { isValid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { isValid: false, error: 'Message content is required' };
    }

    if (content.length > 5000) {
      return { isValid: false, error: 'Message content too long (max 5000 characters)' };
    }

    // Check for excessive line breaks
    const lineBreakCount = (content.match(/\n/g) || []).length;
    if (lineBreakCount > 20) {
      return { isValid: false, error: 'Too many line breaks' };
    }

    return { isValid: true };
  }
}