// Beauty Series · owner page: add, edit, price, sell out, hide, reorder and delete products.
import { LIVE, money, getProducts, saveProduct, deleteProduct, swapOrder, uploadPhoto, resetPreview, onOwner, signIn, signOut } from "./shop-store.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
let products = [];

let tt;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2600);
}

function render() {
  const sold = products.filter((p) => p.soldOut).length, hidden = products.filter((p) => p.hidden).length;
  $("stats").textContent = `${products.length} product${products.length === 1 ? "" : "s"} · ${sold} sold out · ${hidden} hidden`;
  $("plist").innerHTML = products.length ? products.map((p, i) => `
    <li class="prow${p.hidden ? " is-hidden" : ""}">
      <button type="button" class="prow-main" data-edit="${esc(p.id)}" aria-label="Edit ${esc(p.name)}">
        <img src="${esc(p.photo)}" alt="">
        <span class="prow-info">
          <b>${esc(p.name)}</b>
          <span>${p.price ? money(p.price) : "Ask for price"}</span>
          <span class="badges">${p.soldOut ? '<i class="b-sold">Sold out</i>' : ""}${p.hidden ? '<i class="b-hidden">Hidden</i>' : ""}</span>
        </span>
        <span class="edit-hint" aria-hidden="true">Edit</span>
      </button>
      <div class="prow-tools">
        <label class="switch small"><input type="checkbox" data-flag="soldOut" data-id="${esc(p.id)}"${p.soldOut ? " checked" : ""}><span></span> Sold out</label>
        <label class="switch small"><input type="checkbox" data-flag="show" data-id="${esc(p.id)}"${p.hidden ? "" : " checked"}><span></span> On website</label>
        <span class="move">
          <button type="button" data-move="-1" data-i="${i}" aria-label="Move ${esc(p.name)} up"${i === 0 ? " disabled" : ""}>↑</button>
          <button type="button" data-move="1" data-i="${i}" aria-label="Move ${esc(p.name)} down"${i === products.length - 1 ? " disabled" : ""}>↓</button>
        </span>
      </div>
    </li>`).join("") : `<li class="muted empty">No products yet. Tap "Add product".</li>`;
}

async function reload() {
  try { products = await getProducts({ all: true }); render(); }
  catch { $("plist").innerHTML = `<li class="err">Couldn't load your products. Check your internet and refresh.</li>`; }
}

$("plist").addEventListener("change", async (e) => {
  const box = e.target.closest("[data-flag]");
  if (!box) return;
  const p = products.find((x) => x.id === box.dataset.id);
  const flags = box.dataset.flag === "soldOut" ? { soldOut: box.checked } : { hidden: !box.checked };
  box.disabled = true;
  try {
    Object.assign(p, await saveProduct({ ...p, ...flags }));
    toast(box.dataset.flag === "soldOut" ? (box.checked ? `${p.name} is sold out` : `${p.name} is back in stock`)
      : (box.checked ? `${p.name} is on the website` : `${p.name} is hidden`));
    render();
  } catch (err) {
    box.checked = !box.checked; box.disabled = false;
    toast(err.message || "Couldn't save. Try again.");
  }
});

$("plist").addEventListener("click", async (e) => {
  const mv = e.target.closest("[data-move]");
  if (mv) {
    const i = Number(mv.dataset.i), j = i + Number(mv.dataset.move);
    mv.disabled = true;
    try { await swapOrder(products[i], products[j]); await reload(); $("plist").querySelectorAll(".prow")[j]?.querySelector(`[data-move="${mv.dataset.move}"]:not([disabled])`)?.focus(); }
    catch { toast("Couldn't move it. Try again."); mv.disabled = false; }
    return;
  }
  const b = e.target.closest("[data-edit]");
  if (b) openEditor(products.find((p) => p.id === b.dataset.edit));
});

/* ---------- Editor ---------- */
const ed = $("editor");
let editing = null, photo = "";

function setPhoto(src) {
  photo = src;
  $("edImg").hidden = !src;
  if (src) $("edImg").src = src;
  $("photoLabel").textContent = src ? "📷 Change photo" : "📷 Add a photo";
}
$("edFile").addEventListener("change", async () => {
  const file = $("edFile").files[0];
  if (!file) return;
  $("photoMsg").textContent = "Getting your photo ready…";
  $("edSave").disabled = true;
  try { setPhoto(await uploadPhoto(file)); $("photoMsg").textContent = "Looks good."; $("photoBtn").classList.remove("invalid"); }
  catch (err) { $("photoMsg").textContent = err.message; }
  finally { $("edSave").disabled = false; $("edFile").value = ""; }
});

function openEditor(p = null) {
  editing = p;
  $("edTitle").textContent = p ? "Edit product" : "Add product";
  $("edName").value = p?.name || "";
  $("edDesc").value = p?.description || "";
  $("edPrice").value = p?.price ?? "";
  $("edSold").checked = !!p?.soldOut;
  $("edHidden").checked = !!p?.hidden;
  $("edErr").textContent = "";
  $("photoMsg").textContent = "A clear photo of the product on a plain background.";
  setPhoto(p?.photo || "");
  $("edDelete").hidden = !p;
  ed.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  ed.showModal();
}
$("addBtn").addEventListener("click", () => openEditor());
$("edClose").addEventListener("click", () => ed.close());
$("edForm").addEventListener("input", (e) => { e.target.classList.remove("invalid"); $("edErr").textContent = ""; });

$("edForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const draft = {
    ...(editing || { order: products.length ? Math.max(...products.map((p) => p.order ?? 0)) + 1 : 0 }),
    name: $("edName").value, description: $("edDesc").value, price: $("edPrice").value, photo,
    soldOut: $("edSold").checked, hidden: $("edHidden").checked,
  };
  $("edSave").disabled = true; $("edSave").textContent = "Saving…";
  try {
    const saved = await saveProduct(draft);
    ed.close();
    toast(editing ? "Saved" : `${saved.name} is on your website`);
    await reload();
  } catch (err) {
    const msg = err.message || "Couldn't save. Check your internet and try again.";
    $("edErr").textContent = msg;
    ({ name: $("edName"), photo: $("photoBtn"), price: $("edPrice") })[/photo/i.test(msg) ? "photo" : /price/i.test(msg) ? "price" : "name"]?.classList.add("invalid");
  } finally {
    $("edSave").disabled = false; $("edSave").textContent = "Save";
  }
});

$("edDelete").addEventListener("click", async () => {
  if (!editing || !confirm(`Delete "${editing.name}"? This can't be undone. (To take it off for a while, use "Hide" instead.)`)) return;
  try { await deleteProduct(editing.id); ed.close(); toast("Deleted"); await reload(); }
  catch { $("edErr").textContent = "Couldn't delete. Check your internet and try again."; }
});

/* ---------- Start ---------- */
$("previewStrip").hidden = LIVE;
$("reset").addEventListener("click", async () => {
  if (!confirm("Remove your changes and go back to the sample products?")) return;
  resetPreview(); await reload(); toast("Back to the samples");
});
$("signinForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("signinErr").textContent = "";
  try { await signIn($("email").value, $("password").value); } catch (err) { $("signinErr").textContent = err.message; }
});
$("signOut").addEventListener("click", () => signOut());
onOwner((who) => {
  const ok = who && (who.preview || who.admin);
  $("signin").hidden = !!who;
  $("notAdmin").hidden = !who || ok;
  $("owner").hidden = !ok;
  $("signOut").hidden = !who || who.preview;
  if (ok) reload();
}).catch(() => { $("signin").hidden = false; $("signinErr").textContent = "Couldn't connect. Check your internet and refresh."; });
