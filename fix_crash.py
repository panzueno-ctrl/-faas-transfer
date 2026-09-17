import re

with open('mobile/src/app/convert.tsx', 'r') as f:
    text = f.read()

# Fix handleAddFilesToOrganize
old_add = '''            if (!res.canceled && res.assets && res.assets.length > 0) {
                await initOrganizeEditor(res.assets, true);
            }'''
new_add = '''            if (!res.canceled && res.assets && res.assets.length > 0) {
                setSelectedFiles(prev => [...prev, ...res.assets]);
                await initOrganizeEditor(res.assets, true);
            }'''
text = text.replace(old_add, new_add)

# Fix map in staging
old_map = '''                    {selectedFiles.map((f, i) => (
                        <View key={i} style={styles.fileListItem}>
                            <View style={[styles.fileIconBox, { backgroundColor: selectedService.color + '20' }]}>
                                <Ionicons name={getFileIcon(f.name)} size={24} color={selectedService.color} />
                            </View>
                            <View style={styles.fileListInfo}>
                                <Text style={styles.fileListName} numberOfLines={1}>{f.name}</Text>
                                <Text style={styles.fileListSize}>{formatSize(f.size)}</Text>
                            </View>
                            <Pressable onPress={() => removeFile(i)} style={styles.removeFileBtn}>
                                <Ionicons name=
