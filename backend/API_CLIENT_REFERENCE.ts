// API_CLIENT_REFERENCE.ts
// Example API client functions for testing the authentication endpoints

// ============================================
// OTP-BASED AUTHENTICATION EXAMPLES
// ============================================

/**
 * Step 1: Request OTP
 * User provides their email or phone number
 */
async function requestOtp(identifier: string): Promise<any> {
  const response = await fetch('http://localhost:3000/auth/otp/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to request OTP');
  }
  return data;
}

/**
 * Step 2: Verify OTP
 * User provides the OTP they received
 * For new users, also provide name
 */
async function verifyOtp(
  identifier: string,
  otp: string,
  name?: string
): Promise<any> {
  const response = await fetch('http://localhost:3000/auth/otp/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier,
      otp,
      name, // Optional - for new user registration
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to verify OTP');
  }
  return data;
}

/**
 * Resend OTP
 * User can request a new OTP if they didn't receive it
 */
async function resendOtp(identifier: string): Promise<any> {
  const response = await fetch('http://localhost:3000/auth/otp/resend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to resend OTP');
  }
  return data;
}

/**
 * Cancel OTP
 * User can cancel the OTP request
 */
async function cancelOtp(identifier: string): Promise<any> {
  const response = await fetch('http://localhost:3000/auth/otp/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to cancel OTP');
  }
  return data;
}

/**
 * Check OTP Status
 * Check if OTP is sent, verified, and how many attempts left
 */
async function checkOtpStatus(identifier: string, type: 'email' | 'phone'): Promise<any> {
  const response = await fetch('http://localhost:3000/auth/otp/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier, type }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to check OTP status');
  }
  return data;
}

// ============================================
// SOCIAL AUTHENTICATION EXAMPLES
// ============================================

/**
 * Google OAuth Login
 * Redirects user to Google consent screen
 */
function loginWithGoogle(): void {
  window.location.href = 'http://localhost:3000/auth/social/google';
}

/**
 * Facebook OAuth Login
 * Redirects user to Facebook consent screen
 */
function loginWithFacebook(): void {
  window.location.href = 'http://localhost:3000/auth/social/facebook';
}

/**
 * Apple OAuth Login
 * Redirects user to Apple Sign In screen
 */
function loginWithApple(): void {
  window.location.href = 'http://localhost:3000/auth/social/apple';
}

/**
 * Handle OAuth Callback
 * Called after user authorizes with social provider
 * Extract token from URL and store it
 */
function handleOAuthCallback(): void {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const provider = params.get('provider');
  const userId = params.get('userId');

  if (token) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', userId || '');
    localStorage.setItem('provider', provider || '');
    // Redirect to dashboard
    window.location.href = '/dashboard';
  } else {
    const error = params.get('message');
    console.error('OAuth error:', error);
  }
}

/**
 * Get linked social accounts
 * Requires authentication token
 */
async function getLinkedAccounts(token: string): Promise<any> {
  const response = await fetch('http://localhost:3000/auth/social/accounts', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to get linked accounts');
  }
  return data;
}

/**
 * Link Social Account
 * Link an additional social account to existing profile
 */
async function linkSocialAccount(token: string, provider: string): Promise<any> {
  const response = await fetch(`http://localhost:3000/auth/social/link/${provider}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ provider }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Failed to link ${provider} account`);
  }
  return data;
}

/**
 * Unlink Social Account
 * Remove a social account link from profile
 */
async function unlinkSocialAccount(token: string, provider: string): Promise<any> {
  const response = await fetch(`http://localhost:3000/auth/social/unlink/${provider}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Failed to unlink ${provider} account`);
  }
  return data;
}

/**
 * Get Available Auth Methods
 * Get list of auth methods user can use
 */
async function getAuthMethods(token: string): Promise<any> {
  const response = await fetch('http://localhost:3000/auth/social/methods', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to get auth methods');
  }
  return data;
}

// ============================================
// COMPLETE OTP LOGIN FLOW EXAMPLE
// ============================================

