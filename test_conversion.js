const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function testConversion() {
    console.log('--- TEST DE CONVERSION SUR LE SERVEUR RENDER ---');
    console.log('1. Création d\'un fichier texte temporaire...');
    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, 'Bonjour Enoch, ceci est un test de conversion LibreOffice sur Render pour valider l\'architecture de FaaS Transfer !');

    try {
        console.log('2. Envoi du fichier à https://faas-transfer.onrender.com/api/convert/word-to-pdf ...');
        // On utilise curl pour envoyer en multipart/form-data
        const curlCmd = `curl -X POST https://faas-transfer.onrender.com/api/convert/word-to-pdf \\
            -H "Accept: application/pdf" \\
            -F "file=@${testFilePath}" \\
            --output test-result.pdf --silent -w "%{http_code}"`;
            
        const httpCode = execSync(curlCmd, { encoding: 'utf8' }).trim();
        
        if (httpCode === '200') {
            const stats = fs.statSync('test-result.pdf');
            console.log(`\n✅ SUCCÈS ! Le serveur a renvoyé un PDF de ${stats.size} octets.`);
            console.log('Cela confirme que Docker et LibreOffice fonctionnent parfaitement en production !');
        } else {
            console.log(`\n❌ ERREUR ! Le serveur a renvoyé le code HTTP : ${httpCode}`);
            const errorContent = fs.readFileSync('test-result.pdf', 'utf8');
            console.log('Réponse :', errorContent);
        }
    } catch (error) {
        console.error('❌ Erreur lors du test :', error.message);
    } finally {
        // Nettoyage
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    }
}

testConversion();
