const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_URL || 'http://localhost:5000';

const configContent = `window.ENV = { API_URL: '${apiUrl}' };`;

fs.writeFileSync(path.join(__dirname, 'config.js'), configContent);
console.log('Generated config.js with API_URL:', apiUrl);
