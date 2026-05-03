const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const envPath = "c:\\Users\\yathr\\DeepSkyn\\backend\\.env";
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
    const [key, value] = line.split("=");
    if (key && value) process.env[key.trim()] = value.trim();
});

async function testModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
    const models = ["gemini-1.5-flash", "gemini-1.0-pro", "gemini-pro", "gemini-1.5-pro"];

    for (const modelName of models) {
        console.log(`Testing ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say hello");
            const response = result.response;
            console.log(`✅ ${modelName} works: ${response.text().substring(0, 20)}...`);
            break;
        } catch (error) {
            console.log(`❌ ${modelName} failed: ${error.message}`);
        }
    }
}

testModels();
