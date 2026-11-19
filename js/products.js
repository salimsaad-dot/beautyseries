// Beauty Series · fills the shop section from the product list (the owner page edits it).
// The static products in index.html stay as a fallback if this can't load.
// The bag itself (Add to bag → stepper → one WhatsApp order) lives in script.js and
// works on whatever .product items are in #products.
import { getProducts, money } from "./shop-store.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const list = document.getElementById("products");

function card(p) {
  const label = p.soldOut ? `${p.name}, sold out` : `Add ${p.name} to bag`;
  return `<li class="product${p.soldOut ? " is-sold" : ""}" data-product="${esc(p.name)}"${p.price ? ` data-price="${p.price}"` : ""}${p.soldOut ? " data-soldout" : ""}>
    <div class="product-art"><img class="fade-img loaded" src="${esc(p.photo)}" alt="" loading="lazy" />${p.soldOut ? '<span class="sold-tag">Sold out</span>' : ""}</div>
    <h3>${esc(p.name)}</h3>
    <p>${esc(p.description || "")}</p>
    <p class="price">${p.price ? money(p.price) : "Ask for price"}</p>
    <div class="buy"><button type="button" class="add" aria-label="${esc(label)}"${p.soldOut ? " disabled" : ""}>${p.soldOut ? "Sold out" : "Add to bag"}</button></div>
  </li>`;
}

getProducts().then((products) => {
  list.innerHTML = products.length ? products.map(card).join("") : `<li class="product-empty">New products coming soon.</li>`;
  document.dispatchEvent(new CustomEvent("products:ready"));
}).catch(() => { /* keep the built-in list */ });
