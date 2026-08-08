const fs = require('fs');
let content = fs.readFileSync('apps/api/src/modules/hearings/hearings.controller.ts', 'utf8');

content = content.replace(
  `  @Public()
  @Get()
  @Get()
  async list(@CurrentUserContext() user: CurrentUser) {`,
  `  @Get()
  @Public()
  async list(@CurrentUserContext() user?: CurrentUser) {`
);

fs.writeFileSync('apps/api/src/modules/hearings/hearings.controller.ts', content);
