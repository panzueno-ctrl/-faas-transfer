import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface ActionCardProps {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap; 
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    compact?: boolean; 
}

export default function ActionCard({ title, description, icon, onPress, style, compact = false }: ActionCardProps) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <Pressable
            style={({ pressed, hovered }: any) => [
                styles.choiceCard,
                compact && styles.choiceCardCompact,
                (pressed || hovered) && styles.choiceCardHovered,
                style
            ]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${description}`}
        >
            <View style={styles.iconWrapper}>
                <Ionicons name={icon} size={32} color={colors.primary} />
            </View>

            <View style={styles.textContainer}>
                <Text style={styles.choiceLabel}>{title}</Text>
                <Text style={styles.choiceDescription}>{description}</Text>
            </View>
        </Pressable>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    choiceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 32,
        borderWidth: 1,
        borderColor: colors.border,
        width: '100%',
        maxWidth: 700,
        transitionDuration: '0.2s', 
    },
    choiceCardHovered: {
        backgroundColor: colors.cardHovered,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 8,
        transform: [{ translateY: -2 }], 
    },
    choiceCardCompact: {
        padding: 18,
        gap: 14,
    },
    iconWrapper: {
        backgroundColor: colors.glow, 
        padding: 14,
        borderRadius: 50,
    },
    textContainer: {
        flex: 1, 
    },
    choiceLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text, 
    },
    choiceDescription: {
        fontSize: 13,
        color: colors.textMuted, 
        marginTop: 4,
        lineHeight: 20,
    },
});
