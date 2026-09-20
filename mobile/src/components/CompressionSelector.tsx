import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export type CompressionLevel = 'low' | 'recommended' | 'extreme';

interface CompressionSelectorProps {
    value: CompressionLevel;
    onChange: (val: CompressionLevel) => void;
    fileSize?: number; // Taille originale en octets
}

const LEVEL_CONFIG = {
    low: {
        title: 'Simple',
        reduction: 40,
        pro: false
    },
    recommended: {
        title: 'Modéré',
        reduction: 75,
        pro: true
    },
    extreme: {
        title: 'Fort',
        reduction: 90,
        badge: 'Minimal',
        pro: true
    }
};

export default function CompressionSelector({ value, onChange, fileSize = 0 }: CompressionSelectorProps) {
    const { colors } = useTheme();

    const formatSize = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 Ko';
        const mb = bytes / (1024 * 1024);
        if (mb < 1) {
            const kb = bytes / 1024;
            return `${kb.toFixed(0)} Ko`;
        }
        return `${mb.toFixed(1)} Mo`;
    };

    const currentConfig = LEVEL_CONFIG[value];
    const newSize = fileSize * (1 - currentConfig.reduction / 100);
    const savedSize = fileSize - newSize;

    return (
        <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="contract" size={18} color="#ef4444" />
                </View>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>Compresser</Text>
            </View>
            
            <View style={{ gap: 12, marginBottom: 24 }}>
                {(Object.keys(LEVEL_CONFIG) as CompressionLevel[]).map((levelKey) => {
                    const isSelected = value === levelKey;
                    const config = LEVEL_CONFIG[levelKey];

                    return (
                        <Pressable
                            key={levelKey}
                            onPress={() => onChange(levelKey)}
                            style={({ pressed, hovered }: any) => [
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                                    borderWidth: 1,
                                    borderColor: isSelected ? '#2563eb' : colors.border,
                                    borderRadius: 8,
                                    paddingVertical: 14,
                                    paddingHorizontal: 16,
                                    transform: [{ scale: pressed ? 0.98 : 1 }],
                                    transition: 'all 0.15s ease'
                                },
                                hovered && !isSelected && { borderColor: colors.textMuted }
                            ]}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons 
                                    name={isSelected ? "radio-button-on" : "radio-button-off"} 
                                    size={22} 
                                    color={isSelected ? '#2563eb' : colors.textSubtle} 
                                    style={{ marginRight: 12 }}
                                />
                                <Text style={{ color: colors.text, fontSize: 15, fontWeight: isSelected ? '600' : '400' }}>
                                    {config.title}
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {config.badge && (
                                    <Text style={{ color: colors.success, fontSize: 11, fontWeight: 'bold', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                        {config.badge}
                                    </Text>
                                )}
                                {config.pro && (
                                    <View style={{ backgroundColor: '#f59e0b', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="star" size={12} color="#fff" />
                                    </View>
                                )}
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            {fileSize > 0 && (
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
                        Nouvelle taille de fichier estimée
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
                        <Text style={{ color: colors.success, fontSize: 18, fontWeight: 'bold' }}>
                            -{formatSize(savedSize)}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 13, marginLeft: 8, paddingBottom: 2 }}>
                            ~{formatSize(newSize)} (-{currentConfig.reduction}%)
                        </Text>
                    </View>
                    
                    {/* Progress Bar Visual */}
                    <View style={{ height: 4, backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${100 - currentConfig.reduction}%`, backgroundColor: colors.success, borderRadius: 2 }} />
                    </View>
                </View>
            )}
        </View>
    );
}
