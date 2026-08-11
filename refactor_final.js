const fs = require('fs');
let content = fs.readFileSync('server/routes/convert.js', 'utf8');

// Replace all remaining readFileSync
content = content.replace(/res\.send\(fs\.readFileSync\((.*?)\)\);/g, (match, pathVar) => {
    return `res.download(${pathVar}, (err) => {
        if (fs.existsSync(${pathVar})) {
            try { fs.unlinkSync(${pathVar}); } catch(e) {}
        }
    });`;
});

// Remove any lingering fs.unlinkSync(pathVar) that were right below it
// But we have to be careful not to remove important ones.
// We only remove fs.unlinkSync(...) if it is immediately following a res.download.
// Actually, it's safer to just leave them inside try-catch, but they might crash if already deleted.
// Oh wait, `unlinkSync` crashes if file doesn't exist. Let's wrap ALL unlinkSync in the file in try-catch if they aren't already!
content = content.replace(/(?<!try\s*{\s*)fs\.unlinkSync\((.*?)\);/g, 'try { fs.unlinkSync($1); } catch(e) {}');

fs.writeFileSync('server/routes/convert.js', content);
console.log('Final replacement complete!');
