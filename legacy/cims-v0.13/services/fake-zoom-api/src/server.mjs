import { createFakeZoomApi } from './app.mjs';
const app=createFakeZoomApi();
const port=Number(process.env.FAKE_ZOOM_PORT||4300);
await app.listen(port,'0.0.0.0');
console.log(`Fake Zoom API listening on http://0.0.0.0:${port}`);
