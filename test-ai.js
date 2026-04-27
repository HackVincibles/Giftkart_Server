const { GoogleGenAI } = require('@google/genai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
    console.log("Key:", process.env.GEMINI_API_KEY ? "LOADED" : "MISSING");
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Test connection',
        });
        console.log("Success:", response.text);
    } catch (err) {
        console.error("AI Error:", err.message || err);
    }
}
run();
