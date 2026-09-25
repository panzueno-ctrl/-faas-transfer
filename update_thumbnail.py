import sys

path = '/home/daven/faas-transfer/mobile/src/components/PdfThumbnail.web.tsx'
with open(path, 'r') as f:
    content = f.read()

old_str = """        script.onload = () => {
            const pdfjs = (window as any).pdfjsLib;
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            pdfjsLib = pdfjs;
            resolve(pdfjs);
        };"""

new_str = """        script.onload = async () => {
            const pdfjs = (window as any).pdfjsLib;
            try {
                const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js');
                const text = await res.text();
                const blob = new Blob([text], { type: 'text/javascript' });
                pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
            } catch (e) {
                pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            }
            pdfjsLib = pdfjs;
            resolve(pdfjs);
        };"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(path, 'w') as f:
        f.write(content)
    print('Replaced successfully')
else:
    print('String not found!')
