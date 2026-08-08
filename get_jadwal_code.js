const fs = require('fs');
const content = fs.readFileSync(
  'C:Users\rfahr.claudeprojectsc--My-Project-CIMS\025ca478-e422-4e4f-9a95-acefb562516e\tool-results\bt9q6jr79.txt',
  'utf8'
);
console.log(content.slice(0, 3000));
console.log('...\n...');
console.log(content.slice(-3000));
