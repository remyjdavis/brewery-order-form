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

/**************** CSV PARSER ****************/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",").map(h => h.trim());

  return lines.map(line => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h] = (values[i] || "").trim());
    return obj;
  });
}

/**************** LOAD PRODUCTS ****************/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();

  const raw = parseCSV(text);

  products = raw.map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"]),
    stock: Number(p["Qty In Stock"]),
    category: p["Category"] || ""
  }));

  render();
}

/**************** CUSTOMER SEARCH (LOCKED) ****************/
async function searchCustomers(q) {
  if (q.length < 2) return [];
  const r = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const d = await r.json();
  return d.results || [];
}

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 — CUSTOMER */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <div class="autocomplete-wrapper">
          <input id="customer-input" placeholder="Search customer..." oninput="autocomplete(this.value)">
          <div id="autocomplete-results"></div>
        </div>
      </div>`;
  }

  /* STEP 2 — PRODUCTS */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
        <div class="grid">`;

    products.forEach((p, i) => {
      const low = p.stock <= 10;
      el.innerHTML += `
        <div class="product-card">
          <strong>${p.name}</strong>
          <div>$${p.price.toFixed(2)}</div>
          <div>In Stock: ${p.stock}</div>
          ${low ? `<div style="color:red;font-weight:bold">LOW STOCK</div>` : ""}
          <input
            type="number"
            min="0"
            max="${p.stock}"
            id="q-${i}"
            placeholder="Qty"
            oninput="enforceStock(${i})"
          >
        </div>`;
    });

    el.innerHTML += `
        </div>
        <button class="primary" onclick="review()">Review Order</button>
      </div>`;
  }

  /* STEP 3 — REVIEW */
  if (state.step === 3) {
    let subtotal = 0, cases = 0, keg = 0;

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
            <th>Price</th>
            <th>Total</th>
          </tr>`;

    state.cart.forEach(item => {
      const line = item.qty * item.price;
      subtotal += line;

      if (/case/i.test(item.name)) cases += item.qty;
      if (/keg/i.test(item.name)) keg += item.qty * 30;

      el.innerHTML += `
        <tr>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>$${item.price.toFixed(2)}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>`;
    });

    const discount = cases >= 10 ? subtotal * 0.10 : 0;
    const tax = state.customer.businessType === "Restaurant" ? subtotal * 0.06 : 0;
    const total = subtotal - discount + tax + keg;

    el.innerHTML += `
        </table>

        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Discount: -$${discount.toFixed(2)}</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>Keg Deposit: $${keg.toFixed(2)}</p>
        <h3>Total: $${total.toFixed(2)}</h3>

        <button onclick="state.step=2;render()">Back</button>
        <button class="primary" onclick="submitOrder()">Submit</button>
      </div>`;
  }
}

/**************** ACTIONS ****************/
async function autocomplete(val) {
  const results = await searchCustomers(val);
  const box = document.getElementById("autocomplete-results");

  box.innerHTML = results.map(c =>
    `<div class="autocomplete-item" onclick='selectCustomer(${JSON.stringify(c)})'>
      ${c.name}
    </div>`
  ).join("");
}

function selectCustomer(c) {
  state.customer = c;
  state.step = 2;
  render();
}

function enforceStock(i) {
  const input = document.getElementById(`q-${i}`);
  if (Number(input.value) > products[i].stock) {
    input.value = products[i].stock;
  }
}

function review() {
  state.cart = products.map((p, i) => ({
    name: p.name,
    price: p.price,
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
