import { loadConfig } from './config.mjs';
import { createCimsApplication } from './app.mjs';
const config = loadConfig(),
  app = createCimsApplication(config),
  server = app.createServer();
server.listen(config.port, () => {
  console.log(`CIMS API v0.7.0 listening on http://localhost:${config.port}`);
  console.log(`Database: ${config.dbPath}`);
  console.log(`Video provider: ${config.providerBaseUrl}`);
  if (config.exposeDevelopmentOtp) console.log(`Development OTP: ${config.fixedOtp}`);
});
function shutdown(signal) {
  console.log(`Received ${signal}; shutting down.`);
  server.close(() => {
    app.close();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
