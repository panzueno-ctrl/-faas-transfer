import React from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ActionCard from '../../../components/ActionCard';

export default function ToolSelectionScreen({
    styles,
    colors,
    t,
    router,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    groupedTools,
    handleServicePress
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
                    onPress={() => router.push('/')}>
                    <Ionicons name="arrow-back-outline" size={18} color={colors.textMuted} />
                    <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Outils de Conversion</Text>
                    <Text style={styles.subtitle}>Sélectionnez l'outil dont vous avez besoin</Text>
                    
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Chercher un outil (ex: pdf, mp3, fusion...)"
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.tabsContainer}>
                        <Pressable 
                            style={[styles.tabButton, activeTab === 'files' && styles.activeTabButton]}
                            onPress={() => setActiveTab('files')}>
                            <Ionicons name="document-text-outline" size={16} color={activeTab === 'files' ? '#fff' : colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>Manipulation Fichiers</Text>
                        </Pressable>
                        <Pressable 
                            style={[styles.tabButton, activeTab === 'media' && styles.activeTabButton]}
                            onPress={() => setActiveTab('media')}>
                            <Ionicons name="musical-notes-outline" size={16} color={activeTab === 'media' ? '#fff' : colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>Vidéo & Audio</Text>
                        </Pressable>
                    </View>
                </View>

                {Object.entries(groupedTools).length > 0 && (
                    <View style={{ width: '100%', maxWidth: 1000, alignItems: 'center' }}>
                        {Object.entries(groupedTools).map(([category, tools]: any) => (
                            <View key={category} style={{ width: '100%', marginBottom: 40 }}>
                                <Text style={styles.groupTitle}>{category}</Text>
                                <View style={styles.grid}>
                                    {tools.map((service: any) => (
                                        <ActionCard
                                            key={service.id}
                                            title={service.label}
                                            description={service.description}
                                            icon={service.icon}
                                            onPress={() => handleServicePress(service)}
                                            style={styles.serviceCard}
                                            compact={false}
                                        />
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}
                
                {Object.entries(groupedTools).length === 0 && (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                        <Text style={[styles.subtitle, { marginTop: 16 }]}>Aucun outil trouvé</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
