const fs = require('fs');

const path = '/home/daven/faas-transfer/server/routes/convert.js';
let content = fs.readFileSync(path, 'utf8');

// The bug is that we have `try { fs.unlinkSync(VAR); } catch(e) {}` 
// shortly after `res.download(VAR, ...)`
// Let's find all `res.download(VAR` and then remove any subsequent synchronous `try { fs.unlinkSync(VAR); } catch(e) {}` within the same block.

const lines = content.split('\n');
let newLines = [];
let downloadedVars = new Set();
let inDownloadCallback = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if entering a download callback
    const downloadMatch = line.match(/res\.download\s*\(\s*([a-zA-Z0-9_]+)/);
    if (downloadMatch) {
        downloadedVars.add(downloadMatch[1]);
    }

    // Reset downloadedVars at the end of a route handler (very roughly, when we see router.post)
    if (line.includes('router.post(')) {
        downloadedVars.clear();
    }

    // Check if this line is an unlinkSync
    const unlinkMatch = line.match(/try\s*\{\s*fs\.unlinkSync\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*;\s*\}\s*catch\s*\(\s*e\s*\)\s*\{\}/);
    
    // If it is an unlinkSync, check if we are inside a res.download callback block
    // A simplistic way is: if we see it and it matches a downloaded var, AND it's not inside the res.download callback, we might want to drop it.
    // Actually, ALL of the extra unlinks are at the root level of the exec callback, with exactly 8 spaces of indentation.
    // The ones inside the res.download callback usually have 12 or 16 spaces of indentation.
    // Let's just check the indentation.
    
    let shouldDrop = false;
    if (unlinkMatch) {
        const varName = unlinkMatch[1];
        if (downloadedVars.has(varName)) {
            // Check indentation
            const leadingSpaces = line.match(/^(\s*)/)[1].length;
            if (leadingSpaces === 8) {
                // This is the bug! It's outside the res.download callback
                shouldDrop = true;
                console.log(`Dropped buggy unlink at line ${i+1}: ${line.trim()}`);
            }
        }
    }
    
    // Wait, in pdf-to-image there is:
    // try { fs.unlinkSync(zipPath); } catch(e) {}
    // Files.forEach(...)
    // with 12 spaces of indentation!
    if (unlinkMatch) {
        const varName = unlinkMatch[1];
        if (downloadedVars.has(varName)) {
             // Let's just check if it's the exact line that follows `});` of the download callback.
             // Actually, if we just remove ANY unlink of the downloaded var that is NOT inside the callback.
             // The callback has `if (fs.existsSync(VAR)) { try { fs.unlinkSync(VAR); } catch(e) {} }`
             // So the one inside the callback is usually indented more or preceded by `if (fs.existsSync`
             if (!lines[i-1].includes('fs.existsSync')) {
                 if (lines[i].includes('catch(e) {}')) {
                     // Drop it!
                     shouldDrop = true;
                     console.log(`Dropped buggy unlink at line ${i+1}: ${line.trim()}`);
                 }
             }
        }
    }

    if (!shouldDrop) {
        newLines.push(line);
    }
}

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('Fixed convert.js');
