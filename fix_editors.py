import os

# Fix MergeEditor.tsx
merge_path = '/home/daven/faas-transfer/mobile/src/components/MergeEditor.tsx'
with open(merge_path, 'r') as f:
    merge_content = f.read()

merge_old = """    useEffect(() => {
        setPages(prev => {
            const newPages = [...prev];
            let changed = false;
            initialPages.forEach(p => {
                if (!newPages.find(existing => existing.id === p.id)) {
                    newPages.push(p);
                    changed = true;
                }
            });
            if (changed) {
                newPages.sort((a, b) => {
                    if (a.fileIndex !== b.fileIndex) return a.fileIndex - b.fileIndex;
                    return a.pageIndex - b.pageIndex;
                });
            }
            return changed ? newPages : prev;
        });
    }, [initialPages]);

    useEffect(() => {
        setFilesOrder(prev => {
            const newFiles = [...prev];
            let changed = false;
            initialFiles.forEach(f => {
                const existing = newFiles.find(existing => existing.originalIndex === f.originalIndex);
                if (!existing) {
                    newFiles.push(f);
                    changed = true;
                } else if (existing.pageCount !== f.pageCount) {
                    existing.pageCount = f.pageCount;
                    changed = true;
                }
            });
            return changed ? newFiles : prev;
        });
    }, [initialFiles]);"""

merge_new = """    useEffect(() => {
        setPages(prev => {
            const newPages = [...prev];
            let changed = false;
            initialPages.forEach(p => {
                const existingIdx = newPages.findIndex(existing => existing.id === p.id);
                if (existingIdx === -1) {
                    newPages.push(p);
                    changed = true;
                } else if (newPages[existingIdx].imageUri !== p.imageUri) {
                    newPages[existingIdx] = { ...newPages[existingIdx], imageUri: p.imageUri };
                    changed = true;
                }
            });
            if (changed) {
                newPages.sort((a, b) => {
                    if (a.fileIndex !== b.fileIndex) return a.fileIndex - b.fileIndex;
                    return a.pageIndex - b.pageIndex;
                });
            }
            return changed ? newPages : prev;
        });
    }, [initialPages]);

    useEffect(() => {
        setFilesOrder(prev => {
            const newFiles = [...prev];
            let changed = false;
            initialFiles.forEach(f => {
                const existingIdx = newFiles.findIndex(existing => existing.originalIndex === f.originalIndex);
                if (existingIdx === -1) {
                    newFiles.push(f);
                    changed = true;
                } else if (newFiles[existingIdx].pageCount !== f.pageCount) {
                    newFiles[existingIdx] = { ...newFiles[existingIdx], pageCount: f.pageCount };
                    changed = true;
                }
            });
            return changed ? newFiles : prev;
        });
    }, [initialFiles]);"""

if merge_old in merge_content:
    merge_content = merge_content.replace(merge_old, merge_new)
    with open(merge_path, 'w') as f:
        f.write(merge_content)
    print("MergeEditor.tsx updated successfully")
else:
    print("MergeEditor.tsx: old string not found")

# Fix OrganizeEditor.tsx
org_path = '/home/daven/faas-transfer/mobile/src/components/OrganizeEditor.tsx'
with open(org_path, 'r') as f:
    org_content = f.read()

org_old = """    const [pages, setPages] = useState<OrganizePageItem[]>(initialPages);
    const [filesOrder, setFilesOrder] = useState<OrganizeFileItem[]>(initialFiles);"""

org_new = """    const [pages, setPages] = useState<OrganizePageItem[]>(initialPages);
    const [filesOrder, setFilesOrder] = useState<OrganizeFileItem[]>(initialFiles);

    React.useEffect(() => {
        setPages(prev => {
            const newPages = [...prev];
            let changed = false;
            initialPages.forEach(p => {
                const existingIdx = newPages.findIndex(existing => existing.id === p.id);
                if (existingIdx === -1) {
                    newPages.push(p);
                    changed = true;
                } else if (newPages[existingIdx].imageUri !== p.imageUri) {
                    newPages[existingIdx] = { ...newPages[existingIdx], imageUri: p.imageUri };
                    changed = true;
                }
            });
            if (changed) {
                newPages.sort((a, b) => {
                    if (a.fileIndex !== b.fileIndex) return a.fileIndex - b.fileIndex;
                    return a.pageIndex - b.pageIndex;
                });
            }
            return changed ? newPages : prev;
        });
    }, [initialPages]);

    React.useEffect(() => {
        setFilesOrder(prev => {
            const newFiles = [...prev];
            let changed = false;
            initialFiles.forEach(f => {
                const existingIdx = newFiles.findIndex(existing => existing.originalIndex === f.originalIndex);
                if (existingIdx === -1) {
                    newFiles.push(f);
                    changed = true;
                } else if (newFiles[existingIdx].pageCount !== f.pageCount) {
                    newFiles[existingIdx] = { ...newFiles[existingIdx], pageCount: f.pageCount };
                    changed = true;
                }
            });
            return changed ? newFiles : prev;
        });
    }, [initialFiles]);"""

if org_old in org_content:
    org_content = org_content.replace(org_old, org_new)
    with open(org_path, 'w') as f:
        f.write(org_content)
    print("OrganizeEditor.tsx updated successfully")
else:
    print("OrganizeEditor.tsx: old string not found")