async function completeOtpLoginFlow(
  identifier: string,
  otp: string,
  name?: string
): Promise<{ token: string; user: any }> {
  try {
    // Step 1: Request OTP (already done by user)
    console.log('Requesting OTP for:', identifier);

    // Step 2: User receives OTP and enters it
    console.log('Verifying OTP:', otp);
    const result = await verifyOtp(identifier, otp, name);

    if (result.success) {
      const { token, user } = result.data;
      localStorage.setItem('authToken', token);
      return { token, user };
    } else {
      throw new Error(result.error?.message || 'Login failed');
    }
  } catch (error) {
    console.error('OTP login flow error:', error);
    throw error;
  }
}

// ============================================
// COMPLETE SOCIAL LOGIN FLOW EXAMPLE
// ============================================

async function completeSocialLoginFlow(provider: 'google' | 'facebook' | 'apple'): Promise<void> {
  try {
    // Step 1: Redirect to OAuth provider
    const redirectFunctions = {
      google: loginWithGoogle,
      facebook: loginWithFacebook,
      apple: loginWithApple,
    };

    redirectFunctions[provider]();

    // Step 2: Provider redirects back to /auth/callback
    // handleOAuthCallback() is called automatically on callback page
  } catch (error) {
    console.error('Social login flow error:', error);
    throw error;
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*

// Example 1: Email OTP Login
async function emailLoginExample() {
  try {
    // Step 1: Request OTP
    const otpResponse = await requestOtp('user@example.com');
    console.log('OTP sent:', otpResponse.data.message);
    
    // Step 2: User receives email and gets OTP, enters it
    const otpInput = prompt('Enter OTP from email:');
    
    // Step 3: Verify OTP
    const result = await verifyOtp('user@example.com', otpInput);
    console.log('Login successful:', result.data.user);
    localStorage.setItem('authToken', result.data.token);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: SMS OTP Login
async function smsLoginExample() {
  try {
    // Step 1: Request OTP to phone
    const otpResponse = await requestOtp('+923001234567');
    console.log('OTP sent to phone');
    
    // Step 2: User receives SMS
    const otpInput = prompt('Enter OTP from SMS:');
    
    // Step 3: Verify OTP
    const result = await verifyOtp('+923001234567', otpInput);
    console.log('Login successful:', result.data.user);
    localStorage.setItem('authToken', result.data.token);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 3: OTP Registration (New User)
async function otpRegistrationExample() {
  try {
    const email = 'newuser@example.com';
    const name = 'John Doe';
    
    // Step 1: Request OTP
    await requestOtp(email);
    
    // Step 2: User enters OTP from email
    const otp = prompt('Enter OTP from email:');
    
    // Step 3: Verify and create account
    const result = await verifyOtp(email, otp, name);
    console.log('Account created:', result.data.user);
    localStorage.setItem('authToken', result.data.token);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 4: Google Login
function googleLoginExample() {
  loginWithGoogle(); // Will redirect to Google consent screen
}

// Example 5: Link Multiple Social Accounts
async function linkMultipleSocialExample() {
  const token = localStorage.getItem('authToken');
  
  try {
    // Get current linked accounts
    const accounts = await getLinkedAccounts(token);
    console.log('Linked accounts:', accounts.data.accounts);
    
    // Link another provider
    const linkResult = await linkSocialAccount(token, 'facebook');
    console.log('Linking initiated:', linkResult.data.message);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

*/

// ============================================
// EXPORT FOR USE IN FRONTEND
// ============================================

export {
  requestOtp,
  verifyOtp,
  resendOtp,
  cancelOtp,
  checkOtpStatus,
  loginWithGoogle,
  loginWithFacebook,
  loginWithApple,
  handleOAuthCallback,
  getLinkedAccounts,
  linkSocialAccount,
  unlinkSocialAccount,
  getAuthMethods,
  completeOtpLoginFlow,
  completeSocialLoginFlow,
};
