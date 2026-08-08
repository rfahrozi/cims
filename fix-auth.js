const fs = require('fs');

let content = fs.readFileSync('apps/api/src/modules/hearings/hearings.controller.ts', 'utf8');

// Ensure @Public() actually makes it through
content = content.replace(
  `  @Public()
  @Get()
  async list(@CurrentUserContext() user?: CurrentUser) {`,
  `  @Get()
  @Public()
  async list(@CurrentUserContext() user?: CurrentUser) {`
);

fs.writeFileSync('apps/api/src/modules/hearings/hearings.controller.ts', content);
