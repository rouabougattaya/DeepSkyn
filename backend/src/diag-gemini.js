const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// Manually load .env since dotenv might be finicky with relative paths in this setup
const envPath = "C:\\PI\\backend\\backend\\.env";
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
        const [key, value] = line.split("=");
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function listModels() {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        console.error("❌ API Key not found in .env at:", envPath);
        return;
    }

    console.log("✅ Using API Key starting with:", apiKey.substring(0, 10) + "...");

    // The SDK doesn't expose a direct listModels method, so we use a fetch to the REST endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("📋 Available Models:");
            data.models.forEach(m => {
                const shortName = m.name.split('/').pop();
                console.log(` - ${shortName} (Full: ${m.name})`);
            });
        } else {
            console.log("❌ No models found or error in response:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("❌ Request failed:", error.message);
    }
}

listModels();
