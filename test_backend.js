const fs = require('fs');
(async () => {
    const formData = new FormData();
    const fileData = fs.readFileSync('/home/daven/faas-transfer/test.pdf');
    const blob = new Blob([fileData], { type: 'application/pdf' });
    formData.append('file', blob, 'test.pdf');
    formData.append('targetStep', 'merge_editor');

    console.log("Sending to backend...");
    try {
        const response = await fetch('https://faas-transfer.onrender.com/convert/pdf-to-image', {
            method: 'POST',
            body: formData,
        });
        console.log("Backend status:", response.status);
        if (response.ok) {
            console.log("Backend success!");
        } else {
            console.log("Backend error text:", await response.text());
        }
    } catch (e) {
        console.log("Backend fetch failed:", e.message);
    }
})();
