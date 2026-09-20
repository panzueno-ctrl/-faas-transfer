import re

with open('mobile/src/components/MergeEditor.tsx', 'r') as f:
    text = f.read()

# Fix File rendering
old_file_img = '''                                    {firstPage ? (
                                        <Image
                                            source={{ uri: firstPage.imageUri }}
                                            style={styles.itemImage}
                                            resizeMode=\
