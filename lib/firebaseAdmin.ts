import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let initialized = false;

function getPrivateKey(): string {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("FIREBASE_PRIVATE_KEY missing");
  }
  return privateKey.replace(/\\n/g, "\n");
}

export function getFirebaseAdminAuth() {
  if (!initialized && getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !clientEmail) {
      throw new Error("Firebase admin env vars missing");
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: getPrivateKey(),
      }),
      projectId,
    });

    initialized = true;
  }

  return getAuth();
}
