// Beauty Series · haircare products (shared by the shop section and the owner page)
//
// PREVIEW mode (no Firebase config): sample products; the owner page saves changes
// in this browser's localStorage only, so a visitor never sees them.
// LIVE mode: Firestore `products/{id}`; public reads products that aren't hidden,
// only logins in `admins/{uid}` can write. Rules: ../backend/firestore.rules.
// Built from the Pammy's Lux shop (Client 08).

export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
export const CLOUDINARY = { cloudName: "", uploadPreset: "" }; // optional photo hosting

const params = new URLSearchParams(location.search);
const USE_EMULATOR = params.has("emulator") && ["localhost", "127.0.0.1"].includes(location.hostname);
if (USE_EMULATOR) Object.assign(FIREBASE_CONFIG, { apiKey: "demo-key", authDomain: "demo-bs.firebaseapp.com", projectId: "demo-bs", appId: "demo" });
export const LIVE = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

// The six products from her TikTok / board. No prices: she hasn't given them (never invent prices).
const SAMPLES = [
  ["s-growth-oil", "Hair growth oil", "For edges, scalp and length retention.", "images/product-growth-oil.jpg"],
  ["s-hair-food", "Hair food", "Rich daily nourishment for dry hair.", "images/product-hair-food.jpg"],
  ["s-leave-in", "Leave-in conditioner", "Softness and moisture between washes.", "images/product-leave-in.jpg"],
  ["s-shampoo", "Hair shampoo", "A gentle, clean wash for every texture.", "images/product-shampoo.jpg"],
  ["s-conditioner", "Hair conditioner", "Detangles and smooths after washing.", "images/product-conditioner.jpg"],
  ["s-hair-mask", "Hair mask", "A weekly deep-conditioning treat.", "images/product-hair-mask.jpg"],
].map(([id, name, description, photo], i) => ({
  id, name, description, photo, price: null, soldOut: false, hidden: false, order: i, sample: true,
}));

export const money = (n) => `GH₵ ${Number(n).toLocaleString("en-GH", { maximumFractionDigits: 2 })}`;
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

/** Tidy a product before saving. Throws Error with a friendly message. */
export function cleanProduct(p) {
  const name = String(p.name || "").trim();
  if (!name) throw new Error("Please give the product a name.");
  if (name.length > 60) throw new Error("Keep the name under 60 letters.");
  if (!p.photo) throw new Error("Please add a photo.");
  let price = p.price === "" || p.price == null ? null : Math.round(Number(p.price) * 100) / 100;
  if (price !== null && !(price > 0 && price <= 100000)) throw new Error("The price should be a number above 0, or leave it empty.");
  return {
    name,
    description: String(p.description || "").trim().slice(0, 200),
    price,
    photo: String(p.photo),
    soldOut: Boolean(p.soldOut),
    hidden: Boolean(p.hidden),
    order: Number.isFinite(Number(p.order)) ? Number(p.order) : Date.now(),
  };
}

/* ---------- Preview store ---------- */
const KEY = "bs-products-preview-v1";
function readPreview() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(s)) return s; } catch {}
  return structuredClone(SAMPLES);
}
function writePreview(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); }
  catch { throw new Error("This phone's storage is full. Try a smaller photo or reset the preview."); }
}
export function resetPreview() { try { localStorage.removeItem(KEY); } catch {} }

/* ---------- Firebase (loaded only when configured) ---------- */
const V = "10.12.2";
let fbPromise, authPromise;
function firebase() {
  fbPromise ??= (async () => {
    const [{ initializeApp }, fs] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
    ]);
    const app = initializeApp(FIREBASE_CONFIG);
    const db = fs.getFirestore(app);
    if (USE_EMULATOR) fs.connectFirestoreEmulator(db, "127.0.0.1", 8080);
    return { app, fs, db };
  })();
  fbPromise.catch(() => (fbPromise = null));
  return fbPromise;
}
function firebaseAuth() {
  authPromise ??= (async () => {
    const [{ app, fs, db }, au] = await Promise.all([firebase(), import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`)]);
    const auth = au.getAuth(app);
    if (USE_EMULATOR) au.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    return { fs, db, au, auth };
  })();
  authPromise.catch(() => (authPromise = null));
  return authPromise;
}

/* ---------- Products ---------- */
export async function getProducts({ all = false } = {}) {
  if (!LIVE) return readPreview().filter((p) => all || !p.hidden).sort(byOrder);
  const { fs, db } = all ? await firebaseAuth() : await firebase();
  const col = fs.collection(db, "products");
  const snap = await fs.getDocs(all ? col : fs.query(col, fs.where("hidden", "==", false)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
}

export async function saveProduct(p) {
  const data = cleanProduct(p);
  if (!LIVE) {
    const list = readPreview();
    const id = p.id || `p-${Date.now().toString(36)}`;
    const i = list.findIndex((x) => x.id === id);
    const saved = { ...data, id };
    if (i >= 0) list[i] = saved; else list.push(saved);
    writePreview(list);
    return saved;
  }
  const { fs, db } = await firebaseAuth();
  const ref = p.id ? fs.doc(db, "products", p.id) : fs.doc(fs.collection(db, "products"));
  await fs.setDoc(ref, { ...data, updatedAt: fs.serverTimestamp() });
  return { ...data, id: ref.id };
}

export async function deleteProduct(id) {
  if (!LIVE) return writePreview(readPreview().filter((p) => p.id !== id));
  const { fs, db } = await firebaseAuth();
  await fs.deleteDoc(fs.doc(db, "products", id));
}

/** Swap two products' places in the list (move up / down). */
export async function swapOrder(a, b) {
  const ao = a.order, bo = b.order === ao ? ao + 1 : b.order;
  await saveProduct({ ...a, order: bo });
  await saveProduct({ ...b, order: ao });
}

/* ---------- Photos ---------- */
function shrinkPhoto(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't a photo we can read. Try a JPG or PNG.")); };
    img.src = url;
  });
}
export async function uploadPhoto(file) {
  if (!(LIVE && CLOUDINARY.cloudName && CLOUDINARY.uploadPreset)) return shrinkPhoto(file, LIVE ? 800 : 700, LIVE ? 0.75 : 0.72);
  const body = new FormData();
  body.append("file", await shrinkPhoto(file, 1400, 0.85));
  body.append("upload_preset", CLOUDINARY.uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, { method: "POST", body });
  if (!res.ok) throw new Error("The photo didn't upload. Check your internet and try again.");
  return (await res.json()).secure_url.replace("/upload/", "/upload/f_auto,q_auto,w_900/");
}

/* ---------- Owner sign-in (live mode) ---------- */
export async function onOwner(cb) {
  if (!LIVE) return cb({ preview: true });
  const { fs, db, au, auth } = await firebaseAuth();
  au.onAuthStateChanged(auth, async (user) => {
    if (!user) return cb(null);
    let admin = false;
    try { admin = (await fs.getDoc(fs.doc(db, "admins", user.uid))).exists(); } catch {}
    cb({ user, admin });
  });
}
export async function signIn(email, password) {
  const { au, auth } = await firebaseAuth();
  try { await au.signInWithEmailAndPassword(auth, email.trim(), password); }
  catch (e) {
    throw new Error(["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(e.code)
      ? "Wrong email or password." : e.code === "auth/too-many-requests" ? "Too many tries. Wait a few minutes and try again."
      : "Couldn't sign in. Check your internet and try again.");
  }
}
export async function signOut() { const { au, auth } = await firebaseAuth(); await au.signOut(auth); }
