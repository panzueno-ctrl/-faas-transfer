import os
import shutil
import glob

components_dir = r'/home/daven/faas-transfer/mobile/src/components'
ui_dir = r'/home/daven/faas-transfer/mobile/src/features/convert/ui'

files_to_move = [
    'OrganizeEditor.tsx',
    'MergeEditor.tsx',
    'CompressEditor.tsx',
    'ProtectEditor.tsx',
    'PdfEditor.tsx',
    'WatermarkEditor.tsx',
    'RotationEditor.tsx',
    'CompressionSelector.tsx',
    'ConversionOptions.tsx',
    'NumberingSelector.tsx',
    'OcrLanguageSelector.tsx',
    'PasswordProtector.tsx',
    'PdfEditItemView.tsx',
    'PdfThumbnail.tsx',
    'PdfThumbnail.web.tsx',
    'SplitSelector.tsx',
    'SplitEditor.tsx',
    'SignaturePad.tsx'
]

os.makedirs(ui_dir, exist_ok=True)

# Move files
moved_files = []
for file in files_to_move:
    src = os.path.join(components_dir, file)
    dst = os.path.join(ui_dir, file)
    if os.path.exists(src):
        shutil.move(src, dst)
        moved_files.append(file)
        print(f"Moved {file}")

if not moved_files:
    print("No files moved.")

# Update imports in all files in mobile/src
src_dir = r'/home/daven/faas-transfer/mobile/src'
for filepath in glob.glob(src_dir + '/**/*.ts*', recursive=True):
    if not os.path.isfile(filepath): continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original_content = content
    
    # We need to replace imports like:
    # from '../components/OrganizeEditor' to '../features/convert/ui/OrganizeEditor'
    # or '../../../components/OrganizeEditor'
    
    for moved_file in moved_files:
        module_name = moved_file.replace('.tsx', '').replace('.ts', '').replace('.web', '')
        
        # If in convert.tsx (which is in src/app)
        # Old: import OrganizeEditor from '../components/OrganizeEditor';
        # New: import OrganizeEditor from '../features/convert/ui/OrganizeEditor';
        
        if 'app' in filepath:
            content = content.replace(f"from '../components/{module_name}'", f"from '../features/convert/ui/{module_name}'")
            content = content.replace(f"from \"../components/{module_name}\"", f"from \"../features/convert/ui/{module_name}\"")
        elif 'features' in filepath:
            content = content.replace(f"from '../../../components/{module_name}'", f"from '../{module_name}'")
            content = content.replace(f"from \"../../../components/{module_name}\"", f"from \"../{module_name}\"")
            content = content.replace(f"from '../../components/{module_name}'", f"from '../ui/{module_name}'")
            content = content.replace(f"from \"../../components/{module_name}\"", f"from \"../ui/{module_name}\"")
        elif 'components' in filepath:
            content = content.replace(f"from './{module_name}'", f"from '../features/convert/ui/{module_name}'")
            content = content.replace(f"from \"./{module_name}\"", f"from \"../features/convert/ui/{module_name}\"")
            
        # Update imports INSIDE the moved files (they are now in features/convert/ui)
        # If they imported a component like ActionCard:
        # Old: import ActionCard from './ActionCard'
        # New: import ActionCard from '../../../components/ActionCard'
        if filepath.startswith(ui_dir):
            content = content.replace(f"from './ActionCard'", f"from '../../../components/ActionCard'")
            content = content.replace(f"from \"./ActionCard\"", f"from \"../../../components/ActionCard\"")
            # they might import each other:
            # Old: import PdfThumbnail from './PdfThumbnail'
            # New: import PdfThumbnail from './PdfThumbnail' (stays the same, wait! The above rule f"from './{module_name}'" replaced it! Let's fix that)
            # Actually, if we are in ui_dir, we shouldn't replace "./OtherEditor" with "../features/convert/ui/OtherEditor" because they are in the same folder.
            
    if original_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated imports in {filepath}")

# Let's fix the intra-ui imports that might have been messed up
for filepath in glob.glob(ui_dir + '/*.ts*', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig = content
    for moved_file in moved_files:
        module_name = moved_file.replace('.tsx', '').replace('.ts', '').replace('.web', '')
        # If it was replaced by the 'components' rule:
        content = content.replace(f"from '../features/convert/ui/{module_name}'", f"from './{module_name}'")
        content = content.replace(f"from \"../features/convert/ui/{module_name}\"", f"from \"./{module_name}\"")
        
    if orig != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed intra-UI imports in {filepath}")
