// src/config/swagger.config.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);

  const apiTitle = configService.get('app.name') || 'Scam Awareness Platform API';
  const apiDescription = configService.get('app.description') || 'API documentation for Scam Awareness Platform';
  const apiVersion = configService.get('app.version') || '1.0.0';
  const apiContactName = configService.get('app.contact.name') || 'Support Team';
  const apiContactUrl = configService.get('app.contact.url') || 'https://scamawareness.example.com';
  const apiContactEmail = configService.get('app.contact.email') || 'support@scamawareness.example.com';
  const apiLicense = configService.get('app.license.name') || 'MIT';
  const apiLicenseUrl = configService.get('app.license.url') || 'https://opensource.org/licenses/MIT';

  const apiServers = [
    {
      url: configService.get('app.apiUrl') || 'http://localhost:3001',
      description: configService.get('app.environment') || 'Development Server',
    },
  ];

  const stagingUrl = configService.get('app.stagingUrl');
  const productionUrl = configService.get('app.productionUrl');

  if (stagingUrl) {
    apiServers.push({ url: stagingUrl, description: 'Staging Server' });
  }

  if (productionUrl) {
    apiServers.push({ url: productionUrl, description: 'Production Server' });
  }

  const configBuilder = new DocumentBuilder()
    .setTitle(apiTitle)
    .setDescription(apiDescription)
    .setVersion(apiVersion)
    // .addTag('Authentication', 'User authentication and authorization endpoints')
    // .addTag('Users', 'User profile management')
    // .addTag('Companies', 'Company management')
    // .addTag('Posts', 'Scam reports and awareness posts')
    // .addTag('Groups', 'Group management')
    // .addTag('Comments', 'Comments system endpoints')
    // .addTag('Comment Reports', 'Comment reporting endpoints')
    // CRITICAL: Use consistent name "bearer" (lowercase)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token (without "Bearer" prefix)',
        name: 'Authorization',
        in: 'header',
      },
      'bearer', // ← This name must match @ApiBearerAuth() decorator
    )
    .setContact(apiContactName, apiContactUrl, apiContactEmail)
    .setLicense(apiLicense, apiLicenseUrl);

  apiServers.forEach((server) => {
    configBuilder.addServer(server.url, server.description);
  });

  const config = configBuilder.build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // ← Keeps token saved
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: apiTitle,
    customCss: `
      .swagger-ui .topbar { 
        background-color: ${configService.get('app.theme.primaryColor') || '#1a237e'}; 
      }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .scheme-container { margin: 20px 0; }
      .swagger-ui .btn.authorize {
        background-color: #4CAF50;
        border-color: #4CAF50;
      }
      .swagger-ui .btn.authorize svg {
        fill: white;
      }
    `,
    customfavIcon: '/favicon.ico',
  });

  console.log(`📚 Swagger documentation available at: ${apiServers[0].url}/docs`);
}