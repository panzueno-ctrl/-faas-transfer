const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'convert.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. We replace the vulnerable multer config (if not completely done)
// Already done manually, but let's make sure.

// 2. We add a global cleanup middleware at the top of the router
const cleanupMiddleware = `
// --- MIDDLEWARE DE NETTOYAGE AUTO ---
// Garantit que le fichier d'entrée est supprimé peu importe l'issue (succès ou erreur 500)
router.use((req, res, next) => {
    res.on('finish', () => {
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(f => {
                if (fs.existsSync(f.path)) {
                    try { fs.unlinkSync(f.path); } catch (e) {}
                }
            });
        }
    });
    next();
});
// ------------------------------------
`;

if (!content.includes('MIDDLEWARE DE NETTOYAGE AUTO')) {
    content = content.replace('const router = express.Router();', 'const router = express.Router();\n' + cleanupMiddleware);
}

// 3. We replace all the fs.unlinkSync(inputPath) and fs.unlinkSync(xyzPath) with nothing,
// because res.download callback will handle xyzPath, and the middleware handles inputPath.

// Let's use a regex to match the pattern:
// res.setHeader(...);
// res.setHeader(...);
// res.send(fs.readFileSync(VAR_PATH));
// fs.unlinkSync(inputPath);
// fs.unlinkSync(VAR_PATH);

// Actually, some have variations. Let's do a more robust replacement.
// We'll replace res.send(fs.readFileSync(PATH_VAR)) with res.download(PATH_VAR, FILENAME_VAR, () => { try { fs.unlinkSync(PATH_VAR) } catch(e){} })

// To find the filename variable, we look at the line before res.send.
// Usually it's: res.setHeader('Content-Disposition', \`attachment; filename="\${pdfFileName}"\`);
const regex = /res\.setHeader\('Content-Disposition',\s*`attachment;\s*filename="\$\{([^}]+)\}"`\);\s*res\.setHeader\('Content-Type',\s*'[^']+'\);\s*res\.send\(fs\.readFileSync\(([^)]+)\)\);\s*(?:try\s*{\s*)?fs\.unlinkSync\([^)]+\);(?:\s*}\s*catch\s*\([^)]*\)\s*{})?\s*(?:try\s*{\s*)?fs\.unlinkSync\([^)]+\);(?:\s*}\s*catch\s*\([^)]*\)\s*{})?/g;

content = content.replace(regex, (match, fileNameVar, pathVar) => {
    return `res.download(${pathVar}, ${fileNameVar}, (err) => {
            if (fs.existsSync(${pathVar})) {
                try { fs.unlinkSync(${pathVar}); } catch(e) {}
            }
        });`;
});

// Replace remaining manual unlinks for inputPath since middleware handles it
content = content.replace(/fs\.unlinkSync\(inputPath\);/g, '');

// Save
fs.writeFileSync(filePath, content);
console.log('Successfully refactored convert.js for streaming and memory safety!');
