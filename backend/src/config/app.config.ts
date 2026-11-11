// src/config/app.config.ts
export default () => ({
  app: {
    name: process.env.APP_NAME || 'Scam Awareness Platform',
    description: process.env.APP_DESCRIPTION || 'Scam Awareness Platform API',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT || '3001', 10),
    environment: process.env.NODE_ENV || 'development',
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    apiPrefix: process.env.API_PREFIX || '/api/v1',
    
    // Swagger Configuration
    swagger: {
      enabled: process.env.SWAGGER_ENABLED !== 'false', // Enabled by default
      path: process.env.SWAGGER_PATH || 'docs',
    },
    
    // Contact Information
    contact: {
      name: process.env.APP_CONTACT_NAME || 'Support Team',
      url: process.env.APP_CONTACT_URL || 'https://scamawareness.example.com',
      email: process.env.APP_CONTACT_EMAIL || 'support@scamawareness.example.com',
    },
    
    // License Information
    license: {
      name: process.env.APP_LICENSE_NAME || 'MIT',
      url: process.env.APP_LICENSE_URL || 'https://opensource.org/licenses/MIT',
    },
    
    // Staging/Production URLs (for multi-environment Swagger)
    stagingUrl: process.env.STAGING_API_URL,
    productionUrl: process.env.PRODUCTION_API_URL,
    
    // Theme Configuration
    theme: {
      primaryColor: process.env.THEME_PRIMARY_COLOR || '#1a237e',
      secondaryColor: process.env.THEME_SECONDARY_COLOR || '#3949ab',
    },
    
    // Security
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
  },
});