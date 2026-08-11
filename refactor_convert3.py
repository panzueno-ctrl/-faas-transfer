import re

filepath = 'server/routes/convert.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(
    r"res\.setHeader\('Content-Disposition',\s*`?attachment;\s*filename=\"([^\"]+)\"`?\);\s*"
    r"(?:res\.setHeader\('Content-Type',\s*'[^']+'\);\s*)?"
    r"res\.send\(fs\.readFileSync\(([^)]+)\)\);\s*"
    r"(?:.*\n)*?\s*"
    r"(?:try\s*{\s*)?fs\.unlinkSync\(\2\);(?:\s*}\s*catch\s*\([^)]*\)\s*{})?",
    re.MULTILINE
)

def replacer(match):
    filename_str = match.group(1)
    path_var = match.group(2)
    # Note: filename_str might have ${} inside if it was backticks, but our regex captures the whole string.
    # Actually if it was `filename="${var}"`, it would have been caught. This one catches "images.zip" or `page-1.${ext}`
    return f"""res.download({path_var}, `{filename_str}`, (err) => {{
            if (fs.existsSync({path_var})) {{
                try {{ fs.unlinkSync({path_var}); }} catch(e) {{}}
            }}
        }});"""

content = pattern.sub(replacer, content)

# Second pass for those missing unlinkSync below them
pattern2 = re.compile(
    r"res\.setHeader\('Content-Disposition',\s*`?attachment;\s*filename=\"([^\"]+)\"`?\);\s*"
    r"(?:res\.setHeader\('Content-Type',\s*'[^']+'\);\s*)?"
    r"res\.send\(fs\.readFileSync\(([^)]+)\)\);"
)
content = pattern2.sub(replacer, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored remaining readFileSync calls (Part 3)!")
