/**************** CONFIG ****************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

const LOW_STOCK_THRESHOLD = 10;

/**************** STATE ****************/
let products = [];
let customerResults = [];
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
    inventory: Number(p["Qty In Stock"] || 0)
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

  /* STEP 1 — CUSTOMER */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <input id="customerSearch" placeholder="Start typing customer name">
        <div id="autocomplete-results"></div>
      </div>
    `;

    document
      .getElementById("customerSearch")
      .addEventListener("input", handleAutocomplete);
  }

  /* STEP 2 — PRODUCTS (DESKTOP GRID LOCKED) */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
        <div class="product-grid">
          ${products.map((p, i) => {
            let badge = "";
            if (p.inventory === 0) badge = `<span class="badge out">Out</span>`;
            else if (p.inventory < LOW_STOCK_THRESHOLD)
              badge = `<span class="badge low">Low</span>`;

            return `
              <div class="product-card">
                ${badge}
                <strong>${p.name}</strong>
                <div>$${p.price.toFixed(2)}</div>
                <input type="number" min="0" id="q-${i}">
              </div>
            `;
          }).join("")}
        </div>
        <button class="primary-btn" onclick="review()">Review Order</button>
      </div>
    `;
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

        <label class="agreement">
          <input type="checkbox" id="agree"> I agree this order is binding
        </label>

        <div class="button-row">
          <button onclick="state.step=2;render()">Back</button>
          <button class="primary-btn" onclick="submitOrder()">Submit</button>
        </div>
      </div>
    `;
  }
}

/**************** AUTOCOMPLETE (FIXED) ****************/
async function handleAutocomplete(e) {
  customerResults = await searchCustomers(e.target.value);
  const box = document.getElementById("autocomplete-results");

  box.innerHTML = customerResults
    .map(
      (_, i) =>
        `<div class="autocomplete-item" data-index="${i}">${customerResults[i].name}</div>`
    )
    .join("");

  box.onclick = event => {
    const item = event.target.closest(".autocomplete-item");
    if (!item) return;
    selectCustomer(customerResults[item.dataset.index]);
  };
}

function selectCustomer(customer) {
  state.customer = customer;
  state.step = 2;
  render();
}

/**************** ACTIONS ****************/
function review() {
  state.cart = products
    .map((p, i) => ({
      name: p.name,
      price: p.price,
      qty: Number(document.getElementById(`q-${i}`).value || 0)
    }))
    .filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Add at least one product");
    return;
  }

  state.step = 3;
  render();
}

async function submitOrder() {
  if (!document.getElementById("agree").checked) {
    alert("Agreement required");
    return;
  }

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
