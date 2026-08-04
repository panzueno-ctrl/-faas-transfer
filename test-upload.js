const fs = require('fs');
async function test() {
  const formData = new FormData();
  const blob = new Blob(["test content"], { type: "text/plain" });
  formData.append("files", blob, "test.txt");

  try {
    const res = await fetch("https://-faas-transfer.onrender.com/upload/multiple", {
      method: "POST",
      body: formData
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
