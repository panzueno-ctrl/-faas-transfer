import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 1. Définition des propriétés (props) acceptées par le composant
interface ActionCardProps {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap; // Validation stricte du nom de l'icône
    onPress: () => void;
    style?: StyleProp<ViewStyle>; // Permet de passer des marges (marginTop, etc.) de l'extérieur
    compact?: boolean; // ← NOUVEAU : Option pour réduire la taille sur l'accueil
}

// 2. Le composant
export default function ActionCard({ title, description, icon, onPress, style, compact = false }: ActionCardProps) {
    return (
        <Pressable
            style={({ pressed, hovered }: any) => [
                styles.choiceCard,
                compact && styles.choiceCardCompact,
                (pressed || hovered) && styles.choiceCardHovered,
                style
            ]}
            onPress={onPress}
        >
            <View style={styles.iconWrapper}>
                <Ionicons name={icon} size={32} color="#4a9eff" />
            </View>

            <View style={styles.textContainer}>
                <Text style={styles.choiceLabel}>{title}</Text>
                <Text style={styles.choiceDescription}>{description}</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    choiceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        backgroundColor: '#13151A',
        borderRadius: 16,
        padding: 32,
        borderWidth: 1,
        borderColor: '#1F232D',
        width: '100%',
        maxWidth: 700,
        transitionDuration: '0.2s', // Effet de transition fluide sur web
    },
    choiceCardHovered: {
        backgroundColor: '#1E2433',
        borderColor: '#3B82F6',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 8,
        transform: [{ translateY: -2 }], // Soulèvement subtil
    },
    // NOUVEAU : Style appliqué uniquement si compact = true
    choiceCardCompact: {
        padding: 18,
        gap: 14,
    },
    iconWrapper: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)', // #3B82F6 avec opacité
        padding: 14,
        borderRadius: 50,
    },
    textContainer: {
        flex: 1, // Permet au texte de prendre toute la largeur restante sans pousser l'icône
    },
    choiceLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F8FAFC', // Slate 50
    },
    choiceDescription: {
        fontSize: 13,
        color: '#94A3B8', // Slate 400
        marginTop: 4,
        lineHeight: 20,
    },
});
