const apiKey = process.env.GOOGLE_GENAI_API_KEY;
const modelName = "gemini-2.0-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

async function test() {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });
        console.log("Status:", response.status);
        const data = await response.json();
        console.log("Data:", JSON.stringify(data).substring(0, 200));
    } catch (e) {
        console.error(e);
    }
}
test();
