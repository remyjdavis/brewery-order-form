/**************** CONFIG ****************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/**************** STATE ****************/
let products = [];
let autocompleteResults = [];

let state = {
  step: 1,
  customer: null,
  cart: []
};

/**************** CSV ****************/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");

  return lines.map(row => {
    const values = row.split(",");
    let obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || "").trim();
    });
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

/**************** CUSTOMER SEARCH ****************/
async function searchCustomers(query) {
  const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.results || [];
}

/**************** AUTOCOMPLETE (FIXED) ****************/
async function autocomplete(val) {
  if (val.length < 2) {
    clearAutocomplete();
    return;
  }

  autocompleteResults = await searchCustomers(val);
  renderAutocomplete();
}

function renderAutocomplete() {
  const root = document.getElementById("autocomplete-root");
  const input = document.getElementById("customer-search");
  if (!root || !input) return;

  if (!autocompleteResults.length) {
    root.innerHTML = "";
    return;
  }

  const rect = input.getBoundingClientRect();

  root.innerHTML = `
    <div class="autocomplete-dropdown"
      style="
        top:${rect.bottom + window.scrollY}px;
        left:${rect.left + window.scrollX}px;
        width:${rect.width}px;
      ">
      ${autocompleteResults.map((c, i) => `
        <div class="autocomplete-item"
             onclick="selectCustomerByIndex(${i})">
          ${c.name}
        </div>
      `).join("")}
    </div>
  `;
}

function clearAutocomplete() {
  const root = document.getElementById("autocomplete-root");
  if (root) root.innerHTML = "";
}

function selectCustomerByIndex(i) {
  state.customer = autocompleteResults[i];
  clearAutocomplete();
  state.step = 2;
  render();
}

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 – CUSTOMER */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <input
          id="customer-search"
          placeholder="Search customer..."
          oninput="autocomplete(this.value)"
        >
      </div>
    `;
  }

  /* STEP 2 – PRODUCTS (UNCHANGED GRID) */
  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Products</h2><div class="grid">`;

    products.forEach((p, i) => {
      el.innerHTML += `
        <div class="product-card">
          <strong>${p.name}</strong><br>
          $${p.price.toFixed(2)}
          ${p.stock <= 10 ? `<div class="low-stock">Low stock</div>` : ""}
          <input type="number" min="0" id="q-${i}">
        </div>
      `;
    });

    el.innerHTML += `
      </div>
      <button onclick="review()">Review Order</button>
    </div>`;
  }

  /* STEP 3 – REVIEW (UNCHANGED FORMAT) */
  if (state.step === 3) {
    let subtotal = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>
        <p><strong>${state.customer.name}</strong></p>
        <table>
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
        <button onclick="state.step=2;render()">Back</button>
        <button onclick="submitOrder()">Submit</button>
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
    alert("Add at least one product");
    return;
  }

  state.step = 3;
  render();
}

async function submitOrder() {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: state.customer,
      items: state.cart
    })
  });

  alert("Order submitted");
  location.reload();
}

/**************** INIT ****************/
loadProducts();
render();
