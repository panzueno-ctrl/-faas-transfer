const fs = require('fs');
const filePath = 'server/routes/convert.js';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/libreoffice --/g, 'export HOME=/tmp && libreoffice --');
fs.writeFileSync(filePath, content);
console.log('Fixed libreoffice commands');
