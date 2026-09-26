import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ToolIntroScreen({
    styles,
    colors,
    selectedService,
    handleSelectFiles,
    reset
}: any) {
    return (
        <View style={styles.contentWrapper}>
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 32, position: 'absolute', top: 0, zIndex: 20 }}>
                <Pressable 
                    style={({ pressed, hovered }: any) => [
                        styles.backButton,
                        (pressed || hovered) && styles.backButtonHovered,
                        { position: 'relative', top: 0, left: 0 }
                    ]}
                    onPress={reset}>
                    <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                    <Text style={styles.backButtonText}>Retour aux outils</Text>
                </Pressable>
            </View>

            <View style={styles.centerContent}>
                <View style={{ width: 100, height: 100, borderRadius: 28, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
                    <Ionicons name={selectedService.icon as any} size={50} color={colors.primary} />
                </View>
                
                <Text style={styles.title}>{selectedService.label}</Text>
                <Text style={[styles.subtitle, { maxWidth: 500, marginBottom: 40, fontSize: 18, lineHeight: 28 }]}>
                    {selectedService.description}
                </Text>

                <Pressable 
                    style={({ pressed, hovered }: any) => [
                        styles.hugePrimaryButton,
                        (pressed || hovered) && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                    ]} 
                    onPress={() => handleSelectFiles(false)}>
                    <Ionicons name="add-circle-outline" size={28} color="#ffffff" />
                    <Text style={styles.hugePrimaryButtonText}>Choisir les fichiers</Text>
                </Pressable>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 16 }}>
                    Tous vos fichiers sont supprimés de nos serveurs après 1 heure.
                </Text>
            </View>
        </View>
    );
}
