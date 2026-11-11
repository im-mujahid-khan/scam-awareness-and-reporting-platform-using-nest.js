export interface SafetyCheckResult {
  isSafe: boolean;
  filteredContent: string;
  violations: string[];
  originalContent: string;
}

export interface SensitivePattern {
  pattern: RegExp;
  type: string;
  replacement: string;
}