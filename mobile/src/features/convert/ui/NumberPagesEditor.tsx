import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Image,
    SafeAreaView,
    TextInput,
    ActivityIndicator,
    Modal,
    useWindowDimensions,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrganizePageItem, OrganizeFileItem } from './OrganizeEditor';

export type PageNumberPosition =
    | 'top-left' | 'top-center' | 'top-right'
    | 'middle-left' | 'middle-center' | 'middle-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type PageMode = 'single' | 'facing';
export type MarginPreset = 'recommended' | 'narrow' | 'wide';
export type TextFormat = 'simple' | 'page_n' | 'page_n_of_total' | 'n_slash_total' | 'custom';
export type FontFamily = 'Helvetica' | 'TimesRoman' | 'Courier';

export interface NumberPagesSettings {
    pageMode: PageMode;
    position: PageNumberPosition;
    margin: MarginPreset;
    firstNumber: number;
    fromPage: number;
    toPage: number;
    skipCover: boolean;
    format: TextFormat;
    customPattern: string;
    fontFamily: FontFamily;
    fontSize: number;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    color: string;
}

interface NumberPagesEditorProps {
    pages: OrganizePageItem[];
    files: OrganizeFileItem[];
    onComplete: (settings: NumberPagesSettings) => void;
    onCancel: () => void;
    onAddFiles?: () => void;
    colors: any;
}

const PRESET_COLORS = ['#000000', '#475569', '#ef4444', '#3b82f6', '#10b981'];

const POSITION_LABELS: Record<PageNumberPosition, string> = {
    'top-left': 'Haut Gauche',
    'top-center': 'Haut Centre',
    'top-right': 'Haut Droite',
    'middle-left': 'Milieu Gauche',
    'middle-center': 'Centre',
    'middle-right': 'Milieu Droite',
    'bottom-left': 'Bas Gauche',
    'bottom-center': 'Bas Centre',
    'bottom-right': 'Bas Droite',
};

