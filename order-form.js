/**************** CONFIG ****************/
const API_URL = "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";
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
  return text.trim().split("\n").map(r => r.split(","));
}

/**************** LOAD PRODUCTS (LOCKED) ****************/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const csv = await res.text();
  const rows = parseCSV(csv);

  products = rows.slice(1).map(r => ({
    name: r[0] || "",
    price: Number(r[1] || 0),
    stock: Number(r[2] || 0)
  }));

  render();
}

/**************** CUSTOMER SEARCH ****************/
async function searchCustomers(query) {
  if (query.length < 2) return [];
  const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.results || [];
}

async function handleAutocomplete(val) {
  const results = await searchCustomers(val);
  const box = document.getElementById("autocomplete-results");
  box.innerHTML = "";

  results.forEach(c => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.textContent = c.name;
    div.onclick = () => selectCustomer(c);
    box.appendChild(div);
  });
}

function selectCustomer(customer) {
  state.customer = customer;
  state.step = 2;
  render();
}

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 — CUSTOMER SEARCH (RESTORED) */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <div class="autocomplete-wrapper">
          <input
            id="customer-input"
            type="text"
            placeholder="Search customer..."
            oninput="handleAutocomplete(this.value)"
          >
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;
  }

  /* STEP 2 — PRODUCT GRID (UNTOUCHED) */
  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Select Products</h2><div class="grid">`;

    products.forEach((p, i) => {
      const low = p.stock <= 5 ? `<div style="color:red;">Low stock (${p.stock})</div>` : "";
      el.innerHTML += `
        <div class="product-card">
          <strong>${p.name}</strong>
          <div>$${p.price.toFixed(2)}</div>
          <div>In Stock: ${p.stock}</div>
          ${low}
          <input type="number" min="0" max="${p.stock}" id="q-${i}">
        </div>
      `;
    });

    el.innerHTML += `
      </div>
      <button class="primary" onclick="review()">Review Order</button>
    </div>`;
  }

  /* STEP 3 — REVIEW */
  if (state.step === 3) {
    let subtotal = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>
        <p><strong>${state.customer.name}</strong></p>
        <table class="review-table">
          <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
    `;

    state.cart.forEach(i => {
      const line = i.qty * i.price;
      subtotal += line;
      el.innerHTML += `<tr><td>${i.name}</td><td>${i.qty}</td><td>$${line.toFixed(2)}</td></tr>`;
    });

    el.innerHTML += `
        </table>
        <h3>Total: $${subtotal.toFixed(2)}</h3>
        <button onclick="state.step=2;render()">Back</button>
        <button class="primary" onclick="submit()">Submit</button>
      </div>
    `;
  }
}

/**************** ACTIONS ****************/
function review() {
  state.cart = products.map((p, i) => {
    const qty = Number(document.getElementById(`q-${i}`).value || 0);
    if (qty > p.stock) {
      alert(`Cannot order more than ${p.stock} of ${p.name}`);
      throw new Error("Stock exceeded");
    }
    return { ...p, qty };
  }).filter(i => i.qty > 0);

  if (!state.cart.length) return alert("Add products");
  state.step = 3;
  render();
}

async function submit() {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer: state.customer, items: state.cart })
  });

  alert("Order submitted");
  location.reload();
}

/**************** INIT ****************/
loadProducts();
render();
