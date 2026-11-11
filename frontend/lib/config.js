// lib/config.js
const config = {
  // API Configuration
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  
  // OAuth Configuration
  oauth: {
    google: {
      enabled: true,
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    },
    facebook: {
      enabled: false,
    },
    apple: {
      enabled: false,
    }
  },
  
  // App Configuration
  app: {
    name: 'Scam Awareness Platform',
    version: '1.0.0',
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  },
  
  // Feature Flags
  features: {
    enableGoogleOAuth: true,
    enableFacebookOAuth: false,
    enableAppleOAuth: false,
    enableOtpLogin: true,
    enablePasswordLogin: true,
  }
};

export { config };