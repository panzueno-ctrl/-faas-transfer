import re

filepath = 'server/routes/convert.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to match from Content-Disposition down to fs.unlinkSync(pathVar)
# Some routes might have been partially modified. Let's match res.setHeader(...) down to res.send(fs.readFileSync(...))

pattern = re.compile(
    r"res\.setHeader\('Content-Disposition',\s*`attachment;\s*filename=\"\$\{([^}]+)\}\"`\);\s*"
    r"(?:res\.setHeader\('Content-Type',\s*'[^']+'\);\s*)?"
    r"res\.send\(fs\.readFileSync\(([^)]+)\)\);\s*"
    r"(?:.*\n)*?\s*"
    r"(?:try\s*{\s*)?fs\.unlinkSync\(\2\);(?:\s*}\s*catch\s*\([^)]*\)\s*{})?",
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

# If there are any res.send(fs.readFileSync(...)) left without unlinkSync below them (like if they were partially modified):
# Let's catch them too.
pattern2 = re.compile(
    r"res\.setHeader\('Content-Disposition',\s*`attachment;\s*filename=\"\$\{([^}]+)\}\"`\);\s*"
    r"(?:res\.setHeader\('Content-Type',\s*'[^']+'\);\s*)?"
    r"res\.send\(fs\.readFileSync\(([^)]+)\)\);"
)
content = pattern2.sub(replacer, content)

# Also remove any remaining fs.unlinkSync(pdfPath) etc that were left behind if pattern2 matched
# Actually, the middleware handles req.file.path, but the output paths are handled by res.download callback.
# I'll just clean up the file manually if needed, or let's see.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored remaining readFileSync calls!")
