import React from 'react';
import { View, Text, TextInput, Pressable, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';

interface VideoTrimSelectorProps {
    startTime: string;
    endTime: string;
    onStartTimeChange: (val: string) => void;
    onEndTimeChange: (val: string) => void;
    isVideo?: boolean;
}

// Convert seconds integer to "MM:SS" or "HH:MM:SS"
const secondsToTimeStr = (totalSec: number): string => {
    const s = Math.max(0, Math.floor(totalSec));
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Convert string "MM:SS" or "HH:MM:SS" or raw seconds to number of seconds
const timeStrToSeconds = (str: string): number => {
    if (!str) return 0;
    const parts = str.trim().split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return Number(str) || 0;
};

export default function VideoTrimSelector({
    startTime,
    endTime,
    onStartTimeChange,
    onEndTimeChange,
    isVideo = true
}: VideoTrimSelectorProps) {
    const { colors } = useTheme();

    const startSec = timeStrToSeconds(startTime);
    const endSec = timeStrToSeconds(endTime);
    const duration = Math.max(0, endSec - startSec);

    const adjustStart = (delta: number) => {
        const next = Math.max(0, startSec + delta);
        onStartTimeChange(secondsToTimeStr(next));
    };

    const adjustEnd = (delta: number) => {
        const next = Math.max(startSec + 1, endSec + delta);
        onEndTimeChange(secondsToTimeStr(next));
    };

    const applyPreset = (presetSeconds: number) => {
        onStartTimeChange('00:00');
        onEndTimeChange(secondsToTimeStr(presetSeconds));
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={isVideo ? "film-outline" : "musical-notes-outline"} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {isVideo ? "Découper la vidéo" : "Découper l'audio"}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        Définissez l'intervalle exact du passage à conserver.
                    </Text>
                </View>
            </View>

            {/* Time controls container */}
            <View style={styles.controlsRow}>
                {/* Début */}
                <View style={[styles.timeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.boxLabel, { color: colors.textMuted }]}>DÉBUT</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="play-skip-back-outline" size={18} color={colors.primary} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={startTime}
                            onChangeText={onStartTimeChange}
                            placeholder="00:00"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numbers-and-punctuation"
                        />
                    </View>
                    {/* Stepper buttons */}
                    <View style={styles.stepperRow}>
                        <Pressable style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => adjustStart(-5)}>
                            <Text style={[styles.stepBtnText, { color: colors.text }]}>-5s</Text>
                        </Pressable>
                        <Pressable style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => adjustStart(1)}>
                            <Text style={[styles.stepBtnText, { color: colors.text }]}>+1s</Text>
                        </Pressable>
                        <Pressable style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => adjustStart(5)}>
                            <Text style={[styles.stepBtnText, { color: colors.text }]}>+5s</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Fin */}
                <View style={[styles.timeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.boxLabel, { color: colors.textMuted }]}>FIN</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="play-skip-forward-outline" size={18} color="#ef4444" />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={endTime}
                            onChangeText={onEndTimeChange}
                            placeholder="00:30"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numbers-and-punctuation"
                        />
                    </View>
                    {/* Stepper buttons */}
                    <View style={styles.stepperRow}>
                        <Pressable style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => adjustEnd(-5)}>
                            <Text style={[styles.stepBtnText, { color: colors.text }]}>-5s</Text>
                        </Pressable>
                        <Pressable style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => adjustEnd(1)}>
                            <Text style={[styles.stepBtnText, { color: colors.text }]}>+1s</Text>
                        </Pressable>
                        <Pressable style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => adjustEnd(5)}>
                            <Text style={[styles.stepBtnText, { color: colors.text }]}>+5s</Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* Extrait duration badge */}
            <View style={[styles.durationBadge, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                <Ionicons name="timer-outline" size={18} color={colors.primary} />
                <Text style={[styles.durationText, { color: colors.primary }]}>
                    Durée de l'extrait : <Text style={{ fontWeight: 'bold' }}>{duration} seconde{duration > 1 ? 's' : ''} ({secondsToTimeStr(duration)})</Text>
                </Text>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsWrapper}>
                <Text style={[styles.presetsTitle, { color: colors.textMuted }]}>Raccourcis rapides :</Text>
                <View style={styles.presetsRow}>
                    <Pressable style={[styles.presetBtn, { borderColor: colors.border }]} onPress={() => applyPreset(15)}>
                        <Text style={[styles.presetBtnText, { color: colors.text }]}>15 sec</Text>
                    </Pressable>
                    <Pressable style={[styles.presetBtn, { borderColor: colors.border }]} onPress={() => applyPreset(30)}>
                        <Text style={[styles.presetBtnText, { color: colors.text }]}>30 sec</Text>
                    </Pressable>
                    <Pressable style={[styles.presetBtn, { borderColor: colors.border }]} onPress={() => applyPreset(60)}>
                        <Text style={[styles.presetBtnText, { color: colors.text }]}>1 min</Text>
                    </Pressable>
                    <Pressable style={[styles.presetBtn, { borderColor: colors.border }]} onPress={() => applyPreset(120)}>
                        <Text style={[styles.presetBtnText, { color: colors.text }]}>2 min</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        maxWidth: 480,
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16
    },
    timeBox: {
        flex: 1,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1
    },
    boxLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 6
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10
    },
    input: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
        paddingVertical: 2
    },
    stepperRow: {
        flexDirection: 'row',
        gap: 6
    },
    stepBtn: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)'
    },
    stepBtnText: {
        fontSize: 11,
        fontWeight: '600'
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16
    },
    durationText: {
        fontSize: 13
    },
    presetsWrapper: {
        marginTop: 4
    },
    presetsTitle: {
        fontSize: 12,
        marginBottom: 8,
        fontWeight: '600'
    },
    presetsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap'
    },
    presetBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)'
    },
    presetBtnText: {
        fontSize: 12,
        fontWeight: '600'
    }
});
