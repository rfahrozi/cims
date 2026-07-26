import { Injectable, ServiceUnavailableException } from '@nestjs/common';
@Injectable()
export class LegacyProxyService {
  async forward(path: string, init: RequestInit = {}) {
    if (process.env.ENABLE_LEGACY_PROXY !== 'true')
      throw new ServiceUnavailableException('Legacy proxy is disabled');
    const base = process.env.LEGACY_API_URL ?? 'http://localhost:3001';
    const res = await fetch(`${base}${path}`, init);
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: await res.text()
    };
  }
}
