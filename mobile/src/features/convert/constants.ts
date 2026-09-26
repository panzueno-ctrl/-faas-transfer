export type ToolConfig = {
    id: string;
    category: string;
    label: string;
    description: string;
    icon: string;
    endpoint: string;
    mimeTypes: string[];
    outputExt: string;
    multiple?: boolean;
};

export const FILE_TOOLS: ToolConfig[] = [
    { id: 'merge-pdf', category: 'Outils PDF Essentiels', label: 'Fusionner PDF', description: 'Combinez plusieurs fichiers PDF dans l\'ordre de votre choix.', icon: 'git-merge-outline', endpoint: '/convert/merge-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf', multiple: true },
    { id: 'split-pdf', category: 'Outils PDF Essentiels', label: 'Diviser PDF', description: 'Séparez une ou plusieurs pages d\'un PDF.', icon: 'cut-outline', endpoint: '/convert/split-pdf', mimeTypes: ['application/pdf'], outputExt: 'zip' },
    { id: 'compress-pdf', category: 'Outils PDF Essentiels', label: 'Compresser PDF', description: 'Réduisez le poids de votre PDF sans perte de qualité.', icon: 'contract-outline', endpoint: '/convert/compress-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'edit-pdf', category: 'Outils PDF Essentiels', label: 'Modifier PDF', description: 'Ajoutez du texte, des formes ou des images à votre PDF.', icon: 'create-outline', endpoint: '/convert/edit-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'sign-pdf', category: 'Outils PDF Essentiels', label: 'Signer PDF', description: 'Ajoutez votre signature ou demandez des signatures à d\'autres.', icon: 'pencil-outline', endpoint: '/convert/sign-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'watermark-pdf', category: 'Outils PDF Essentiels', label: 'Filigrane', description: 'Ajoutez un filigrane de sécurité à votre document.', icon: 'water-outline', endpoint: '/convert/watermark-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'rotate-pdf', category: 'Outils PDF Essentiels', label: 'Faire pivoter', description: 'Faites pivoter vos pages PDF selon vos besoins.', icon: 'refresh-outline', endpoint: '/convert/rotate-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'organize-pdf', category: 'Outils PDF Essentiels', label: 'Organiser PDF', description: 'Triez, ajoutez et supprimez des pages.', icon: 'layers-outline', endpoint: '/convert/organize-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf', multiple: true },
    { id: 'protect-pdf', category: 'Outils PDF Essentiels', label: 'Protéger PDF', description: 'Ajoutez un mot de passe pour sécuriser votre PDF.', icon: 'lock-closed-outline', endpoint: '/convert/protect-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'unlock-pdf', category: 'Outils PDF Essentiels', label: 'Déverrouiller', description: 'Retirez le mot de passe d\'un fichier PDF.', icon: 'lock-open-outline', endpoint: '/convert/unlock-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'number-pdf', category: 'Outils PDF Essentiels', label: 'Numéros pages', description: 'Insérez des numéros de page dans votre document.', icon: 'list-outline', endpoint: '/convert/number-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'crop-pdf', category: 'Outils PDF Essentiels', label: 'Rogner PDF', description: 'Ajustez les marges ou coupez des zones.', icon: 'crop-outline', endpoint: '/convert/crop-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'flatten-pdf', category: 'Outils PDF Essentiels', label: 'Aplatir PDF', description: 'Rendez vos formulaires et annotations non modifiables.', icon: 'copy-outline', endpoint: '/convert/flatten-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'repair-pdf', category: 'Outils PDF Essentiels', label: 'Réparer PDF', description: 'Restaurez les données d\'un fichier PDF corrompu.', icon: 'build-outline', endpoint: '/convert/repair-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'censor-pdf', category: 'Outils PDF Essentiels', label: 'Censure PDF', description: 'Masquez des informations confidentielles.', icon: 'eye-off-outline', endpoint: '/convert/censor-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'annotate-pdf', category: 'Outils PDF Essentiels', label: 'Annoter PDF', description: 'Surlignez et annotez le contenu de vos PDF.', icon: 'brush-outline', endpoint: '/convert/annotate-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'pdfa-pdf', category: 'Outils PDF Essentiels', label: 'PDF en PDF/A', description: 'Convertissez en PDF/A pour l\'archivage à long terme.', icon: 'archive-outline', endpoint: '/convert/pdf-to-pdfa', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'ocr-pdf', category: 'Outils PDF Essentiels', label: 'OCR PDF', description: 'Rendez le texte de vos PDF scannés sélectionnable.', icon: 'scan-outline', endpoint: '/convert/ocr-pdf', mimeTypes: ['application/pdf'], outputExt: 'txt' },
    { id: 'ai-summarize', category: 'Outils PDF Essentiels', label: 'Résumé IA', description: 'Résumez votre PDF avec l\'IA Claude.', icon: 'sparkles-outline', endpoint: '/convert/ai-summarize', mimeTypes: ['application/pdf'], outputExt: 'txt' },
    { id: 'compare-pdf', category: 'Outils PDF Essentiels', label: 'Comparer PDF', description: 'Analysez les différences entre deux documents.', icon: 'git-compare-outline', endpoint: '/convert/compare-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },

    { id: 'word-to-pdf', category: 'Convertir vers PDF', label: 'Word → PDF', description: 'Convertissez vos documents DOCX en PDF parfait.', icon: 'document-text-outline', endpoint: '/convert/word-to-pdf', mimeTypes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], outputExt: 'pdf' },
    { id: 'pptx-to-pdf', category: 'Convertir vers PDF', label: 'PPTX → PDF', description: 'Transformez vos présentations en PDF.', icon: 'easel-outline', endpoint: '/convert/pptx-to-pdf', mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'], outputExt: 'pdf' },
    { id: 'excel-to-pdf', category: 'Convertir vers PDF', label: 'Excel → PDF', description: 'Convertissez vos feuilles de calcul en PDF.', icon: 'grid-outline', endpoint: '/convert/excel-to-pdf', mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], outputExt: 'pdf' },
    { id: 'image-to-pdf', category: 'Convertir vers PDF', label: 'JPG → PDF', description: 'Transformez vos photos et images en document PDF.', icon: 'images-outline', endpoint: '/convert/image-to-pdf', mimeTypes: ['image/*'], outputExt: 'pdf', multiple: true },
    { id: 'html-to-pdf', category: 'Convertir vers PDF', label: 'HTML → PDF', description: 'Convertissez des pages web en fichiers PDF.', icon: 'globe-outline', endpoint: '/convert/html-to-pdf', mimeTypes: ['text/html'], outputExt: 'pdf' },
    { id: 'pages-to-pdf', category: 'Convertir vers PDF', label: 'Pages → PDF', description: 'Convertissez les documents Apple Pages.', icon: 'document-text-outline', endpoint: '/convert/pages-to-pdf', mimeTypes: ['application/vnd.apple.pages'], outputExt: 'pdf' },
    { id: 'keynote-to-pdf', category: 'Convertir vers PDF', label: 'Keynote → PDF', description: 'Convertissez les présentations Apple Keynote.', icon: 'easel-outline', endpoint: '/convert/keynote-to-pdf', mimeTypes: ['application/vnd.apple.keynote'], outputExt: 'pdf' },
    { id: 'numbers-to-pdf', category: 'Convertir vers PDF', label: 'Numbers → PDF', description: 'Convertissez les tableaux Apple Numbers.', icon: 'grid-outline', endpoint: '/convert/numbers-to-pdf', mimeTypes: ['application/vnd.apple.numbers'], outputExt: 'pdf' },
    { id: 'txt-to-pdf', category: 'Convertir vers PDF', label: 'TXT → PDF', description: 'Convertissez de simples fichiers texte.', icon: 'document-text-outline', endpoint: '/convert/txt-to-pdf', mimeTypes: ['text/plain'], outputExt: 'pdf' },

    { id: 'pdf-to-word', category: 'Convertir depuis PDF', label: 'PDF → Word', description: 'Rendez vos PDF éditables sur Microsoft Word.', icon: 'document-outline', endpoint: '/convert/pdf-to-word', mimeTypes: ['application/pdf'], outputExt: 'docx' },
    { id: 'pdf-to-pptx', category: 'Convertir depuis PDF', label: 'PDF → PPTX', description: 'Générez des diapositives à partir de vos PDF.', icon: 'easel-outline', endpoint: '/convert/pdf-to-pptx', mimeTypes: ['application/pdf'], outputExt: 'pptx' },
    { id: 'pdf-to-excel', category: 'Convertir depuis PDF', label: 'PDF → Excel', description: 'Extrayez les données de vos PDF vers Excel.', icon: 'grid-outline', endpoint: '/convert/pdf-to-excel', mimeTypes: ['application/pdf'], outputExt: 'xlsx' },
    { id: 'pdf-to-image', category: 'Convertir depuis PDF', label: 'PDF → JPG', description: 'Convertissez chaque page en image de haute qualité.', icon: 'image-outline', endpoint: '/convert/pdf-to-image', mimeTypes: ['application/pdf'], outputExt: 'zip' },
    { id: 'pdf-to-txt', category: 'Convertir depuis PDF', label: 'PDF → TXT', description: 'Extrayez tout le texte brut d\'un PDF.', icon: 'document-text-outline', endpoint: '/convert/pdf-to-txt', mimeTypes: ['application/pdf'], outputExt: 'txt' },

    { id: 'heic-to-jpg', category: 'Outils d\'Images', label: 'HEIC → JPG', description: 'Convertissez les photos d\'iPhone au format JPG.', icon: 'logo-apple', endpoint: '/convert/heic-to-jpg', mimeTypes: ['image/heic', 'image/heif'], outputExt: 'jpg' },
    { id: 'jpg-to-png', category: 'Outils d\'Images', label: 'JPG → PNG', description: 'Passez d\'une image compressée à un format PNG.', icon: 'image-outline', endpoint: '/convert/jpg-to-png', mimeTypes: ['image/jpeg'], outputExt: 'png' },
    { id: 'png-to-jpg', category: 'Outils d\'Images', label: 'PNG → JPG', description: 'Réduisez le poids de vos PNG avec le JPG.', icon: 'image-outline', endpoint: '/convert/png-to-jpg', mimeTypes: ['image/png'], outputExt: 'jpg' },
    { id: 'compress-image', category: 'Outils d\'Images', label: 'Compresser Image', description: 'Optimisez vos images pour réduire leur poids.', icon: 'contract-outline', endpoint: '/convert/compress-image', mimeTypes: ['image/*'], outputExt: 'jpg' },
];

export const MEDIA_TOOLS: ToolConfig[] = [
    { id: 'mp4-to-mp3', category: 'Outils Vidéo', label: 'Vidéo → Audio', description: 'Extrayez le son (MP3) de n\'importe quelle vidéo.', icon: 'musical-notes-outline', endpoint: '/convert/mp4-to-mp3', mimeTypes: ['video/mp4', 'video/quicktime'], outputExt: 'mp3' },
    { id: 'mp4-to-gif', category: 'Outils Vidéo', label: 'Vidéo → GIF', description: 'Créez une image animée GIF à partir d\'une vidéo.', icon: 'images-outline', endpoint: '/convert/mp4-to-gif', mimeTypes: ['video/mp4', 'video/quicktime'], outputExt: 'gif' },
    { id: 'compress-video', category: 'Outils Vidéo', label: 'Compresser Vidéo', description: 'Réduisez la taille de vos vidéos très lourdes.', icon: 'contract-outline', endpoint: '/convert/compress-video', mimeTypes: ['video/*'], outputExt: 'mp4' },
    { id: 'trim-video', category: 'Outils Vidéo', label: 'Couper Vidéo', description: 'Conservez uniquement le meilleur passage.', icon: 'cut-outline', endpoint: '/convert/trim-video', mimeTypes: ['video/*'], outputExt: 'mp4' },
    
    { id: 'compress-audio', category: 'Outils Audio', label: 'Compresser Audio', description: 'Diminuez la taille d\'un fichier son.', icon: 'contract-outline', endpoint: '/convert/compress-audio', mimeTypes: ['audio/*'], outputExt: 'mp3' },
    { id: 'trim-audio', category: 'Outils Audio', label: 'Couper Audio', description: 'Découpez vos musiques et mémos vocaux.', icon: 'cut-outline', endpoint: '/convert/trim-audio', mimeTypes: ['audio/*'], outputExt: 'mp3' },
    { id: 'merge-audio', category: 'Outils Audio', label: 'Fusionner Audios', description: 'Rassemblez plusieurs pistes audio en une seule.', icon: 'git-merge-outline', endpoint: '/convert/merge-audio', mimeTypes: ['audio/*'], outputExt: 'mp3', multiple: true },
    { id: 'wav-to-mp3', category: 'Outils Audio', label: 'WAV → MP3', description: 'Passez du format sans perte au format léger MP3.', icon: 'musical-notes-outline', endpoint: '/convert/wav-to-mp3', mimeTypes: ['audio/wav', 'audio/x-wav'], outputExt: 'mp3' },
    { id: 'mp3-to-wav', category: 'Outils Audio', label: 'MP3 → WAV', description: 'Convertissez vos musiques vers un format WAV.', icon: 'musical-note-outline', endpoint: '/convert/mp3-to-wav', mimeTypes: ['audio/mpeg'], outputExt: 'wav' },
];
