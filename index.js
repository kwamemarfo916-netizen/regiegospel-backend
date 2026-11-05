const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const RECAPTCHA_SECRET = defineSecret("RECAPTCHA_SECRET");

// Verifies the reCAPTCHA tick with Google, then saves the email. The secret key never reaches the website.
exports.submitSignup = onCall(
  { region: "europe-west1", secrets: [RECAPTCHA_SECRET], maxInstances: 5 },
  async (req) => {
    const email = String((req.data && req.data.email) || "").trim().toLowerCase();
    const token = String((req.data && req.data.token) || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      throw new HttpsError("invalid-argument", "Invalid email.");
    }
    if (!token) throw new HttpsError("permission-denied", "Verification missing.");

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: RECAPTCHA_SECRET.value(), response: token }),
    });
    const out = await res.json();
    if (!out.success) throw new HttpsError("permission-denied", "Verification failed.");

    const col = getFirestore().collection("signups");
    const dup = await col.where("email", "==", email).limit(1).get();
    if (!dup.empty) return { ok: true, already: true };
    await col.add({ email, source: "website", createdAt: FieldValue.serverTimestamp() });
    return { ok: true };
  }
);