export default function NumberPagesEditor({
    pages,
    files,
    onComplete,
    onCancel,
    onAddFiles,
    colors
}: NumberPagesEditorProps) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 900;

    const totalPages = pages.length;

    const [pageMode, setPageMode] = useState<PageMode>('single');
    const [position, setPosition] = useState<PageNumberPosition>('bottom-right');
    const [margin, setMargin] = useState<MarginPreset>('recommended');
    const [firstNumber, setFirstNumber] = useState<number>(1);
    const [fromPage, setFromPage] = useState<number>(1);
    const [toPage, setToPage] = useState<number>(totalPages || 1);
    const [skipCover, setSkipCover] = useState<boolean>(false);
    const [format, setFormat] = useState<TextFormat>('simple');
    const [customPattern, setCustomPattern] = useState<string>('Page {n}');
    const [fontFamily, setFontFamily] = useState<FontFamily>('Helvetica');
    const [fontSize, setFontSize] = useState<number>(12);
    const [isBold, setIsBold] = useState<boolean>(false);
    const [isItalic, setIsItalic] = useState<boolean>(false);
    const [isUnderline, setIsUnderline] = useState<boolean>(false);
    const [color, setColor] = useState<string>('#000000');

    // Zoom preview modal
    const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);

    // Keep toPage synchronized when totalPages loads
    React.useEffect(() => {
        if (totalPages > 0 && (toPage === 1 || toPage === 0)) {
            setToPage(totalPages);
        }
    }, [totalPages]);

    // Active file info
    const fileName = files[0]?.name || pages[0]?.fileName || 'document.pdf';

    // Helper to calculate effective position on a specific page
    const getEffectivePosition = (pageNum: number): PageNumberPosition => {
        if (pageMode === 'facing' && pageNum % 2 === 0) {
            // Mirror left and right for even pages
            if (position.endsWith('right')) {
                return position.replace('right', 'left') as PageNumberPosition;
            }
            if (position.endsWith('left')) {
                return position.replace('left', 'right') as PageNumberPosition;
            }
        }
        return position;
    };

    // Helper to check if a page is numbered
    const isPageNumbered = (pageNum: number): boolean => {
        if (pageNum < fromPage || pageNum > toPage) return false;
        if (skipCover && pageNum === 1) return false;
        return true;
    };

    // Helper to get formatted text for a page
    const getPageTextPreview = (pageNum: number): string => {
        if (!isPageNumbered(pageNum)) return '';
        const effectiveCount = firstNumber + (pageNum - fromPage);
        switch (format) {
            case 'simple':
                return `${effectiveCount}`;
            case 'page_n':
                return `Page ${effectiveCount}`;
            case 'page_n_of_total':
                return `Page ${effectiveCount} sur ${totalPages}`;
            case 'n_slash_total':
                return `${effectiveCount} / ${totalPages}`;
            case 'custom':
                return (customPattern || '{n}')
                    .replace(/{n}/g, `${effectiveCount}`)
                    .replace(/{p}/g, `${totalPages}`);
            default:
                return `${effectiveCount}`;
        }
    };

    const handleApply = () => {
        onComplete({
            pageMode,
            position,
            margin,
            firstNumber,
            fromPage,
            toPage,
            skipCover,
            format,
            customPattern,
            fontFamily,
            fontSize,
            isBold,
            isItalic,
            isUnderline,
            color
        });
    };

    // Calculate position style for red marker in thumbnail
    const getMarkerStyle = (pos: PageNumberPosition): any => {
        const offset = margin === 'narrow' ? 6 : margin === 'wide' ? 14 : 10;
        switch (pos) {
            case 'top-left':
                return { top: offset, left: offset };
            case 'top-center':
                return { top: offset, left: '50%', transform: [{ translateX: -7 }] };
            case 'top-right':
                return { top: offset, right: offset };
            case 'middle-left':
                return { top: '50%', left: offset, transform: [{ translateY: -7 }] };
            case 'middle-center':
                return { top: '50%', left: '50%', transform: [{ translateX: -7 }, { translateY: -7 }] };
            case 'middle-right':
                return { top: '50%', right: offset, transform: [{ translateY: -7 }] };
            case 'bottom-left':
                return { bottom: offset, left: offset };
            case 'bottom-center':
                return { bottom: offset, left: '50%', transform: [{ translateX: -7 }] };
            case 'bottom-right':
            default:
                return { bottom: offset, right: offset };
        }
    };

    // Render 3x3 interactive matrix
    const renderPositionGrid = () => {
        const rows: PageNumberPosition[][] = [
            ['top-left', 'top-center', 'top-right'],
            ['middle-left', 'middle-center', 'middle-right'],
            ['bottom-left', 'bottom-center', 'bottom-right']
        ];

        return (
            <View style={[styles.matrixContainer, { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderColor: colors.border }]}>
                {rows.map((row, rIdx) => (
                    <View key={`row-${rIdx}`} style={styles.matrixRow}>
                        {row.map(pos => {
                            const isSelected = position === pos;
                            return (
                                <Pressable
                                    key={pos}
                                    style={[
                                        styles.matrixCell,
                                        { borderColor: 'rgba(255, 255, 255, 0.08)' },
                                        isSelected && [styles.matrixCellSelected, { backgroundColor: 'rgba(239, 68, 68, 0.18)' }]
                                    ]}
                                    onPress={() => setPosition(pos)}
                                    accessibilityLabel={POSITION_LABELS[pos]}
                                >
                                    {isSelected ? (
                                        <View style={styles.matrixDotActive} />
                                    ) : (
                                        <View style={[styles.matrixDotEmpty, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
            {/* Signature Fast Transfer Background Glow */}
            <View
                style={[
                    styles.backgroundGlow,
                    {
                        backgroundColor: colors.glow || 'rgba(59, 130, 246, 0.03)',
                        shadowColor: colors.primary
                    }
                ]}
                pointerEvents="none"
            />

            {/* TOP BAR */}
            <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.topBarLeft}>
                    <Pressable
                        onPress={onCancel}
                        style={({ pressed }: any) => [
                            styles.backButton,
                            { backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)' }
                        ]}
                    >
                        <Ionicons name="arrow-back" size={20} color={colors.text} />
                    </Pressable>
                    <View style={[styles.filePill, { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: colors.border }]}>
                        <Ionicons name="document-text" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.filePillText, { color: colors.text }]} numberOfLines={1}>
                            {fileName}
                        </Text>
                        <Text style={[styles.filePillBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: colors.primary }]}>
                            {totalPages} pages
                        </Text>
                    </View>
                </View>

                <View style={styles.topBarRight}>
                    {onAddFiles && (
                        <Pressable
                            onPress={onAddFiles}
                            style={({ pressed }: any) => [
                                styles.addFilesBtn,
                                {
                                    backgroundColor: pressed ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                                    borderColor: 'rgba(59, 130, 246, 0.3)'
                                }
                            ]}
                        >
                            <Ionicons name="add-circle" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                            <Text style={[styles.addFilesBtnText, { color: colors.primary }]}>Changer de fichier</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            {/* MAIN CONTENT AREA */}
            <View style={[styles.mainLayout, !isDesktop && styles.mainLayoutMobile]}>
                {/* LEFT WORKSPACE: PAGE THUMBNAILS GRID (Dark Fast Transfer Canvas with floating white document sheets) */}
                <View style={[styles.workspace, { backgroundColor: 'transparent' }]}>
                    <View style={styles.workspaceHeader}>
                        <Text style={[styles.workspaceTitle, { color: colors.text }]}>Aperçu des pages</Text>
                        <Text style={[styles.workspaceSubtitle, { color: colors.textMuted }]}>
                            Le point rouge indique l'emplacement exact du numéro sur chaque page
                        </Text>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.thumbnailsGrid}
                        showsVerticalScrollIndicator={true}
                    >
                        {pages.map((page, index) => {
                            const pageNum = index + 1;
                            const numbered = isPageNumbered(pageNum);
                            const effectivePos = getEffectivePosition(pageNum);
                            const markerStyle = getMarkerStyle(effectivePos);
                            const previewText = getPageTextPreview(pageNum);

                            return (
                                <View
                                    key={page.id || `p-${index}`}
                                    style={[
                                        styles.pageCard,
                                        {
                                            backgroundColor: colors.card,
                                            borderColor: colors.border
                                        }
                                    ]}
                                >
                                    {/* Page Number Badge */}
                                    <View style={[styles.pageCardHeader, { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottomColor: colors.border }]}>
                                        <Text style={[styles.pageBadgeText, { color: colors.textMuted }]}>Page {pageNum}</Text>
                                        {!numbered && (
                                            <View style={[styles.excludedBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                                <Text style={[styles.excludedBadgeText, { color: colors.danger || '#ef4444' }]}>Non numérotée</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Thumbnail Image Container (Crisp white document sheet for clear PDF readability) */}
                                    <View style={styles.thumbnailWrapper}>
                                        {page.imageUri ? (
                                            <Image
                                                source={{ uri: page.imageUri }}
                                                style={styles.thumbnailImage}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <View style={styles.skeletonContainer}>
                                                <ActivityIndicator size="small" color={colors.primary} />
                                                <Text style={[styles.skeletonText, { color: colors.textMuted }]}>Chargement...</Text>
                                            </View>
                                        )}

                                        {/* Dynamic Red Dot Position Marker (iLovePDF signature) */}
                                        {numbered && (
                                            <View style={[styles.redMarker, markerStyle]}>
                                                <View style={styles.redMarkerDot} />
                                                {previewText ? (
                                                    <View style={styles.previewTag}>
                                                        <Text style={styles.previewTagText}>{previewText}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        )}

                                        {/* Zoom magnifier button on hover/tap */}
                                        <Pressable
                                            style={styles.zoomButton}
                                            onPress={() => setPreviewPageIndex(index)}
                                            accessibilityLabel="Agrandir la page"
                                        >
                                            <Ionicons name="search" size={14} color="#64748b" />
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* RIGHT SIDEBAR: OPTIONS PANEL (Fast Transfer Dark Card) */}
                <View
                    style={[
                        styles.sidebar,
                        {
                            backgroundColor: colors.card,
                            borderLeftColor: colors.border
                        },
                        !isDesktop && [styles.sidebarMobile, { borderTopColor: colors.border }]
                    ]}
                >
                    <ScrollView
                        style={styles.sidebarScroll}
                        contentContainerStyle={styles.sidebarContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.sidebarHeader, { borderBottomColor: colors.border }]}>
                            <Ionicons name="list" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.sidebarTitle, { color: colors.text }]}>Options des numéros de pages</Text>
                        </View>

                        {/* SECTION 1: MODE DE LA PAGE */}
                        <View style={styles.sectionBlock}>
                            <Text style={[styles.sectionLabel, { color: colors.text }]}>Mode de la page</Text>
                            <View style={styles.modeRow}>
                                <Pressable
                                    style={[
                                        styles.modeOption,
                                        { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: colors.border },
                                        pageMode === 'single' && {
                                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                            borderColor: colors.primary
                                        }
                                    ]}
                                    onPress={() => setPageMode('single')}
                                >
                                    <View
                                        style={[
                                            styles.radioCircle,
                                            { borderColor: colors.border },
                                            pageMode === 'single' && { borderColor: colors.primary }
                                        ]}
                                    >
                                        {pageMode === 'single' && <View style={[styles.radioInnerDot, { backgroundColor: colors.primary }]} />}
                                    </View>
                                    <Text
                                        style={[
                                            styles.modeOptionText,
                                            { color: colors.textMuted },
                                            pageMode === 'single' && { color: colors.text, fontWeight: '700' }
                                        ]}
                                    >
                                        Une seule page
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.modeOption,
                                        { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: colors.border },
                                        pageMode === 'facing' && {
                                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                            borderColor: colors.primary
                                        }
                                    ]}
                                    onPress={() => setPageMode('facing')}
                                >
                                    <View
                                        style={[
                                            styles.radioCircle,
                                            { borderColor: colors.border },
                                            pageMode === 'facing' && { borderColor: colors.primary }
                                        ]}
                                    >
                                        {pageMode === 'facing' && <View style={[styles.radioInnerDot, { backgroundColor: colors.primary }]} />}
                                    </View>
                                    <Text
                                        style={[
                                            styles.modeOptionText,
                                            { color: colors.textMuted },
                                            pageMode === 'facing' && { color: colors.text, fontWeight: '700' }
                                        ]}
                                    >
                                        Pages opposées
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* SECTION 2: POSITION & MARGE */}
                        <View style={styles.sectionBlock}>
                            <View style={styles.twoColRow}>
                                {/* Position 3x3 */}
                                <View style={styles.twoColItem}>
                                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Position :</Text>
                                    {renderPositionGrid()}
                                </View>

                                {/* Margin Selection */}
                                <View style={styles.twoColItem}>
                                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Marge :</Text>
                                    <View style={styles.marginStack}>
                                        {(['recommended', 'narrow', 'wide'] as MarginPreset[]).map(m => {
                                            const labels: Record<MarginPreset, string> = {
                                                recommended: 'Recommandé',
                                                narrow: 'Étroit',
                                                wide: 'Large'
                                            };
                                            const isSel = margin === m;
                                            return (
                                                <Pressable
                                                    key={m}
                                                    style={[
                                                        styles.marginPill,
                                                        { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: colors.border },
                                                        isSel && {
                                                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                                            borderColor: colors.primary
                                                        }
                                                    ]}
                                                    onPress={() => setMargin(m)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.marginPillText,
                                                            { color: colors.textMuted },
                                                            isSel && { color: colors.primary, fontWeight: '700' }
                                                        ]}
                                                    >
                                                        {labels[m]}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* SECTION 3: PAGES & PLAGE */}
                        <View style={styles.sectionBlock}>
                            <Text style={[styles.sectionLabel, { color: colors.text }]}>Pages</Text>

                            {/* Premier numéro */}
                            <View style={styles.inputRow}>
                                <Text style={[styles.fieldSubLabel, { color: colors.textMuted }]}>Premier numéro :</Text>
                                <View style={[styles.stepperBox, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: colors.border }]}>
                                    <Pressable
                                        style={[styles.stepperBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                                        onPress={() => setFirstNumber(Math.max(1, firstNumber - 1))}
                                    >
                                        <Ionicons name="remove" size={16} color={colors.text} />
                                    </Pressable>
                                    <TextInput
                                        style={[styles.stepperInput, { color: colors.text }]}
                                        keyboardType="numeric"
                                        value={String(firstNumber)}
                                        onChangeText={t => setFirstNumber(Math.max(1, parseInt(t) || 1))}
                                    />
                                    <Pressable
                                        style={[styles.stepperBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                                        onPress={() => setFirstNumber(firstNumber + 1)}
                                    >
                                        <Ionicons name="add" size={16} color={colors.text} />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Plage de pages */}
                            <Text style={[styles.fieldSubLabel, { marginTop: 14, color: colors.textMuted }]}>
                                Quelles pages souhaitez-vous numéroter ?
                            </Text>
                            <View style={styles.rangeRow}>
                                <Text style={[styles.rangeText, { color: colors.textMuted }]}>de la page</Text>
                                <TextInput
                                    style={[styles.rangeInput, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: colors.border, color: colors.text }]}
                                    keyboardType="numeric"
                                    value={String(fromPage)}
                                    onChangeText={t => setFromPage(Math.max(1, Math.min(parseInt(t) || 1, toPage)))}
                                />
                                <Text style={[styles.rangeText, { color: colors.textMuted }]}>à</Text>
                                <TextInput
                                    style={[styles.rangeInput, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: colors.border, color: colors.text }]}
                                    keyboardType="numeric"
                                    value={String(toPage)}
                                    onChangeText={t => setToPage(Math.max(fromPage, Math.min(parseInt(t) || totalPages, totalPages)))}
                                />
                            </View>

                            {/* Ne pas numéroter la première page */}
                            <Pressable
                                style={styles.checkboxRow}
                                onPress={() => setSkipCover(!skipCover)}
                            >
                                <Ionicons
                                    name={skipCover ? "checkbox" : "square-outline"}
                                    size={20}
                                    color={skipCover ? colors.primary : colors.textMuted}
                                />
                                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                                    Ne pas numéroter la première page (couverture)
                                </Text>
                            </Pressable>
                        </View>

                        {/* SECTION 4: TEXTE DU NUMÉRO */}
                        <View style={styles.sectionBlock}>
                            <Text style={[styles.sectionLabel, { color: colors.text }]}>Texte :</Text>
                            <View style={styles.formatStack}>
                                {[
                                    { id: 'simple', label: '1, 2, 3 (Recommandé)' },
                                    { id: 'page_n', label: 'Page 1, Page 2' },
                                    { id: 'page_n_of_total', label: `Page 1 sur ${totalPages}` },
                                    { id: 'n_slash_total', label: `1 / ${totalPages}` },
                                    { id: 'custom', label: 'Format personnalisé...' }
                                ].map(f => {
                                    const isSel = format === f.id;
                                    return (
                                        <Pressable
                                            key={f.id}
                                            style={[
                                                styles.formatRow,
                                                { backgroundColor: 'rgba(255, 255, 255, 0.02)', borderColor: colors.border },
                                                isSel && {
                                                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                                    borderColor: colors.primary
                                                }
                                            ]}
                                            onPress={() => setFormat(f.id as TextFormat)}
                                        >
                                            <Ionicons
                                                name={isSel ? "radio-button-on" : "radio-button-off"}
                                                size={16}
                                                color={isSel ? colors.primary : colors.textMuted}
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text
                                                style={[
                                                    styles.formatRowText,
                                                    { color: colors.textMuted },
                                                    isSel && { color: colors.text, fontWeight: '700' }
                                                ]}
                                            >
                                                {f.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}

                                {format === 'custom' && (
                                    <View style={[styles.customFormatBox, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: colors.border }]}>
                                        <Text style={[styles.customFormatHint, { color: colors.textMuted }]}>
                                            Utilisez {'{n}'} pour le numéro de page et {'{p}'} pour le total.
                                        </Text>
                                        <TextInput
                                            style={[styles.customFormatInput, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: colors.border, color: colors.text }]}
                                            value={customPattern}
                                            onChangeText={setCustomPattern}
                                            placeholder="Ex: Document - Page {n}/{p}"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* SECTION 5: FORMAT DE TEXTE & TYPOGRAPHIE */}
                        <View style={styles.sectionBlock}>
                            <Text style={[styles.sectionLabel, { color: colors.text }]}>Format de texte :</Text>

                            {/* Police & Taille */}
                            <View style={styles.typoRow}>
                                {/* Font Family */}
                                <View style={styles.fontFamilyGroup}>
                                    {(['Helvetica', 'TimesRoman', 'Courier'] as FontFamily[]).map(f => {
                                        const names: Record<FontFamily, string> = {
                                            Helvetica: 'Arial',
                                            TimesRoman: 'Times',
                                            Courier: 'Courier'
                                        };
                                        const isSel = fontFamily === f;
                                        return (
                                            <Pressable
                                                key={f}
                                                style={[
                                                    styles.fontBtn,
                                                    { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                                    isSel && {
                                                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                                        borderColor: colors.primary
                                                    }
                                                ]}
                                                onPress={() => setFontFamily(f)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.fontBtnText,
                                                        { color: colors.textMuted },
                                                        isSel && { color: colors.primary, fontWeight: '700' }
                                                    ]}
                                                >
                                                    {names[f]}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                {/* Font Size */}
                                <View style={[styles.fontSizeStepper, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: colors.border }]}>
                                    <Pressable
                                        style={[styles.fontSizeBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                                        onPress={() => setFontSize(Math.max(8, fontSize - 1))}
                                    >
                                        <Ionicons name="remove" size={14} color={colors.text} />
                                    </Pressable>
                                    <Text style={[styles.fontSizeValue, { color: colors.text }]}>{fontSize}pt</Text>
                                    <Pressable
                                        style={[styles.fontSizeBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                                        onPress={() => setFontSize(Math.min(28, fontSize + 1))}
                                    >
                                        <Ionicons name="add" size={14} color={colors.text} />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Styles & Couleurs */}
                            <View style={styles.stylesAndColorsRow}>
                                {/* B, I, U Buttons */}
                                <View style={styles.styleButtonsGroup}>
                                    <Pressable
                                        style={[
                                            styles.styleBtn,
                                            { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                            isBold && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setIsBold(!isBold)}
                                    >
                                        <Text style={[styles.styleBtnText, { fontWeight: 'bold', color: isBold ? '#fff' : colors.text }]}>
                                            B
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        style={[
                                            styles.styleBtn,
                                            { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                            isItalic && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setIsItalic(!isItalic)}
                                    >
                                        <Text style={[styles.styleBtnText, { fontStyle: 'italic', color: isItalic ? '#fff' : colors.text }]}>
                                            I
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        style={[
                                            styles.styleBtn,
                                            { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border },
                                            isUnderline && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setIsUnderline(!isUnderline)}
                                    >
                                        <Text style={[styles.styleBtnText, { textDecorationLine: 'underline', color: isUnderline ? '#fff' : colors.text }]}>
                                            U
                                        </Text>
                                    </Pressable>
                                </View>

                                {/* Color Swatches */}
                                <View style={styles.colorSwatchesGroup}>
                                    {PRESET_COLORS.map(c => {
                                        const isSel = color === c;
                                        return (
                                            <Pressable
                                                key={c}
                                                style={[
                                                    styles.colorCircle,
                                                    { backgroundColor: c },
                                                    isSel && styles.colorCircleActive
                                                ]}
                                                onPress={() => setColor(c)}
                                            >
                                                {isSel && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* BIG FAST TRANSFER CTA BUTTON */}
                    <View style={[styles.ctaContainer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
                        <Pressable
                            style={({ pressed }: any) => [
                                styles.ctaButton,
                                { backgroundColor: colors.primary },
                                pressed && styles.ctaButtonPressed
                            ]}
                            onPress={handleApply}
                        >
                            <Text style={styles.ctaButtonText}>Ajouter des numéros de pages</Text>
                            <Ionicons name="arrow-forward-circle" size={24} color="#ffffff" style={{ marginLeft: 8 }} />
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* PREVIEW ZOOM MODAL */}
            {previewPageIndex !== null && (
                <Modal visible={true} transparent={true} animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.modalHeader, { backgroundColor: 'rgba(255,255,255,0.04)', borderBottomColor: colors.border }]}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Aperçu - Page {previewPageIndex + 1}</Text>
                                <Pressable
                                    onPress={() => setPreviewPageIndex(null)}
                                    style={[styles.modalCloseBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                                >
                                    <Ionicons name="close" size={22} color={colors.text} />
                                </Pressable>
                            </View>

                            <View style={styles.modalBody}>
                                {pages[previewPageIndex]?.imageUri ? (
                                    <View style={styles.modalImageWrapper}>
                                        <Image
                                            source={{ uri: pages[previewPageIndex].imageUri }}
                                            style={styles.modalImage}
                                            resizeMode="contain"
                                        />
                                        {isPageNumbered(previewPageIndex + 1) && (
                                            <View style={[
                                                styles.redMarker,
                                                getMarkerStyle(getEffectivePosition(previewPageIndex + 1))
                                            ]}>
                                                <View style={[styles.redMarkerDot, { width: 18, height: 18, borderRadius: 9 }]} />
                                                <View style={styles.previewTag}>
                                                    <Text style={[styles.previewTagText, { fontSize: 13 }]}>
                                                        {getPageTextPreview(previewPageIndex + 1)}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <ActivityIndicator size="large" color={colors.primary} />
                                )}
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    backgroundGlow: {
        position: 'absolute',
        top: -150,
        left: '50%',
        transform: [{ translateX: -400 }],
        width: 800,
        height: 800,
        borderRadius: 400,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 140,
        zIndex: 0,
    },
    topBar: {
        height: 60,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    topBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        marginRight: 12,
    },
    filePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        maxWidth: 320,
    },
    filePillText: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 8,
    },
    filePillBadge: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addFilesBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
    },
    addFilesBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
        zIndex: 1,
    },
    mainLayoutMobile: {
        flexDirection: 'column',
    },
    workspace: {
        flex: 1,
        padding: 24,
    },
    workspaceHeader: {
        marginBottom: 16,
    },
    workspaceTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    workspaceSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    thumbnailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 18,
        paddingBottom: 40,
    },
    pageCard: {
        width: 170,
        borderRadius: 10,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    pageCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderBottomWidth: 1,
    },
    pageBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    excludedBadge: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    excludedBadgeText: {
        fontSize: 9,
        fontWeight: '700',
    },
    thumbnailWrapper: {
        width: '100%',
        height: 220,
        backgroundColor: '#ffffff',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    skeletonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    skeletonText: {
        fontSize: 11,
        marginTop: 6,
    },
    redMarker: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 5,
    },
    redMarkerDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#ef4444',
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#ef4444',
        shadowOpacity: 0.9,
        shadowRadius: 5,
        elevation: 4,
    },
    previewTag: {
        backgroundColor: 'rgba(239, 68, 68, 0.95)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 2,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    previewTagText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '700',
    },
    zoomButton: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sidebar: {
        width: 380,
        borderLeftWidth: 1,
        flexDirection: 'column',
    },
    sidebarMobile: {
        width: '100%',
        borderLeftWidth: 0,
        borderTopWidth: 1,
    },
    sidebarScroll: {
        flex: 1,
    },
    sidebarContent: {
        padding: 24,
    },
    sidebarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        marginBottom: 20,
    },
    sidebarTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    sectionBlock: {
        marginBottom: 22,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 10,
    },
    modeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    modeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    radioInnerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    modeOptionText: {
        fontSize: 13,
        fontWeight: '500',
    },
    twoColRow: {
        flexDirection: 'row',
        gap: 16,
    },
    twoColItem: {
        flex: 1,
    },
    matrixContainer: {
        width: 120,
        height: 120,
        borderWidth: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },
    matrixRow: {
        flex: 1,
        flexDirection: 'row',
    },
    matrixCell: {
        flex: 1,
        borderWidth: 0.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    matrixCellSelected: {
    },
    matrixDotEmpty: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    matrixDotActive: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    marginStack: {
        gap: 8,
    },
    marginPill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: 'center',
    },
    marginPillText: {
        fontSize: 12,
        fontWeight: '500',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fieldSubLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    stepperBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 6,
        overflow: 'hidden',
    },
    stepperBtn: {
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    stepperInput: {
        width: 48,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '600',
        paddingVertical: 4,
    },
    rangeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    rangeText: {
        fontSize: 13,
    },
    rangeInput: {
        width: 56,
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 6,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '600',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
    },
    checkboxLabel: {
        fontSize: 13,
        marginLeft: 8,
        flex: 1,
    },
    formatStack: {
        gap: 8,
    },
    formatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
    },
    formatRowText: {
        fontSize: 13,
        fontWeight: '500',
    },
    customFormatBox: {
        marginTop: 6,
        padding: 10,
        borderRadius: 6,
        borderWidth: 1,
    },
    customFormatHint: {
        fontSize: 11,
        marginBottom: 6,
    },
    customFormatInput: {
        height: 38,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        fontSize: 13,
    },
    typoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    fontFamilyGroup: {
        flexDirection: 'row',
        gap: 4,
    },
    fontBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
    },
    fontBtnText: {
        fontSize: 12,
        fontWeight: '500',
    },
    fontSizeStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 6,
        overflow: 'hidden',
    },
    fontSizeBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    fontSizeValue: {
        width: 40,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
    },
    stylesAndColorsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    styleButtonsGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    styleBtn: {
        width: 32,
        height: 32,
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    styleBtnText: {
        fontSize: 13,
    },
    colorSwatchesGroup: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    colorCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    colorCircleActive: {
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 3,
        elevation: 3,
    },
    ctaContainer: {
        padding: 20,
        borderTopWidth: 1,
    },
    ctaButton: {
        borderRadius: 12,
        paddingVertical: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5,
    },
    ctaButtonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    ctaButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(5, 7, 13, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '90%',
        maxWidth: 600,
        maxHeight: '90%',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    modalCloseBtn: {
        padding: 6,
        borderRadius: 8,
    },
    modalBody: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalImageWrapper: {
        width: '100%',
        height: 500,
        position: 'relative',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        overflow: 'hidden',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
});
