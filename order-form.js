/******** CONFIG ********/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/******** STATE ********/
let products = [];
let state = {
  step: 1,
  customer: null,
  cart: [],
  taxRate: 0
};

/******** CSV ********/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (values[i] || "").trim());
    return obj;
  });
}

/******** LOAD PRODUCTS ********/
async function loadProducts() {
  const text = await (await fetch(PRODUCT_CSV_URL)).text();
  products = parseCSV(text).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"]),
    stock: Number(p["Qty in stock"]),
  }));
  render();
}

/******** AUTOCOMPLETE (LOCKED) ********/
async function fetchCustomers(q) {
  if (q.length < 2) return [];
  const r = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const d = await r.json();
  return d.results || [];
}

function bindAutocomplete() {
  const input = document.getElementById("customer-input");
  const box = document.getElementById("autocomplete-results");

  input.addEventListener("input", async () => {
    box.innerHTML = "";
    const val = input.value.trim();
    if (val.length < 2) return;

    const results = await fetchCustomers(val);
    results.forEach(c => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = `${c.name} — ${c.city}, ${c.state}`;
      div.dataset.customer = JSON.stringify(c);
      box.appendChild(div);
    });
  });
}

document.addEventListener("click", e => {
  if (!e.target.classList.contains("autocomplete-item")) return;
  state.customer = JSON.parse(e.target.dataset.customer);
  state.step = 2;
  render();
});

/******** RENDER ********/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <div class="autocomplete-wrapper">
          <input id="customer-input" placeholder="Start typing customer name">
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;
    bindAutocomplete();
  }

  /* STEP 2 */
  if (state.step === 2) {
    let html = `<div class="card"><h2>Select Products</h2><div class="grid">`;
    products.forEach((p, i) => {
      html += `
        <div class="product-card">
          <strong>${p.name}</strong>
          $${p.price.toFixed(2)}<br>
          In Stock: ${p.stock}<br>
          <input type="number" min="0" max="${p.stock}" id="q-${i}">
        </div>`;
    });
    html += `</div>
      <button class="primary" onclick="review()">Review Order</button>
    </div>`;
    el.innerHTML = html;
  }

  /* STEP 3 */
  if (state.step === 3) {
    let subtotal = 0, cases = 0, keg = 0;

    let html = `<div class="card">
      <h2>Review Order</h2>
      <p><strong>${state.customer.name}</strong><br>
      ${state.customer.address}<br>
      ${state.customer.city}, ${state.customer.state} ${state.customer.zip}</p>
      <hr>
      <table class="review-table">
      <tr><th>Product</th><th>Qty</th><th>Total</th></tr>`;

    state.cart.forEach(i => {
      const line = i.qty * i.price;
      subtotal += line;
      if (/case/i.test(i.name)) cases += i.qty;
      if (/keg/i.test(i.name)) keg += i.qty * 30;
      html += `<tr><td>${i.name}</td><td>${i.qty}</td><td>$${line.toFixed(2)}</td></tr>`;
    });

    const discount = cases >= 10 ? subtotal * 0.10 : 0;
    const tax = state.customer.businessType === "Restaurant" ? subtotal * 0.06 : 0;
    const total = subtotal - discount + tax + keg;

    html += `</table>
      <p>Subtotal: $${subtotal.toFixed(2)}</p>
      <p>Discount: -$${discount.toFixed(2)}</p>
      <p>Tax: $${tax.toFixed(2)}</p>
      <p>Keg Deposit: $${keg.toFixed(2)}</p>
      <h3>Total: $${total.toFixed(2)}</h3>

      <button onclick="state.step=2;render()">Back</button>
      <button class="primary" onclick="alert('Next: Print / Email')">Submit</button>
    </div>`;

    el.innerHTML = html;
  }
}

/******** ACTIONS ********/
function review() {
  state.cart = products.map((p, i) => {
    const qty = Number(document.getElementById(`q-${i}`).value || 0);
    if (qty > p.stock) return null;
    return qty > 0 ? { ...p, qty } : null;
  }).filter(Boolean);

  if (!state.cart.length) {
    alert("Please add at least one product.");
    return;
  }

  state.step = 3;
  render();
}

/******** INIT ********/
loadProducts();
render();
