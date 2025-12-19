/**************** CONFIG ****************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

const LOW_STOCK_THRESHOLD = 10;

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
    stock: Number(p["Qty In Stock"]), // ✅ FIXED HEADER
    category: p["Category"] || ""
  }));

  render();
}

/**************** CUSTOMER SEARCH ****************/
async function searchCustomers(q) {
  if (q.length < 2) return [];
  const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  return data.results || [];
}

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <input id="customer-search" placeholder="Start typing store name..." oninput="autocomplete(this.value)">
        <div id="results" class="autocomplete-box"></div>
      </div>`;
  }

  /* STEP 2 */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
        <div class="product-grid">
          ${products.map((p, i) => `
            <div class="product-card">
              <h4>${p.name}</h4>
              <div>$${p.price.toFixed(2)}</div>
              ${p.stock <= LOW_STOCK_THRESHOLD
                ? `<div class="low-stock">Low stock: ${p.stock}</div>`
                : ""}
              <input type="number" min="0" id="q-${i}" placeholder="Qty">
            </div>
          `).join("")}
        </div>
        <br>
        <button class="primary-btn" onclick="review()">Review Order</button>
      </div>`;
  }

  /* STEP 3 */
  if (state.step === 3) {
    let subtotal = 0;
    let kegDeposit = 0;

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
          </tr>
          ${state.cart.map(i => {
            const line = i.qty * i.price;
            subtotal += line;
            if (/keg/i.test(i.name)) kegDeposit += i.qty * 30;
            return `
              <tr>
                <td>${i.name}</td>
                <td>${i.qty}</td>
                <td>$${i.price.toFixed(2)}</td>
                <td>$${line.toFixed(2)}</td>
              </tr>`;
          }).join("")}
        </table>

        <div class="review-summary">
          <p>Subtotal: $${subtotal.toFixed(2)}</p>
          <p>Keg Deposit: $${kegDeposit.toFixed(2)}</p>
          <h3>Total: $${(subtotal + kegDeposit).toFixed(2)}</h3>
        </div>

        <button onclick="state.step=2;render()">Back</button>
        <button class="primary-btn" onclick="submit()">Submit Order</button>
      </div>`;
  }
}

/**************** ACTIONS ****************/
async function autocomplete(val) {
  const results = await searchCustomers(val);
  const box = document.getElementById("results");
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

function review() {
  state.cart = products.map((p, i) => ({
    ...p,
    qty: Number(document.getElementById(`q-${i}`).value || 0)
  })).filter(i => i.qty > 0);

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
