const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const envPath = "C:\\PI\\backend\\backend\\.env";
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
    const [key, value] = line.split("=");
    if (key && value) process.env[key.trim()] = value.trim();
});

async function findWorkingModel() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
    const candidates = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.0-pro",
        "gemini-pro",
        "gemini-1.5-pro",
        "gemini-1.5-pro-latest"
    ];

    for (const m of candidates) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("test");
            console.log(`FOUND_WORKING_MODEL: ${m}`);
            process.exit(0);
        } catch (e) {
            // console.log(`${m} failed`);
        }
    }
    console.log("NO_WORKING_MODEL_FOUND");
}

findWorkingModel();
