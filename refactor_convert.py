import re
import os

filepath = 'server/routes/convert.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

cleanup_middleware = """
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
"""

if "MIDDLEWARE DE NETTOYAGE AUTO" not in content:
    content = content.replace("const router = express.Router();", "const router = express.Router();\n" + cleanup_middleware)

# Replace all res.send(fs.readFileSync(...)) blocks
# Regex to match:
# res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
# res.setHeader('Content-Type', 'application/pdf');
# res.send(fs.readFileSync(pdfPath));
# fs.unlinkSync(inputPath);
# fs.unlinkSync(pdfPath);

pattern = re.compile(
    r"res\.setHeader\('Content-Disposition',\s*`attachment;\s*filename=\"\$\{([^}]+)\}\"`\);\s*"
    r"res\.setHeader\('Content-Type',\s*'[^']+'\);\s*"
    r"res\.send\(fs\.readFileSync\(([^)]+)\)\);\s*"
    r"(?:try\s*{\s*)?fs\.unlinkSync\([^)]+\);(?:\s*}\s*catch\s*\([^)]*\)\s*{})?\s*"
    r"(?:try\s*{\s*)?fs\.unlinkSync\([^)]+\);(?:\s*}\s*catch\s*\([^)]*\)\s*{})?",
    re.MULTILINE
)

def replacer(match):
    filename_var = match.group(1)
    path_var = match.group(2)
    return f"""res.download({path_var}, {filename_var}, (err) => {{
            if (fs.existsSync({path_var})) {{
                try {{ fs.unlinkSync({path_var}); }} catch(e) {{}}
            }}
        }});"""

content = pattern.sub(replacer, content)

# Remove any remaining fs.unlinkSync(inputPath) since the middleware handles it
content = re.sub(r"fs\.unlinkSync\(inputPath\);", "", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully refactored with Python!")
