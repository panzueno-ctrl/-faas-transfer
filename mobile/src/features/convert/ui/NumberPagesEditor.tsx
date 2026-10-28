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
    useWindowDimensions
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

const PRESET_COLORS = ['#000000', '#475569', '#dc2626', '#2563eb', '#16a34a'];

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
            <View style={styles.matrixContainer}>
                {rows.map((row, rIdx) => (
                    <View key={`row-${rIdx}`} style={styles.matrixRow}>
                        {row.map(pos => {
                            const isSelected = position === pos;
                            return (
                                <Pressable
                                    key={pos}
                                    style={[
                                        styles.matrixCell,
                                        isSelected && styles.matrixCellSelected
                                    ]}
                                    onPress={() => setPosition(pos)}
                                    accessibilityLabel={POSITION_LABELS[pos]}
                                >
                                    {isSelected ? (
                                        <View style={styles.matrixDotActive} />
                                    ) : (
                                        <View style={styles.matrixDotEmpty} />
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
        <SafeAreaView style={[styles.root, { backgroundColor: '#f8fafc' }]}>
            {/* TOP BAR */}
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <Pressable onPress={onCancel} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color="#1e293b" />
                    </Pressable>
                    <View style={styles.filePill}>
                        <Ionicons name="document-text" size={18} color="#e53e3e" style={{ marginRight: 6 }} />
                        <Text style={styles.filePillText} numberOfLines={1}>
                            {fileName}
                        </Text>
                        <Text style={styles.filePillBadge}>{totalPages} pages</Text>
                    </View>
                </View>

                <View style={styles.topBarRight}>
                    {onAddFiles && (
                        <Pressable onPress={onAddFiles} style={styles.addFilesBtn}>
                            <Ionicons name="add-circle" size={18} color="#e53e3e" style={{ marginRight: 6 }} />
                            <Text style={styles.addFilesBtnText}>Changer de fichier</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            {/* MAIN CONTENT AREA */}
            <View style={[styles.mainLayout, !isDesktop && styles.mainLayoutMobile]}>
                {/* LEFT WORKSPACE: PAGE THUMBNAILS GRID */}
                <View style={styles.workspace}>
                    <View style={styles.workspaceHeader}>
                        <Text style={styles.workspaceTitle}>Aperçu des pages</Text>
                        <Text style={styles.workspaceSubtitle}>
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
                                <View key={page.id || `p-${index}`} style={styles.pageCard}>
                                    {/* Page Number Badge */}
                                    <View style={styles.pageCardHeader}>
                                        <Text style={styles.pageBadgeText}>Page {pageNum}</Text>
                                        {!numbered && (
                                            <View style={styles.excludedBadge}>
                                                <Text style={styles.excludedBadgeText}>Non numérotée</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Thumbnail Image Container */}
                                    <View style={styles.thumbnailWrapper}>
                                        {page.imageUri ? (
                                            <Image
                                                source={{ uri: page.imageUri }}
                                                style={styles.thumbnailImage}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <View style={styles.skeletonContainer}>
                                                <ActivityIndicator size="small" color="#e53e3e" />
                                                <Text style={styles.skeletonText}>Chargement...</Text>
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

                {/* RIGHT SIDEBAR: OPTIONS PANEL */}
                <View style={[styles.sidebar, !isDesktop && styles.sidebarMobile]}>
                    <ScrollView
                        style={styles.sidebarScroll}
                        contentContainerStyle={styles.sidebarContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.sidebarHeader}>
                            <Ionicons name="list" size={20} color="#e53e3e" style={{ marginRight: 8 }} />
                            <Text style={styles.sidebarTitle}>Options des numéros de pages</Text>
                        </View>

                        {/* SECTION 1: MODE DE LA PAGE */}
                        <View style={styles.sectionBlock}>
                            <Text style={styles.sectionLabel}>Mode de la page</Text>
                            <View style={styles.modeRow}>
                                <Pressable
                                    style={[
                                        styles.modeOption,
                                        pageMode === 'single' && styles.modeOptionActive
                                    ]}
                                    onPress={() => setPageMode('single')}
                                >
                                    <View style={[
                                        styles.radioCircle,
                                        pageMode === 'single' && styles.radioCircleActive
                                    ]}>
                                        {pageMode === 'single' && <View style={styles.radioInnerDot} />}
                                    </View>
                                    <Text style={[
                                        styles.modeOptionText,
                                        pageMode === 'single' && styles.modeOptionTextActive
                                    ]}>
                                        Une seule page
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.modeOption,
                                        pageMode === 'facing' && styles.modeOptionActive
                                    ]}
                                    onPress={() => setPageMode('facing')}
                                >
                                    <View style={[
                                        styles.radioCircle,
                                        pageMode === 'facing' && styles.radioCircleActive
                                    ]}>
                                        {pageMode === 'facing' && <View style={styles.radioInnerDot} />}
                                    </View>
                                    <Text style={[
                                        styles.modeOptionText,
                                        pageMode === 'facing' && styles.modeOptionTextActive
                                    ]}>
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
                                    <Text style={styles.sectionLabel}>Position :</Text>
                                    {renderPositionGrid()}
                                </View>

                                {/* Margin Selection */}
                                <View style={styles.twoColItem}>
                                    <Text style={styles.sectionLabel}>Marge :</Text>
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
                                                        isSel && styles.marginPillActive
                                                    ]}
                                                    onPress={() => setMargin(m)}
                                                >
                                                    <Text style={[
                                                        styles.marginPillText,
                                                        isSel && styles.marginPillTextActive
                                                    ]}>
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
                            <Text style={styles.sectionLabel}>Pages</Text>

                            {/* Premier numéro */}
                            <View style={styles.inputRow}>
                                <Text style={styles.fieldSubLabel}>Premier numéro :</Text>
                                <View style={styles.stepperBox}>
                                    <Pressable
                                        style={styles.stepperBtn}
                                        onPress={() => setFirstNumber(Math.max(1, firstNumber - 1))}
                                    >
                                        <Ionicons name="remove" size={16} color="#475569" />
                                    </Pressable>
                                    <TextInput
                                        style={styles.stepperInput}
                                        keyboardType="numeric"
                                        value={String(firstNumber)}
                                        onChangeText={t => setFirstNumber(Math.max(1, parseInt(t) || 1))}
                                    />
                                    <Pressable
                                        style={styles.stepperBtn}
                                        onPress={() => setFirstNumber(firstNumber + 1)}
                                    >
                                        <Ionicons name="add" size={16} color="#475569" />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Plage de pages */}
                            <Text style={[styles.fieldSubLabel, { marginTop: 12 }]}>
                                Quelles pages souhaitez-vous numéroter ?
                            </Text>
                            <View style={styles.rangeRow}>
                                <Text style={styles.rangeText}>de la page</Text>
                                <TextInput
                                    style={styles.rangeInput}
                                    keyboardType="numeric"
                                    value={String(fromPage)}
                                    onChangeText={t => setFromPage(Math.max(1, Math.min(parseInt(t) || 1, toPage)))}
                                />
                                <Text style={styles.rangeText}>à</Text>
                                <TextInput
                                    style={styles.rangeInput}
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
                                    color={skipCover ? "#e53e3e" : "#94a3b8"}
                                />
                                <Text style={styles.checkboxLabel}>
                                    Ne pas numéroter la première page (couverture)
                                </Text>
                            </Pressable>
                        </View>

                        {/* SECTION 4: TEXTE DU NUMÉRO */}
                        <View style={styles.sectionBlock}>
                            <Text style={styles.sectionLabel}>Texte :</Text>
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
                                            style={[styles.formatRow, isSel && styles.formatRowActive]}
                                            onPress={() => setFormat(f.id as TextFormat)}
                                        >
                                            <Ionicons
                                                name={isSel ? "radio-button-on" : "radio-button-off"}
                                                size={16}
                                                color={isSel ? "#e53e3e" : "#94a3b8"}
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text style={[styles.formatRowText, isSel && styles.formatRowTextActive]}>
                                                {f.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}

                                {format === 'custom' && (
                                    <View style={styles.customFormatBox}>
                                        <Text style={styles.customFormatHint}>
                                            Utilisez {'{n}'} pour le numéro de page et {'{p}'} pour le total.
                                        </Text>
                                        <TextInput
                                            style={styles.customFormatInput}
                                            value={customPattern}
                                            onChangeText={setCustomPattern}
                                            placeholder="Ex: Document - Page {n}/{p}"
                                        />
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* SECTION 5: FORMAT DE TEXTE & TYPOGRAPHIE */}
                        <View style={styles.sectionBlock}>
                            <Text style={styles.sectionLabel}>Format de texte :</Text>

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
                                                style={[styles.fontBtn, isSel && styles.fontBtnActive]}
                                                onPress={() => setFontFamily(f)}
                                            >
                                                <Text style={[styles.fontBtnText, isSel && styles.fontBtnTextActive]}>
                                                    {names[f]}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                {/* Font Size */}
                                <View style={styles.fontSizeStepper}>
                                    <Pressable
                                        style={styles.fontSizeBtn}
                                        onPress={() => setFontSize(Math.max(8, fontSize - 1))}
                                    >
                                        <Ionicons name="remove" size={14} color="#475569" />
                                    </Pressable>
                                    <Text style={styles.fontSizeValue}>{fontSize}pt</Text>
                                    <Pressable
                                        style={styles.fontSizeBtn}
                                        onPress={() => setFontSize(Math.min(28, fontSize + 1))}
                                    >
                                        <Ionicons name="add" size={14} color="#475569" />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Styles & Couleurs */}
                            <View style={styles.stylesAndColorsRow}>
                                {/* B, I, U Buttons */}
                                <View style={styles.styleButtonsGroup}>
                                    <Pressable
                                        style={[styles.styleBtn, isBold && styles.styleBtnActive]}
                                        onPress={() => setIsBold(!isBold)}
                                    >
                                        <Text style={[styles.styleBtnText, { fontWeight: 'bold' }, isBold && styles.styleBtnTextActive]}>
                                            B
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.styleBtn, isItalic && styles.styleBtnActive]}
                                        onPress={() => setIsItalic(!isItalic)}
                                    >
                                        <Text style={[styles.styleBtnText, { fontStyle: 'italic' }, isItalic && styles.styleBtnTextActive]}>
                                            I
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.styleBtn, isUnderline && styles.styleBtnActive]}
                                        onPress={() => setIsUnderline(!isUnderline)}
                                    >
                                        <Text style={[styles.styleBtnText, { textDecorationLine: 'underline' }, isUnderline && styles.styleBtnTextActive]}>
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

                    {/* BIG RED CTA BUTTON (iLovePDF Style) */}
                    <View style={styles.ctaContainer}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.ctaButton,
                                pressed && styles.ctaButtonPressed
                            ]}
                            onPress={handleApply}
                        >
                            <Text style={styles.ctaButtonText}>Ajouter des numéros de pages</Text>
                            <Ionicons name="arrow-forward-circle" size={26} color="#ffffff" style={{ marginLeft: 8 }} />
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* PREVIEW ZOOM MODAL */}
            {previewPageIndex !== null && (
                <Modal visible={true} transparent={true} animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Aperçu - Page {previewPageIndex + 1}</Text>
                                <Pressable
                                    onPress={() => setPreviewPageIndex(null)}
                                    style={styles.modalCloseBtn}
                                >
                                    <Ionicons name="close" size={24} color="#1e293b" />
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
                                    <ActivityIndicator size="large" color="#e53e3e" />
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
    },
    topBar: {
        height: 60,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
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
        backgroundColor: '#f1f5f9',
    },
    filePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        maxWidth: 320,
    },
    filePillText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginRight: 8,
    },
    filePillBadge: {
        fontSize: 12,
        color: '#64748b',
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 6,
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
        backgroundColor: '#fff1f2',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecdd3',
    },
    addFilesBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#e53e3e',
    },
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
    },
    mainLayoutMobile: {
        flexDirection: 'column',
    },
    workspace: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        padding: 20,
    },
    workspaceHeader: {
        marginBottom: 16,
    },
    workspaceTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    workspaceSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    thumbnailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        paddingBottom: 40,
    },
    pageCard: {
        width: 170,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    pageCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#f8fafc',
    },
    pageBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
    },
    excludedBadge: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    excludedBadgeText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#dc2626',
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
        color: '#94a3b8',
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
        backgroundColor: '#e53e3e',
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#e53e3e',
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 3,
    },
    previewTag: {
        backgroundColor: 'rgba(229, 62, 62, 0.95)',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        marginTop: 2,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 2,
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
        backgroundColor: '#ffffff',
        borderLeftWidth: 1,
        borderLeftColor: '#e2e8f0',
        flexDirection: 'column',
    },
    sidebarMobile: {
        width: '100%',
        borderLeftWidth: 0,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
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
        borderBottomColor: '#f1f5f9',
        marginBottom: 20,
    },
    sidebarTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    sectionBlock: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
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
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    modeOptionActive: {
        backgroundColor: '#fff1f2',
        borderColor: '#e53e3e',
    },
    radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    radioCircleActive: {
        borderColor: '#e53e3e',
    },
    radioInnerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#e53e3e',
    },
    modeOptionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#475569',
    },
    modeOptionTextActive: {
        color: '#0f172a',
        fontWeight: '700',
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
        borderColor: '#cbd5e1',
        borderRadius: 6,
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
    },
    matrixRow: {
        flex: 1,
        flexDirection: 'row',
    },
    matrixCell: {
        flex: 1,
        borderWidth: 0.5,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    matrixCellSelected: {
        backgroundColor: '#fff1f2',
    },
    matrixDotEmpty: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#cbd5e1',
    },
    matrixDotActive: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#e53e3e',
        shadowColor: '#e53e3e',
        shadowOpacity: 0.6,
        shadowRadius: 3,
    },
    marginStack: {
        gap: 8,
    },
    marginPill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
    },
    marginPillActive: {
        backgroundColor: '#fff1f2',
        borderColor: '#e53e3e',
    },
    marginPillText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#475569',
    },
    marginPillTextActive: {
        color: '#e53e3e',
        fontWeight: '700',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fieldSubLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    stepperBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
    },
    stepperBtn: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#f1f5f9',
    },
    stepperInput: {
        width: 48,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '600',
        color: '#0f172a',
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
        color: '#475569',
    },
    rangeInput: {
        width: 56,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 6,
        paddingVertical: 6,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '600',
        color: '#0f172a',
        backgroundColor: '#ffffff',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
    },
    checkboxLabel: {
        fontSize: 13,
        color: '#475569',
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
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    formatRowActive: {
        backgroundColor: '#fff1f2',
        borderColor: '#e53e3e',
    },
    formatRowText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '500',
    },
    formatRowTextActive: {
        color: '#0f172a',
        fontWeight: '700',
    },
    customFormatBox: {
        marginTop: 6,
        padding: 10,
        backgroundColor: '#f8fafc',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    customFormatHint: {
        fontSize: 11,
        color: '#64748b',
        marginBottom: 6,
    },
    customFormatInput: {
        height: 38,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 6,
        backgroundColor: '#ffffff',
        paddingHorizontal: 10,
        fontSize: 13,
        color: '#0f172a',
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
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    fontBtnActive: {
        backgroundColor: '#fff1f2',
        borderColor: '#e53e3e',
    },
    fontBtnText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500',
    },
    fontBtnTextActive: {
        color: '#e53e3e',
        fontWeight: '700',
    },
    fontSizeStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
    },
    fontSizeBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: '#f1f5f9',
    },
    fontSizeValue: {
        width: 40,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: '#0f172a',
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
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    styleBtnActive: {
        backgroundColor: '#1e293b',
        borderColor: '#1e293b',
    },
    styleBtnText: {
        fontSize: 13,
        color: '#475569',
    },
    styleBtnTextActive: {
        color: '#ffffff',
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
        borderColor: 'rgba(0,0,0,0.1)',
    },
    colorCircleActive: {
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    ctaContainer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },
    ctaButton: {
        backgroundColor: '#e53e3e',
        borderRadius: 10,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#e53e3e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaButtonPressed: {
        backgroundColor: '#c53030',
        transform: [{ scale: 0.98 }],
    },
    ctaButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '90%',
        maxWidth: 600,
        maxHeight: '90%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    modalCloseBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
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
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        overflow: 'hidden',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
});
