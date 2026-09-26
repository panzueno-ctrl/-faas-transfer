import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Image,
    TextInput,
    Platform,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface WatermarkSettings {
    text: string;
    size: number;
    color: string;
    opacity: number;
    position: 'diagonal' | 'top-center' | 'bottom-right';
}

interface WatermarkEditorProps {
    pages: string[];
    onComplete: (settings: WatermarkSettings) => void;
    onCancel: () => void;
    colors: any;
}

export default function WatermarkEditor({ pages, onComplete, onCancel, colors }: WatermarkEditorProps) {
    const [settings, setSettings] = useState<WatermarkSettings>({
        text: 'CONFIDENTIEL',
        size: 80,
        color: '#e74c3c',
        opacity: 0.3,
        position: 'diagonal'
    });

    const PRESET_COLORS = ['#e74c3c', '#000000', '#3498db', '#2ecc71', '#f1c40f'];

    const updateSetting = (key: keyof WatermarkSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* TOOLBAR */}
            <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Pressable onPress={onCancel} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </Pressable>

                <View style={styles.toolsContainer}>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: 'rgba(0,0,0,0.2)' }]}
                        value={settings.text}
                        onChangeText={(t) => updateSetting('text', t)}
                        placeholder="Texte du filigrane"
                        placeholderTextColor={colors.textMuted}
                    />

                    <View style={[styles.controlsGroup, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                        <Ionicons name="text-outline" size={20} color={colors.textMuted} style={{marginLeft: 8}} />
                        <TextInput
                            style={[styles.numberInput, { color: colors.text, borderColor: colors.border }]}
                            value={settings.size.toString()}
                            onChangeText={(t) => updateSetting('size', parseInt(t) || 48)}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.colorPicker}>
                        {PRESET_COLORS.map(c => (
                            <Pressable 
                                key={c}
                                style={[
                                    styles.colorCircle, 
                                    { backgroundColor: c },
                                    settings.color === c && { borderWidth: 2, borderColor: '#fff' }
                                ]}
                                onPress={() => updateSetting('color', c)}
                            />
                        ))}
                    </View>

                    <View style={[styles.controlsGroup, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                        <Ionicons name="contrast-outline" size={20} color={colors.textMuted} style={{marginLeft: 8}} />
                        <Pressable 
                            style={[styles.opacityBtn, settings.opacity === 0.25 && { backgroundColor: colors.primary }]}
                            onPress={() => updateSetting('opacity', 0.25)}>
                            <Text style={styles.opacityText}>25%</Text>
                        </Pressable>
                        <Pressable 
                            style={[styles.opacityBtn, settings.opacity === 0.5 && { backgroundColor: colors.primary }]}
                            onPress={() => updateSetting('opacity', 0.5)}>
                            <Text style={styles.opacityText}>50%</Text>
                        </Pressable>
                        <Pressable 
                            style={[styles.opacityBtn, settings.opacity === 0.75 && { backgroundColor: colors.primary }]}
                            onPress={() => updateSetting('opacity', 0.75)}>
                            <Text style={styles.opacityText}>75%</Text>
                        </Pressable>
                    </View>
                </View>

                <Pressable 
                    style={[styles.doneButton, { backgroundColor: colors.primary }]}
                    onPress={() => onComplete(settings)}
                >
                    <Text style={styles.doneButtonText}>Terminer</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" style={{marginLeft: 4}} />
                </Pressable>
            </View>

            {/* PREVIEW AREA */}
            <ScrollView 
                style={styles.scrollArea} 
                contentContainerStyle={styles.scrollContent}
                maximumZoomScale={3}
                minimumZoomScale={0.5}
            >
                {pages.map((page, index) => (
                    <View key={index} style={styles.pageContainer}>
                        <Image
                            source={{ uri: page }}
                            style={styles.pageImage}
                            resizeMode="contain"
                        />
                        
                        {/* WATERMARK OVERLAY */}
                        {settings.text.trim() !== '' && (
                            <View style={styles.watermarkContainer} pointerEvents="none">
                                <Text
                                    style={[
                                        styles.watermarkText,
                                        {
                                            color: settings.color,
                                            fontSize: settings.size,
                                            opacity: settings.opacity,
                                            transform: [{ rotate: '-45deg' }]
                                        }
                                    ]}
                                >
                                    {settings.text}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.pageNumber, { color: colors.textMuted }]}>Page {index + 1}</Text>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
    },
    toolsContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        flexWrap: 'wrap',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        width: 250,
        fontSize: 16,
        outlineStyle: 'none' as any,
    },
    controlsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 4,
        borderRadius: 8,
    },
    numberInput: {
        width: 50,
        textAlign: 'center',
        paddingVertical: 6,
        fontSize: 16,
        outlineStyle: 'none' as any,
    },
    colorPicker: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 8,
        borderRadius: 8,
    },
    colorCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    opacityBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    opacityText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    doneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    doneButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 32,
        alignItems: 'center',
    },
    pageContainer: {
        position: 'relative',
        marginBottom: 48,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    pageImage: {
        width: 800,
        height: 1131,
    },
    watermarkContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    watermarkText: {
        fontWeight: 'bold',
        textAlign: 'center',
    },
    pageNumber: {
        position: 'absolute',
        bottom: -30,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '600'
    }
});
