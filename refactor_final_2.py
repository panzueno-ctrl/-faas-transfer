import re

filepath = 'server/routes/convert.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    path_var = match.group(1)
    return f"""res.download({path_var}, (err) => {{
        if (fs.existsSync({path_var})) {{
            try {{ fs.unlinkSync({path_var}); }} catch(e) {{}}
        }}
    }});"""

content = re.sub(r"res\.send\(fs\.readFileSync\((.*?)\)\);", replacer, content)

# Clean up all try-catches around fs.unlinkSync first
content = re.sub(r"try\s*{\s*fs\.unlinkSync\((.*?)\);\s*}\s*catch\s*\([^)]*\)\s*{}", r"fs.unlinkSync(\1);", content)

# Wrap every single fs.unlinkSync in try-catch
content = re.sub(r"fs\.unlinkSync\((.*?)\);", r"try { fs.unlinkSync(\1); } catch(e) {}", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Final replacement complete!")
