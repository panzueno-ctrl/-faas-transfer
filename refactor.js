const fs = require('fs');
const path = require('path');

const filePath = '/home/daven/faas-transfer/mobile/src/app/convert.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
const importsHook = `import { usePdfEngine } from '../features/convert/hooks/usePdfEngine';
import { useConvertApi } from '../features/convert/hooks/useConvertApi';`;
content = content.replace("import JSZip from 'jszip';", "import JSZip from 'jszip';\n" + importsHook);

// 2. Remove loadPdfJs
const loadPdfStart = content.indexOf('let pdfJsLoadingPromise: Promise<any> | null = null;');
const loadPdfEnd = content.indexOf("const SERVER_URL = __DEV__ ? 'http://localhost:3000' : 'https://faas-transfer.onrender.com';");
if (loadPdfStart !== -1 && loadPdfEnd !== -1) {
    content = content.substring(0, loadPdfStart) + content.substring(loadPdfEnd);
}

// 3. Replace state variables and add hook calls
const stateVarsStart = content.indexOf('    // PdfEditor states');
const stateVarsEnd = content.indexOf('    const cancelTool = (targetStep: string = \'tool_intro\') => {');
if (stateVarsStart !== -1 && stateVarsEnd !== -1) {
    const hookVars = `
    const {
        pdfOriginalBuffer, setPdfOriginalBuffer,
        pdfEditorPages, setPdfEditorPages,
        organizePages, setOrganizePages,
        organizeFiles, setOrganizeFiles,
        pdfDocRef, setPdfDocRef,
        currentRenderSession,
        initPdfEditor, handlePdfEditorComplete, resetEngine
    } = usePdfEngine({ setStep, setResultUrl });

    const { processingTime: apiProcessingTime, processFiles } = useConvertApi({
        setStep, setResultUrl, setLocalError, t
    });
`;
    content = content.substring(0, stateVarsStart) + hookVars + "\n" + content.substring(stateVarsEnd);
}

// 4. Remove initPdfEditor, handlePdfEditorComplete
const initPdfStart = content.indexOf('    const initPdfEditor = async (file: any, targetStep: string = \'pdf_editor\') => {');
const initPdfEnd = content.indexOf('    const initOrganizeEditor = async (files: any[], appendToExisting = false, targetStep: string = \'organize_editor\') => {');
if (initPdfStart !== -1 && initPdfEnd !== -1) {
    content = content.substring(0, initPdfStart) + content.substring(initPdfEnd);
}

// 5. Remove processFiles
const processStart = content.indexOf('    const processFiles = async (passwordOverride?: string, filesOverride?: any[], compressionLevelOverride?: CompressionLevel) => {');
const processEnd = content.indexOf('    const downloadResult = async () => {');
if (processStart !== -1 && processEnd !== -1) {
    content = content.substring(0, processStart) + content.substring(processEnd);
}

// 6. Fix processingTime variable usage in UI
// Since we have apiProcessingTime from useConvertApi, we replace processingTime with apiProcessingTime in processing step.
// Actually processingTime is still declared in convert.tsx (for older logic?), wait no, we should check if processingTime state is removed.
const ptState = content.indexOf('    const [processingTime, setProcessingTime] = useState(0);');
if (ptState !== -1) {
    content = content.substring(0, ptState) + content.substring(ptState + '    const [processingTime, setProcessingTime] = useState(0);\n'.length);
}
content = content.replace(/processingTime/g, 'apiProcessingTime'); // Just replace any processingTime usages to apiProcessingTime.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactoring complete!');
