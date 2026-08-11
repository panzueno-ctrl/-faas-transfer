const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'mobile', 'src', 'app', 'convert.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace the old arrays with the new ones
const newArrays = `
const FILE_TOOLS = [
    { id: 'merge-pdf', label: 'Fusionner PDF', icon: 'git-merge-outline', endpoint: '/convert/merge-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf', multiple: true },
    { id: 'split-pdf', label: 'Diviser PDF', icon: 'cut-outline', endpoint: '/convert/split-pdf', mimeTypes: ['application/pdf'], outputExt: 'zip' },
    { id: 'compress-pdf', label: 'Compresser PDF', icon: 'contract-outline', endpoint: '/convert/compress-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'edit-pdf', label: 'Modifier PDF', icon: 'create-outline', endpoint: '/convert/edit-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'sign-pdf', label: 'Signer PDF', icon: 'pencil-outline', endpoint: '/convert/sign-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'watermark-pdf', label: 'Filigrane', icon: 'water-outline', endpoint: '/convert/watermark-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'rotate-pdf', label: 'Faire pivoter', icon: 'refresh-outline', endpoint: '/convert/rotate-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'organize-pdf', label: 'Organiser PDF', icon: 'layers-outline', endpoint: '/convert/organize-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'protect-pdf', label: 'Protéger PDF', icon: 'lock-closed-outline', endpoint: '/convert/protect-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'unlock-pdf', label: 'Déverrouiller', icon: 'lock-open-outline', endpoint: '/convert/unlock-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'number-pdf', label: 'Numéros pages', icon: 'list-outline', endpoint: '/convert/number-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'crop-pdf', label: 'Rogner PDF', icon: 'crop-outline', endpoint: '/convert/crop-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'flatten-pdf', label: 'Aplatir PDF', icon: 'copy-outline', endpoint: '/convert/flatten-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'repair-pdf', label: 'Réparer PDF', icon: 'build-outline', endpoint: '/convert/repair-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'censor-pdf', label: 'Censure PDF', icon: 'eye-off-outline', endpoint: '/convert/censor-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'annotate-pdf', label: 'Annoter PDF', icon: 'brush-outline', endpoint: '/convert/annotate-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'pdfa-pdf', label: 'PDF en PDF/A', icon: 'archive-outline', endpoint: '/convert/pdf-to-pdfa', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'ocr-pdf', label: 'OCR PDF', icon: 'scan-outline', endpoint: '/convert/ocr-pdf', mimeTypes: ['application/pdf'], outputExt: 'txt' },
    { id: 'compare-pdf', label: 'Comparer PDF', icon: 'git-compare-outline', endpoint: '/convert/compare-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },

    { id: 'word-to-pdf', label: 'Word → PDF', icon: 'document-text-outline', endpoint: '/convert/word-to-pdf', mimeTypes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], outputExt: 'pdf' },
    { id: 'pptx-to-pdf', label: 'PPTX → PDF', icon: 'easel-outline', endpoint: '/convert/pptx-to-pdf', mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'], outputExt: 'pdf' },
    { id: 'excel-to-pdf', label: 'Excel → PDF', icon: 'grid-outline', endpoint: '/convert/excel-to-pdf', mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], outputExt: 'pdf' },
    { id: 'image-to-pdf', label: 'JPG → PDF', icon: 'images-outline', endpoint: '/convert/image-to-pdf', mimeTypes: ['image/*'], outputExt: 'pdf' },
    { id: 'html-to-pdf', label: 'HTML → PDF', icon: 'globe-outline', endpoint: '/convert/html-to-pdf', mimeTypes: ['text/html'], outputExt: 'pdf' },
    { id: 'pages-to-pdf', label: 'Pages → PDF', icon: 'document-text-outline', endpoint: '/convert/pages-to-pdf', mimeTypes: ['application/vnd.apple.pages'], outputExt: 'pdf' },
    { id: 'keynote-to-pdf', label: 'Keynote → PDF', icon: 'easel-outline', endpoint: '/convert/keynote-to-pdf', mimeTypes: ['application/vnd.apple.keynote'], outputExt: 'pdf' },
    { id: 'numbers-to-pdf', label: 'Numbers → PDF', icon: 'grid-outline', endpoint: '/convert/numbers-to-pdf', mimeTypes: ['application/vnd.apple.numbers'], outputExt: 'pdf' },
    { id: 'txt-to-pdf', label: 'TXT → PDF', icon: 'document-text-outline', endpoint: '/convert/txt-to-pdf', mimeTypes: ['text/plain'], outputExt: 'pdf' },

    { id: 'pdf-to-word', label: 'PDF → Word', icon: 'document-outline', endpoint: '/convert/pdf-to-word', mimeTypes: ['application/pdf'], outputExt: 'docx' },
    { id: 'pdf-to-pptx', label: 'PDF → PPTX', icon: 'easel-outline', endpoint: '/convert/pdf-to-pptx', mimeTypes: ['application/pdf'], outputExt: 'pptx' },
    { id: 'pdf-to-excel', label: 'PDF → Excel', icon: 'grid-outline', endpoint: '/convert/pdf-to-excel', mimeTypes: ['application/pdf'], outputExt: 'xlsx' },
    { id: 'pdf-to-image', label: 'PDF → JPG', icon: 'image-outline', endpoint: '/convert/pdf-to-image', mimeTypes: ['application/pdf'], outputExt: 'zip' },
    { id: 'pdf-to-txt', label: 'PDF → TXT', icon: 'document-text-outline', endpoint: '/convert/pdf-to-txt', mimeTypes: ['application/pdf'], outputExt: 'txt' },

    { id: 'heic-to-jpg', label: 'HEIC → JPG', icon: 'logo-apple', endpoint: '/convert/heic-to-jpg', mimeTypes: ['image/heic', 'image/heif'], outputExt: 'jpg' },
    { id: 'jpg-to-png', label: 'JPG → PNG', icon: 'image-outline', endpoint: '/convert/jpg-to-png', mimeTypes: ['image/jpeg'], outputExt: 'png' },
    { id: 'png-to-jpg', label: 'PNG → JPG', icon: 'image-outline', endpoint: '/convert/png-to-jpg', mimeTypes: ['image/png'], outputExt: 'jpg' },
    { id: 'compress-image', label: 'Compresser Image', icon: 'contract-outline', endpoint: '/convert/compress-image', mimeTypes: ['image/*'], outputExt: 'jpg' },
];

const MEDIA_TOOLS = [
    { id: 'mp4-to-mp3', label: 'Vidéo → Audio', icon: 'musical-notes-outline', endpoint: '/convert/mp4-to-mp3', mimeTypes: ['video/mp4', 'video/quicktime'], outputExt: 'mp3' },
    { id: 'mp4-to-gif', label: 'Vidéo → GIF', icon: 'images-outline', endpoint: '/convert/mp4-to-gif', mimeTypes: ['video/mp4', 'video/quicktime'], outputExt: 'gif' },
    { id: 'compress-video', label: 'Compresser Vidéo', icon: 'contract-outline', endpoint: '/convert/compress-video', mimeTypes: ['video/*'], outputExt: 'mp4' },
    { id: 'trim-video', label: 'Couper Vidéo', icon: 'cut-outline', endpoint: '/convert/trim-video', mimeTypes: ['video/*'], outputExt: 'mp4' },
    { id: 'compress-audio', label: 'Compresser Audio', icon: 'contract-outline', endpoint: '/convert/compress-audio', mimeTypes: ['audio/*'], outputExt: 'mp3' },
    { id: 'trim-audio', label: 'Couper Audio', icon: 'cut-outline', endpoint: '/convert/trim-audio', mimeTypes: ['audio/*'], outputExt: 'mp3' },
    { id: 'merge-audio', label: 'Fusionner Audios', icon: 'git-merge-outline', endpoint: '/convert/merge-audio', mimeTypes: ['audio/*'], outputExt: 'mp3', multiple: true },
    { id: 'wav-to-mp3', label: 'WAV → MP3', icon: 'musical-notes-outline', endpoint: '/convert/wav-to-mp3', mimeTypes: ['audio/wav', 'audio/x-wav'], outputExt: 'mp3' },
    { id: 'mp3-to-wav', label: 'MP3 → WAV', icon: 'musical-note-outline', endpoint: '/convert/mp3-to-wav', mimeTypes: ['audio/mpeg'], outputExt: 'wav' },
];
`;

