import { cert, initializeApp, getApps } from "firebase-admin/app";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keyPath = path.resolve(__dirname, "../serviceAccountKey.json");

let app;

if (getApps().length === 0) {
    if (fs.existsSync(keyPath)) {
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
            app = initializeApp({
                credential: cert(serviceAccount)
            });
            console.log("[Firebase] Initialized successfully with serviceAccountKey.json");
        } catch (e) {
            console.warn("[Firebase Warning] Error parsing serviceAccountKey.json:", e.message);
            app = initializeApp();
        }
    } else {
        console.warn("[Firebase Warning] serviceAccountKey.json not found in backend/services/auth. Running with default/mock configuration.");
        try {
            app = initializeApp();
        } catch (e) {
            app = null;
        }
    }
} else {
    app = getApps()[0];
}

export { app };