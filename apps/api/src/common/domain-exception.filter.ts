import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { DomainError } from '@cims/domain';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest();
    const correlationId = request.correlationId || request.headers?.['x-correlation-id'];

    // Log unexpected errors internally before masking them
    if (!(exception instanceof DomainError) && !(exception instanceof HttpException)) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Unhandled Exception Captured',
          error: exception instanceof Error ? exception.message : String(exception),
          stack: exception instanceof Error ? exception.stack : undefined,
          correlationId,
          route: request.url,
          method: request.method
        })
      );
    }

    if (exception instanceof DomainError) {
      response.status(exception.status).send({
        error: { code: exception.code, message: exception.message, details: exception.details }
      });
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: `Domain Error: ${exception.code}`,
          correlationId,
          route: request.url
        })
      );
      return;
    }

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).send(exception.getResponse());
      return;
    }

    // Handle DB Connection Timeout or Exhaustion
    if (exception instanceof Error && exception.message.includes('timeout')) {
      response.status(503).send({
        error: {
          code: 'DATABASE_TIMEOUT',
          message: 'Database connection timeout or pool exhausted.'
        }
      });
      return;
    }

    // Handle aborted requests or external timeout
    if (exception instanceof Error && exception.name === 'AbortError') {
      response.status(504).send({
        error: { code: 'GATEWAY_TIMEOUT', message: 'Request to external dependency timed out.' }
      });
      return;
    }

    response.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.', correlationId }
    });
  }
}
