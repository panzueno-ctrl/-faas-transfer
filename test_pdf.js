const fs = require('fs');
const { execSync } = require('child_process');

// On utilise Node pour générer des dummy PDF bruts
const pdfContent = `%PDF-1.4
1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj
2 0 obj <</Type/Pages/Count 1/Kids[3 0 R]>> endobj
3 0 obj <</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>> endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000101 00000 n
trailer <</Size 4/Root 1 0 R>>
startxref
172
%%EOF`;

fs.writeFileSync('test1.pdf', pdfContent);
fs.writeFileSync('test2.pdf', pdfContent);

console.log('--- Test PDF Merge ---');
try {
    const curlCmd = `curl -X POST https://faas-transfer.onrender.com/convert/pdf-merge \\
        -H "Accept: application/pdf" \\
        -F "files=@test1.pdf" \\
        -F "files=@test2.pdf" \\
        --output merged-result.pdf --silent -w "%{http_code}"`;
        
    const httpCode = execSync(curlCmd, { encoding: 'utf8' }).trim();
    console.log('HTTP Code PDF Merge:', httpCode);
} catch (e) {
    console.log(e);
}
