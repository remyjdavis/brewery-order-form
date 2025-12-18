const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

let products = [];
let state = {
  step: 1,
  customer: null,
  cart: []
};

/* ---------- CSV ---------- */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(l => {
    const v = l.split(",");
    let o = {};
    headers.forEach((h, i) => o[h.trim()] = (v[i] || "").trim());
    return o;
  });
}

/* ---------- LOAD PRODUCTS ---------- */
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();
  products = parseCSV(text).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"])
  }));
  render();
}

/* ---------- CUSTOMER SEARCH ---------- */
async function searchCustomers(q) {
  if (q.length < 2) return [];
  const r = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const d = await r.json();
  return d.results || [];
}

/* ---------- RENDER ---------- */
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 — FULL WIDTH SEARCH */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <div class="autocomplete-wrapper">
          <input id="cust-input" type="text" placeholder="Start typing store name...">
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;

    document
      .getElementById("cust-input")
      .addEventListener("input", handleAutocomplete);
  }

  /* STEP 2 — FULL WIDTH GRID */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
        <div class="grid">
          ${products.map((p, i) => `
            <div class="product-card">
              <div class="product-name">${p.name}</div>
              <div class="product-price">$${p.price.toFixed(2)}</div>
              <input type="number" min="0" id="q-${i}" placeholder="Qty">
            </div>
          `).join("")}
        </div>
        <button id="reviewBtn">Review Order</button>
      </div>
    `;

    document.getElementById("reviewBtn").onclick = review;
  }
}

/* ---------- AUTOCOMPLETE ---------- */
async function handleAutocomplete(e) {
  const val = e.target.value;
  const box = document.getElementById("autocomplete-results");

  if (val.length < 2) {
    box.style.display = "none";
    return;
  }

  const results = await searchCustomers(val);

  box.innerHTML = results.map((c, i) => `
    <div class="autocomplete-item" data-index="${i}">
      ${c.name}
    </div>
  `).join("");

  box.style.display = "block";

  box.onclick = ev => {
    const item = ev.target.closest(".autocomplete-item");
    if (!item) return;
    state.customer = results[item.dataset.index];
    state.step = 2;
    render();
  };
}

/* ---------- REVIEW PLACEHOLDER ---------- */
function review() {
  state.cart = products.map((p, i) => ({
    ...p,
    qty: Number(document.getElementById(`q-${i}`).value || 0)
  })).filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Add at least one product");
    return;
  }

  alert("Layout confirmed. Ready for review page.");
}

/* ---------- INIT ---------- */
loadProducts();
render();
