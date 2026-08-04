const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SERVER_URL = 'https://faas-transfer.onrender.com';

async function createDummyFile(filename, sizeMB) {
    const filepath = path.join(__dirname, filename);
    const sizeBytes = sizeMB * 1024 * 1024;
    fs.writeFileSync(filepath, crypto.randomBytes(sizeBytes));
    return filepath;
}

async function testSingleUpload() {
    console.log('--- Test Single Upload (15MB) ---');
    const filepath = await createDummyFile('test_single.bin', 15);
    
    const buffer = fs.readFileSync(filepath);
    const blob = new Blob([buffer]);

    const form = new FormData();
    form.append('file', blob, 'test_single.bin');

    try {
        const response = await fetch(`${SERVER_URL}/upload`, {
            method: 'POST',
            body: form
        });
        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, data);
    } catch (e) {
        console.error('Error during single upload:', e);
    } finally {
        fs.unlinkSync(filepath);
    }
}

async function testMultipleUpload() {
    console.log('--- Test Multiple Upload (3 files of 5MB) ---');
    const files = [];
    for (let i = 1; i <= 3; i++) {
        files.push(await createDummyFile(`test_multi_${i}.bin`, 5));
    }
    
    const form = new FormData();
    for (const file of files) {
        const buffer = fs.readFileSync(file);
        const blob = new Blob([buffer]);
        form.append('files', blob, path.basename(file));
    }

    try {
        const response = await fetch(`${SERVER_URL}/upload/multiple`, {
            method: 'POST',
            body: form
        });
        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, data);
    } catch (e) {
        console.error('Error during multiple upload:', e);
    } finally {
        for (const file of files) {
            fs.unlinkSync(file);
        }
    }
}

async function runAllTests() {
    console.log('Démarrage des tests de charge backend...');
    await testSingleUpload();
    await testMultipleUpload();
    console.log('Tests terminés.');
}

runAllTests();
