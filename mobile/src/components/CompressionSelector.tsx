import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export type CompressionLevel = 'low' | 'recommended' | 'extreme';

interface CompressionSelectorProps {
    value: CompressionLevel;
    onChange: (val: CompressionLevel) => void;
}

const LEVEL_CONFIG = {
    low: {
        title: 'Basse Compression',
        desc: 'Haute qualité, taille légèrement réduite.',
        badge: 'Idéal Impression',
        icon: 'image-outline',
        quality: 90, // percentage for visual gauge
        reduction: 30, // percentage for visual gauge
    },
    recommended: {
        title: 'Recommandée',
        desc: 'Équilibre parfait entre qualité et taille.',
        badge: 'Idéal Web/Email',
        icon: 'star',
        quality: 75,
        reduction: 60,
    },
    extreme: {
        title: 'Extrême',
        desc: 'Qualité visiblement réduite, taille minimale.',
        badge: 'Idéal Archivage',
        icon: 'archive-outline',
        quality: 40,
        reduction: 90,
    }
};

const Gauge = ({ label, value, color, delay = 0 }: { label: string, value: number, color: string, delay?: number }) => {
    const { colors } = useTheme();
    const widthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: value,
            duration: 800,
            delay,
            useNativeDriver: false,
        }).start();
    }, [value, delay]);

    return (
        <View style={{ marginBottom: 8, width: '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{label}</Text>
                <Text style={{ color: color, fontSize: 11, fontWeight: 'bold' }}>{value}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <Animated.View 
                    style={{
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: 3,
                        width: widthAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                        })
                    }}
                />
            </View>
        </View>
    );
}

export default function CompressionSelector({ value, onChange }: CompressionSelectorProps) {
    const { colors } = useTheme();

    return (
        <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center', marginBottom: 24 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
                Sélectionnez le niveau de compression
            </Text>
            
            <View style={{ 
                flexDirection: Platform.OS === 'web' ? 'row' : 'column',
                gap: 16,
                justifyContent: 'center',
                alignItems: 'stretch'
            }}>
                {(Object.keys(LEVEL_CONFIG) as CompressionLevel[]).map((levelKey, index) => {
                    const isSelected = value === levelKey;
                    const config = LEVEL_CONFIG[levelKey];
                    const isRecommended = levelKey === 'recommended';

                    return (
                        <Pressable
                            key={levelKey}
                            onPress={() => onChange(levelKey)}
                            style={({ pressed, hovered }: any) => [
                                {
                                    flex: 1,
                                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : colors.card,
                                    borderWidth: 2,
                                    borderColor: isSelected ? colors.primary : (hovered ? colors.border : 'transparent'),
                                    borderRadius: 16,
                                    padding: 20,
                                    position: 'relative',
                                    transform: [{ scale: pressed ? 0.98 : (hovered && !isSelected ? 1.02 : 1) }],
                                    transition: 'all 0.2s ease-in-out',
                                },
                                isRecommended && !isSelected && { borderColor: 'rgba(59, 130, 246, 0.3)' }
                            ]}
                        >
                            {isRecommended && (
                                <View style={{ position: 'absolute', top: -12, alignSelf: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, zIndex: 10 }}>
                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Recommandé</Text>
                                </View>
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isSelected ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                    <Ionicons name={config.icon as any} size={20} color={isSelected ? '#fff' : colors.textMuted} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: isSelected ? colors.primary : colors.text, fontSize: 16, fontWeight: 'bold' }}>{config.title}</Text>
                                </View>
                            </View>

                            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16, minHeight: 36 }}>
                                {config.desc}
                            </Text>

                            <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                                <Gauge label="Qualité Préservée" value={config.quality} color={config.quality > 70 ? colors.success : (config.quality > 40 ? '#F59E0B' : colors.danger)} delay={index * 100} />
                                <Gauge label="Réduction de Taille" value={config.reduction} color={config.reduction > 70 ? colors.success : (config.reduction > 40 ? '#F59E0B' : colors.textMuted)} delay={index * 100 + 200} />
                            </View>

                            <View style={{ backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' }}>
                                <Text style={{ color: isSelected ? colors.primary : colors.textSubtle, fontSize: 11, fontWeight: '600' }}>
                                    {config.badge}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
