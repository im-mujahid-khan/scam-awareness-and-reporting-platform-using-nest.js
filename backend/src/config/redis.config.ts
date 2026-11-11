import { createClient } from 'redis';
import { ConfigService } from '@nestjs/config';

export const redisClientProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: async (configService: ConfigService) => {
    const redisUrl = configService.get<string>('REDIS_URL') || 
      `redis://${configService.get<string>('REDIS_HOST') || 'localhost'}:${configService.get<number>('REDIS_PORT') || 6379}`;
    
    const client = createClient({
      url: redisUrl,
    });

    client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    await client.connect();
    return client;
  },
  inject: [ConfigService],
};

export const getRedisConfig = (configService: ConfigService) => ({
  url: configService.get<string>('REDIS_URL') || 
    `redis://${configService.get<string>('REDIS_HOST') || 'localhost'}:${configService.get<number>('REDIS_PORT') || 6379}`,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: null,
});
