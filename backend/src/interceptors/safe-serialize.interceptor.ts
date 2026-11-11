import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class SafeSerializeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        try {
          // Safely serialize, catching any circular references
          return this.safeSerialize(data);
        } catch (error) {
          // If serialization fails, return minimal safe data
          console.warn('Serialization warning:', error.message);
          return {
            data: 'Response serialized with safety wrapper',
            originalType: typeof data,
            timestamp: new Date().toISOString()
          };
        }
      })
    );
  }
  
  private safeSerialize(data: any): any {
    // Handle null/undefined
    if (data === null || data === undefined) {
      return data;
    }
    
    // Handle primitives
    if (typeof data !== 'object') {
      return data;
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.safeSerialize(item));
    }
    
    // Handle Date objects
    if (data instanceof Date) {
      return data.toISOString();
    }
    
    // Handle plain objects - remove circular references
    const seen = new WeakSet();
    const replacer = (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    };
    
    return JSON.parse(JSON.stringify(data, replacer));
  }
}