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
  cart: []
};

/******** CSV ********/
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

/******** LOAD PRODUCTS ********/
async function loadProducts() {
  const text = await (await fetch(PRODUCT_CSV_URL)).text();
  products = parseCSV(text).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"])
  }));
  render();
}

/******** AUTOCOMPLETE (DO NOT TOUCH) ********/
async function fetchCustomers(query) {
  const res = await fetch(API_URL + "?q=" + encodeURIComponent(query));
  const data = await res.json();
  return data.results || [];
}

async function handleAutocomplete(val) {
  const box = document.getElementById("autocomplete-results");
  box.innerHTML = "";

  if (val.length < 2) return;

  const results = await fetchCustomers(val);

  results.forEach(c => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.textContent = c.name;

    div.onmousedown = function () {
      state.customer = c;
      state.step = 2;
      render();
    };

    box.appendChild(div);
  });
}

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
          <input
            id="customer-input"
            placeholder="Start typing customer name"
            oninput="handleAutocomplete(this.value)"
            autocomplete="off"
          >
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;
  }

  /* STEP 2 */
  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Select Products</h2><div class="grid">`;

    products.forEach((p, i) => {
      el.innerHTML += `
        <div class="product-card">
          <strong>${p.name}</strong>
          $${p.price.toFixed(2)}
          <input type="number" min="0" id="q-${i}">
        </div>
      `;
    });

    el.innerHTML += `
      </div>
      <button class="primary" onclick="review()">Review Order</button>
      </div>
    `;
  }

  /* STEP 3 */
  if (state.step === 3) {
    let subtotal = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>
        <p><strong>${state.customer.name}</strong><br>
        ${state.customer.address}<br>
        ${state.customer.city}, ${state.customer.state} ${state.customer.zip}</p>

        <table class="review-table">
          <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
    `;

    state.cart.forEach(i => {
      const line = i.qty * i.price;
      subtotal += line;
      el.innerHTML += `
        <tr>
          <td>${i.name}</td>
          <td>${i.qty}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>
      `;
    });

    el.innerHTML += `
        </table>
        <h3>Total: $${subtotal.toFixed(2)}</h3>
      </div>
    `;
  }
}

/******** ACTIONS ********/
function review() {
  state.cart = products.map((p, i) => ({
    ...p,
    qty: Number(document.getElementById(`q-${i}`).value || 0)
  })).filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Add at least one product");
    return;
  }

  state.step = 3;
  render();
}

/******** INIT ********/
loadProducts();
render();
