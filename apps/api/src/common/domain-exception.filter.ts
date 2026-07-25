import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { DomainError } from '@cims/domain';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    if (exception instanceof DomainError) {
      response.status(exception.status).send({
        error: { code: exception.code, message: exception.message, details: exception.details },
      });
      return;
    }
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).send(exception.getResponse());
      return;
    }
    response.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' } });
  }
}
