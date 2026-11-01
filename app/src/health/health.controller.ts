import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    // Used by Docker HEALTHCHECK and Kubernetes liveness/readiness probes.
    return { status: 'ok' };
  }
}
