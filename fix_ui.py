import os

filepath = "mobile/src/components/MergeEditor.tsx"
with open(filepath, "r") as f:
    text = f.read()

text = text.replace("Platform\n} from \x27react-native\x27;", "Platform,\n    ActivityIndicator\n} from \x27react-native\x27;")

old_file = """                                    {firstPage ? (
                                        <Image
                                            source={{ uri: firstPage.imageUri }}
                                            style={styles.itemImage}
                                            resizeMode="contain"
                                            pointerEvents="none"
                                        />
                                    ) : (
                                        <View style={[styles.itemImage, { alignItems: \
