const FILE_TOOLS = [
    // --- Manipulation PDF (Outils principaux) ---
    { id: 'merge-pdf', label: 'Fusionner PDF', icon: 'git-merge-outline', endpoint: '/convert/merge-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf', multiple: true },
    { id: 'split-pdf', label: 'Diviser PDF', icon: 'cut-outline', endpoint: '/convert/split-pdf', mimeTypes: ['application/pdf'], outputExt: 'zip' },
    { id: 'compress-pdf', label: 'Compresser PDF', icon: 'contract-outline', endpoint: '/convert/compress-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'edit-pdf', label: 'Modifier PDF', icon: 'create-outline', endpoint: '/convert/edit-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'sign-pdf', label: 'Signer PDF', icon: 'pencil-outline', endpoint: '/convert/sign-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'watermark-pdf', label: 'Filigrane', icon: 'water-outline', endpoint: '/convert/watermark-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'rotate-pdf', label: 'Faire pivoter', icon: 'refresh-outline', endpoint: '/convert/rotate-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'organize-pdf', label: 'Organiser PDF', icon: 'layers-outline', endpoint: '/convert/organize-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'protect-pdf', label: 'Protéger PDF', icon: 'lock-closed-outline', endpoint: '/convert/protect-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'unlock-pdf', label: 'Déverrouiller PDF', icon: 'lock-open-outline', endpoint: '/convert/unlock-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'number-pdf', label: 'Numéros de pages', icon: 'list-outline', endpoint: '/convert/number-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'crop-pdf', label: 'Rogner PDF', icon: 'crop-outline', endpoint: '/convert/crop-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'flatten-pdf', label: 'Aplatir PDF', icon: 'copy-outline', endpoint: '/convert/flatten-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'repair-pdf', label: 'Réparer PDF', icon: 'build-outline', endpoint: '/convert/repair-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'censor-pdf', label: 'Censure PDF', icon: 'eye-off-outline', endpoint: '/convert/censor-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'annotate-pdf', label: 'Annoter PDF', icon: 'brush-outline', endpoint: '/convert/annotate-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'pdfa-pdf', label: 'PDF en PDF/A', icon: 'archive-outline', endpoint: '/convert/pdf-to-pdfa', mimeTypes: ['application/pdf'], outputExt: 'pdf' },
    { id: 'ocr-pdf', label: 'OCR PDF', icon: 'scan-outline', endpoint: '/convert/ocr-pdf', mimeTypes: ['application/pdf'], outputExt: 'txt' },
    { id: 'compare-pdf', label: 'Comparer PDF', icon: 'git-compare-outline', endpoint: '/convert/compare-pdf', mimeTypes: ['application/pdf'], outputExt: 'pdf' },

    // --- Vers PDF ---
    { id: 'word-to-pdf', label: 'Word → PDF', icon: 'document-text-outline', endpoint: '/convert/word-to-pdf', mimeTypes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], outputExt: 'pdf' },
    { id: 'pptx-to-pdf', label: 'PPTX → PDF', icon: 'easel-outline', endpoint: '/convert/pptx-to-pdf', mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'], outputExt: 'pdf' },
    { id: 'excel-to-pdf', label: 'Excel → PDF', icon: 'grid-outline', endpoint: '/convert/excel-to-pdf', mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], outputExt: 'pdf' },
    { id: 'image-to-pdf', label: 'JPG → PDF', icon: 'images-outline', endpoint: '/convert/image-to-pdf', mimeTypes: ['image/*'], outputExt: 'pdf' },
    { id: 'html-to-pdf', label: 'HTML → PDF', icon: 'globe-outline', endpoint: '/convert/html-to-pdf', mimeTypes: ['text/html'], outputExt: 'pdf' },
    { id: 'pages-to-pdf', label: 'Pages → PDF', icon: 'document-text-outline', endpoint: '/convert/pages-to-pdf', mimeTypes: ['application/vnd.apple.pages'], outputExt: 'pdf' },
    { id: 'keynote-to-pdf', label: 'Keynote → PDF', icon: 'easel-outline', endpoint: '/convert/keynote-to-pdf', mimeTypes: ['application/vnd.apple.keynote'], outputExt: 'pdf' },
    { id: 'numbers-to-pdf', label: 'Numbers → PDF', icon: 'grid-outline', endpoint: '/convert/numbers-to-pdf', mimeTypes: ['application/vnd.apple.numbers'], outputExt: 'pdf' },
    { id: 'txt-to-pdf', label: 'TXT → PDF', icon: 'document-text-outline', endpoint: '/convert/txt-to-pdf', mimeTypes: ['text/plain'], outputExt: 'pdf' },

    // --- Depuis PDF ---
    { id: 'pdf-to-word', label: 'PDF → Word', icon: 'document-outline', endpoint: '/convert/pdf-to-word', mimeTypes: ['application/pdf'], outputExt: 'docx' },
    { id: 'pdf-to-pptx', label: 'PDF → PPTX', icon: 'easel-outline', endpoint: '/convert/pdf-to-pptx', mimeTypes: ['application/pdf'], outputExt: 'pptx' },
    { id: 'pdf-to-excel', label: 'PDF → Excel', icon: 'grid-outline', endpoint: '/convert/pdf-to-excel', mimeTypes: ['application/pdf'], outputExt: 'xlsx' },
    { id: 'pdf-to-image', label: 'PDF → JPG', icon: 'image-outline', endpoint: '/convert/pdf-to-image', mimeTypes: ['application/pdf'], outputExt: 'zip' },
    { id: 'pdf-to-txt', label: 'PDF → TXT', icon: 'document-text-outline', endpoint: '/convert/pdf-to-txt', mimeTypes: ['application/pdf'], outputExt: 'txt' },

    // --- Images ---
    { id: 'heic-to-jpg', label: 'HEIC → JPG', icon: 'logo-apple', endpoint: '/convert/heic-to-jpg', mimeTypes: ['image/heic', 'image/heif'], outputExt: 'jpg' },
    { id: 'jpg-to-png', label: 'JPG → PNG', icon: 'image-outline', endpoint: '/convert/jpg-to-png', mimeTypes: ['image/jpeg'], outputExt: 'png' },
    { id: 'png-to-jpg', label: 'PNG → JPG', icon: 'image-outline', endpoint: '/convert/png-to-jpg', mimeTypes: ['image/png'], outputExt: 'jpg' },
    { id: 'compress-image', label: 'Compresser Image', icon: 'contract-outline', endpoint: '/convert/compress-image', mimeTypes: ['image/*'], outputExt: 'jpg' },
];

