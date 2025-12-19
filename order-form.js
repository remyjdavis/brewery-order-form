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
  if (query.length < 2) return [];
  const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.results || [];
}

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /******** STEP 1 — CUSTOMER ********/
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>

        <div class="autocomplete-wrapper">
          <input
            id="customer-input"
            type="text"
            placeholder="Start typing customer name..."
            autocomplete="off"
          />
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;

    const input = document.getElementById("customer-input");
    const resultsBox = document.getElementById("autocomplete-results");

    input.addEventListener("input", async e => {
      const val = e.target.value;
      resultsBox.innerHTML = "";

      const results = await searchCustomers(val);
      results.forEach(c => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.textContent = c.name;
        div.onclick = () => {
          state.customer = c;
          state.step = 2;
          render();
        };
        resultsBox.appendChild(div);
      });
    });
  }

  /******** STEP 2 — PRODUCTS (GRID LOCKED) ********/
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>

        <div class="grid" id="product-grid"></div>

        <button class="primary" onclick="review()">Review Order</button>
      </div>
    `;

    const grid = document.getElementById("product-grid");

    products.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "product-card";

      const lowStock =
        p.stock > 0 && p.stock <= 10
          ? `<div style="color:red;font-size:12px;">Low stock (${p.stock})</div>`
          : "";

      div.innerHTML = `
        <strong>${p.name}</strong>
        <div>$${p.price.toFixed(2)}</div>
        ${lowStock}
        <input type="number" min="0" id="q-${i}" />
      `;
      grid.appendChild(div);
    });
  }

  /******** STEP 3 — REVIEW ********/
  if (state.step === 3) {
    let subtotal = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>

        <p>
          <strong>${state.customer.name}</strong><br>
          ${state.customer.address}<br>
          ${state.customer.city}, ${state.customer.state} ${state.customer.zip}
        </p>

        <table class="review-table">
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </table>

        <button onclick="state.step=2;render()">Back</button>
        <button class="primary" onclick="submit()">Submit</button>
      </div>
    `;

    const table = el.querySelector(".review-table");

    state.cart.forEach(item => {
      const line = item.qty * item.price;
      subtotal += line;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>$${line.toFixed(2)}</td>
      `;
      table.appendChild(tr);
    });
  }
}

/**************** ACTIONS ****************/
function review() {
  state.cart = products
    .map((p, i) => ({
      ...p,
      qty: Number(document.getElementById(`q-${i}`).value || 0)
    }))
    .filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Please add at least one product.");
    return;
  }

  state.step = 3;
  render();
}

async function submit() {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: state.customer,
      items: state.cart
    })
  });

  alert("Order submitted successfully.");
  location.reload();
}

/**************** INIT ****************/
loadProducts();
render();
