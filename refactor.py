import re

with open('mobile/src/app/convert.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace usePdfEngine variables and loadPdfJs logic
loadpdf_start = content.find('let pdfJsLoadingPromise: Promise<any> | null = null;')
loadpdf_end = content.find('const SERVER_URL = __DEV__ ? \\'http://localhost:3000\\' : \\'https://faas-transfer.onrender.com\\';')
if loadpdf_start != -1 and loadpdf_end != -1:
    content = content[:loadpdf_start] + content[loadpdf_end:]

# Replace the states inside ConvertScreen
states_start = content.find('    const [pdfEditorPages, setPdfEditorPages] = useState<string[]>([]);')
states_end = content.find('    const currentRenderSession = useRef<number>(0);') + len('    const currentRenderSession = useRef<number>(0);')
if states_start != -1 and states_end != -1:
    hook_str = '''
    const {
        pdfOriginalBuffer, setPdfOriginalBuffer,
        pdfEditorPages, setPdfEditorPages,
        organizePages, setOrganizePages,
        organizeFiles, setOrganizeFiles,
        pdfDocRef, setPdfDocRef,
        currentRenderSession,
        initPdfEditor, handlePdfEditorComplete, resetEngine
    } = usePdfEngine({ setStep, setResultUrl });
'''
    content = content[:states_start] + hook_str + content[states_end:]


with open('mobile/src/app/convert.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
