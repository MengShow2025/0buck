const API_KEY = process.env.GOOGLE_API_KEY;
async function test() {
    try {
        console.log("Testing fetch to Gemini...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });
        const data = await response.json();
        console.log("Response data:", JSON.stringify(data).substring(0, 100));
    } catch (e) {
        console.error("Fetch error:", e.message);
    }
}
test();
