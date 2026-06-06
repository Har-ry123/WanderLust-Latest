const path = require('path');
const majorPath = path.join(__dirname, 'major');
process.chdir(majorPath);
require(path.join(majorPath, 'app.js'));