content = content.replace(/const CONVERSIONS = \[\s*\{[\s\S]*?\}\s*\];\s*const PDF_TOOLS = \[\s*\{[\s\S]*?\}\s*\];/m, newArrays);

// 2. Add state for tabs
content = content.replace(/const \[step, setStep\] = useState<'menu' \| 'processing' \| 'done'>\('menu'\);/, "const [step, setStep] = useState<'menu' | 'processing' | 'done'>('menu');\n    const [activeTab, setActiveTab] = useState<'files' | 'media'>('files');");

// 3. Update the menu rendering logic
const oldMenuRenderRegex = /const filteredConversions = CONVERSIONS\.filter\([\s\S]*?\}\s*\)\s*\}/m;

const newMenuRender = `
        const toolsToDisplay = activeTab === 'files' ? FILE_TOOLS : MEDIA_TOOLS;
        const filteredTools = toolsToDisplay.filter(c => 
            c.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.id.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backgroundGlow} pointerEvents="none" />
                
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

                        {filteredTools.length > 0 && (
                            <View style={styles.grid}>
                                {filteredTools.map((service) => (
                                    <ActionCard
                                        key={service.id}
                                        title={service.label}
                                        description=""
                                        icon={service.icon as any}
                                        onPress={() => handleServicePress(service)}
                                        style={styles.serviceCard}
                                        compact={true}
                                    />
                                ))}
                            </View>
                        )}
                        {filteredTools.length === 0 && (
                            <Text style={{color: colors.textMuted, textAlign: 'center', marginTop: 40}}>Aucun outil trouvé pour cette recherche.</Text>
                        )}
                    </ScrollView>
                </View>
            </SafeAreaView>
        );
    }
`;

content = content.replace(/const filteredConversions = CONVERSIONS[\s\S]*?(?=\n\s*if \(step === 'processing'\))/m, newMenuRender);

// 4. Update the styles to include Tabs styles
const tabsStyles = `
    tabsContainer: {
        flexDirection: 'row',
        marginTop: 24,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        padding: 4,
        width: '100%',
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    activeTabButton: {
        backgroundColor: colors.primary,
    },
    tabText: {
        color: colors.textMuted,
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
    },
    activeTabText: {
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
    },
`;

content = content.replace(/searchContainer: \{/, tabsStyles + "\n    searchContainer: {");

fs.writeFileSync(filePath, content);
console.log('Successfully updated convert.tsx with tabs and new tools!');
