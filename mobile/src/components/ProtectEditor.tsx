import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PasswordProtector from './PasswordProtector';

interface ProtectEditorProps {
    pages: string[];
    fileName: string;
    fileSize: number;
    onComplete: (password: string) => void;
    onCancel: () => void;
    colors: any;
}

export default function ProtectEditor({ pages, fileName, fileSize, onComplete, onCancel, colors }: ProtectEditorProps) {
    const [password, setPassword] = useState('');

    const firstPage = pages[0] || '';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* TOOLBAR */}
            <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Pressable onPress={onCancel} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                    <Text style={[styles.backButtonText, { color: colors.text }]}>Annuler</Text>
                </Pressable>
                
                <Text style={[styles.toolbarTitle, { color: colors.text }]}>Protéger PDF</Text>
                
                <View style={{ width: 80 }} /> {/* Spacer for centering */}
            </View>

            <View style={styles.content}>
                {/* PREVIEW AREA (LEFT) */}
                <View style={styles.previewArea}>
                    <View style={styles.previewWrapper}>
                        {firstPage ? (
                            <Image
                                source={{ uri: firstPage }}
                                style={styles.previewImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={[styles.previewImage, styles.placeholderPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                            </View>
                        )}
                        <Text numberOfLines={1} ellipsizeMode="middle" style={[styles.fileName, { color: colors.text }]}>
                            {fileName}
                        </Text>
                        <Text style={[styles.fileSize, { color: colors.textMuted }]}>
                            {fileSize ? (fileSize / 1024 / 1024).toFixed(2) + ' MB' : ''}
                        </Text>
                    </View>
                </View>

                {/* SIDEBAR (RIGHT) */}
                <View style={[styles.sidebar, { backgroundColor: colors.background, borderLeftColor: colors.border }]}>
                    <View style={styles.sidebarContent}>
                        <PasswordProtector onChange={setPassword} />
                        
                        <Pressable 
                            style={({ pressed }) => [
                                styles.doneButton,
                                { backgroundColor: colors.primary },
                                (!password || password.trim() === '') && { opacity: 0.5 },
                                pressed && password && { opacity: 0.8 }
                            ]}
                            disabled={!password || password.trim() === ''}
                            onPress={() => onComplete(password)}
                        >
                            <Text style={styles.doneButtonText}>Protéger ➔</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    toolbar: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 100,
    },
    backButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '500',
    },
    toolbarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    },
    previewArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    previewWrapper: {
        alignItems: 'center',
    },
    previewImage: {
        width: 300,
        height: 424, // A4 ratio
        backgroundColor: '#fff',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 16,
    },
    placeholderPreview: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    fileName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        maxWidth: 300,
        textAlign: 'center',
    },
    fileSize: {
        fontSize: 13,
    },
    sidebar: {
        width: Platform.OS === 'web' ? 400 : '100%',
        borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
        borderTopWidth: Platform.OS === 'web' ? 0 : 1,
        padding: 24,
    },
    sidebarContent: {
        flex: 1,
    },
    doneButton: {
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