const MEDIA_TOOLS = [
    { id: 'mp4-to-mp3', label: 'Vidéo → Audio', icon: 'musical-notes-outline', endpoint: '/convert/mp4-to-mp3', mimeTypes: ['video/mp4', 'video/quicktime'], outputExt: 'mp3' },
    { id: 'mp4-to-gif', label: 'Vidéo → GIF', icon: 'images-outline', endpoint: '/convert/mp4-to-gif', mimeTypes: ['video/mp4', 'video/quicktime'], outputExt: 'gif' },
    { id: 'compress-video', label: 'Compresser Vidéo', icon: 'contract-outline', endpoint: '/convert/compress-video', mimeTypes: ['video/*'], outputExt: 'mp4' },
    { id: 'compress-audio', label: 'Compresser Audio', icon: 'contract-outline', endpoint: '/convert/compress-audio', mimeTypes: ['audio/*'], outputExt: 'mp3' },
    { id: 'trim-video', label: 'Couper Vidéo', icon: 'cut-outline', endpoint: '/convert/trim-video', mimeTypes: ['video/*'], outputExt: 'mp4' },
    { id: 'trim-audio', label: 'Couper Audio', icon: 'cut-outline', endpoint: '/convert/trim-audio', mimeTypes: ['audio/*'], outputExt: 'mp3' },
    { id: 'merge-audio', label: 'Fusionner Audios', icon: 'git-merge-outline', endpoint: '/convert/merge-audio', mimeTypes: ['audio/*'], outputExt: 'mp3', multiple: true },
    { id: 'wav-to-mp3', label: 'WAV → MP3', icon: 'musical-notes-outline', endpoint: '/convert/wav-to-mp3', mimeTypes: ['audio/wav', 'audio/x-wav'], outputExt: 'mp3' },
    { id: 'mp3-to-wav', label: 'MP3 → WAV', icon: 'musical-note-outline', endpoint: '/convert/mp3-to-wav', mimeTypes: ['audio/mpeg'], outputExt: 'wav' },
];
