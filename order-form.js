/**************** CONFIG ****************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/**************** STATE ****************/
let products = [];
let state = {
  step: 1,
  customer: null,
  cart: []
};

/**************** CSV ****************/
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

/**************** LOAD PRODUCTS ****************/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();

  products = parseCSV(text).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"]),
    stock: Number(p["Qty In Stock"] || 0)
  }));

  render();
}

/**************** AUTOCOMPLETE ****************/
const acRoot = document.getElementById("autocomplete-root");
let debounceTimer = null;

function handleCustomerInput(input) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => searchCustomers(input), 300);
}

async function searchCustomers(query) {
  if (query.length < 2) {
    acRoot.innerHTML = "";
    return;
  }

  const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
  const data = await res.json();

  if (!data.results || !data.results.length) {
    acRoot.innerHTML = "";
    return;
  }

  acRoot.innerHTML = `
    <div class="autocomplete-box">
      ${data.results.map((c, i) => `
        <div class="autocomplete-item"
             data-index="${i}"
             data-payload='${JSON.stringify(c)}'>
          ${c.name}
        </div>
      `).join("")}
    </div>
  `;
}

/* CLICK HANDLER — SAFARI SAFE */
acRoot.addEventListener("click", e => {
  const item = e.target.closest(".autocomplete-item");
  if (!item) return;

  const customer = JSON.parse(item.dataset.payload);
  state.customer = customer;
  state.step = 2;

  acRoot.innerHTML = "";
  render();
});

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 — CUSTOMER */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <input
          id="customer-search"
          type="text"
          placeholder="Search customer..."
          autocomplete="off"
        >
      </div>
    `;

    document
      .getElementById("customer-search")
      .addEventListener("input", e => handleCustomerInput(e.target.value));
  }

  /* STEP 2 — PRODUCTS (DO NOT TOUCH GRID) */
  if (state.step === 2) {
    el.innerHTML = `<div class="card">
      <h2>Select Products</h2>
      <div class="product-grid">`;

    products.forEach((p, i) => {
      const warn = p.stock > 0 && p.stock < 10
        ? `<div class="low-stock">Low stock</div>`
        : "";

      el.innerHTML += `
        <div class="product-card">
          <strong>${p.name}</strong>
          <div>$${p.price.toFixed(2)}</div>
          ${warn}
          <input type="number" min="0" id="q-${i}">
        </div>
      `;
    });

    el.innerHTML += `
      </div>
      <button class="primary-btn" onclick="review()">Review Order</button>
    </div>`;
  }

  /* STEP 3 — REVIEW */
  if (state.step === 3) {
    let subtotal = 0;
    let keg = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>
        <table class="review-table">
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
    `;

    state.cart.forEach((i, idx) => {
      const line = i.qty * i.price;
      subtotal += line;
      if (/keg/i.test(i.name)) keg += i.qty * 30;

      el.innerHTML += `
        <tr>
          <td>${i.name}</td>
          <td>
            <input type="number" value="${i.qty}"
              onchange="updateQty(${idx}, this.value)">
          </td>
          <td>$${line.toFixed(2)}</td>
        </tr>
      `;
    });

    el.innerHTML += `
        </table>
        <h3>Total: $${(subtotal + keg).toFixed(2)}</h3>

        <div class="review-actions">
          <button onclick="state.step=2; render()">Back</button>
          <button class="primary-btn">Submit</button>
        </div>
      </div>
    `;
  }
}

/**************** ACTIONS ****************/
function review() {
  state.cart = products.map((p, i) => ({
    ...p,
    qty: Number(document.getElementById(`q-${i}`).value || 0)
  })).filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Add at least one product.");
    return;
  }

  state.step = 3;
  render();
}

function updateQty(i, v) {
  state.cart[i].qty = Number(v);
  render();
}

/**************** INIT ****************/
loadProducts();
render();
