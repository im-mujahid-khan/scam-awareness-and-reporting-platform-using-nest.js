// Format phone number for display
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format as +X (XXX) XXX-XXXX for international
  if (cleaned.length > 10) {
    return `+${cleaned.slice(0, cleaned.length - 10)} (${cleaned.slice(-10, -7)}) ${cleaned.slice(-7, -4)}-${cleaned.slice(-4)}`;
  }
  
  return phoneNumber;
};

// Mask sensitive information
export const maskPII = (text, type = 'auto') => {
  if (!text) return '';
  
  if (type === 'email' || text.includes('@')) {
    const [username, domain] = text.split('@');
    if (username.length <= 2) {
      return `${'*'.repeat(username.length)}@${domain}`;
    }
    return `${username[0]}${'*'.repeat(Math.max(0, username.length - 2))}${username.slice(-1)}@${domain}`;
  }
  
  if (type === 'phone' || /^[\d\s\-\+\(\)]{10,}$/.test(text)) {
    const digits = text.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `***-***-${digits.slice(-4)}`;
    }
  }
  
  if (type === 'url' || text.includes('.')) {
    try {
      const url = new URL(text.includes('://') ? text : `https://${text}`);
      const hostname = url.hostname;
      if (hostname.includes('.')) {
        const parts = hostname.split('.');
        const domain = parts[parts.length - 2];
        if (domain.length > 4) {
          return `${domain[0]}${'*'.repeat(domain.length - 2)}${domain.slice(-1)}.${parts[parts.length - 1]}`;
        }
      }
    } catch {
      // Not a valid URL
    }
  }
  
  // Default: mask middle characters
  if (text.length <= 3) {
    return '*'.repeat(text.length);
  }
  
  const visibleChars = Math.floor(text.length / 3);
  return `${text.slice(0, visibleChars)}${'*'.repeat(text.length - visibleChars * 2)}${text.slice(-visibleChars)}`;
};

// Calculate risk score color
export const getRiskColor = (score) => {
  if (score >= 81) return 'danger';
  if (score >= 51) return 'warning';
  if (score >= 21) return 'info';
  return 'success';
};

export const getRiskLabel = (score) => {
  if (score >= 81) return 'Critical';
  if (score >= 51) return 'High';
  if (score >= 21) return 'Medium';
  return 'Low';
};

// Format date
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays < 365 ? undefined : 'numeric'
  });
};

// Validate email
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validate password strength
export const validatePasswordStrength = (password) => {
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*]/.test(password),
  };
  
  const score = Object.values(rules).filter(Boolean).length;
  const strength = score <= 2 ? 'Weak' : score <= 4 ? 'Medium' : 'Strong';
  
  return { rules, score, strength };
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};