import { createZoomAdapter } from './app.mjs';
const app = createZoomAdapter();
await app.listen(app.config.port, '0.0.0.0');
console.log(`CIMS Zoom video provider adapter listening on http://0.0.0.0:${app.config.port}`);
