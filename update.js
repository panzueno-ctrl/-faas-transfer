const fs = require('fs');

// Update MergeEditor.tsx
let mergeEditor = fs.readFileSync('mobile/src/components/MergeEditor.tsx', 'utf8');
mergeEditor = mergeEditor.replace(
  /const pageCount = pages.filter\\(p => p.fileIndex === file.originalIndex\\).length;/g,
  'const pageCount = file.pageCount || pages.filter(p => p.fileIndex === file.originalIndex).length;'
);
fs.writeFileSync('mobile/src/components/MergeEditor.tsx', mergeEditor);

// Update convert.tsx
let convert = fs.readFileSync('mobile/src/app/convert.tsx', 'utf8');
convert = convert.replace(
  /newOrganizeFiles\\.push\\(\\{ name: file\\.name, color, originalIndex: fileIndex, buffer: arrayBuffer \\}\\);/g,
  'newOrganizeFiles.push({ name: file.name, color, originalIndex: fileIndex, buffer: arrayBuffer, pageCount: undefined });'
);
fs.writeFileSync('mobile/src/app/convert.tsx', convert);

