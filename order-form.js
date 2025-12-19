/**************** CONFIG ****************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

const KEG_DEPOSIT = 30;
const TAX_RATE = 0.06;

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
  const headers = lines.shift().split(",");

  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
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
    stock: Number(p["Qty In Stock"]),
    category: p["Category"] || ""
  }));

  renderProducts();
}

/**************** AUTOCOMPLETE (LOCKED) ****************/
const customerInput = document.getElementById("customer-input");
const resultsBox = document.getElementById("autocomplete-results");

customerInput.addEventListener("input", async () => {
  const q = customerInput.value.trim();
  resultsBox.innerHTML = "";

  if (q.length < 2) return;

  const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const data = await res.json();

  (data.results || []).forEach(cust => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.textContent = cust.name;

    div.addEventListener("mousedown", () => {
      state.customer = cust;
      customerInput.value = cust.name;
      resultsBox.innerHTML = "";
      state.step = 2;
      renderProducts();
    });

    resultsBox.appendChild(div);
  });
});

/**************** PRODUCT PAGE ****************/
function renderProducts() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step !== 2) return;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `<h2>Select Products</h2><div class="grid" id="grid"></div>
    <div id="live-total"><strong>Total: $0.00</strong></div>
    <button class="primary" id="reviewBtn">Review Order</button>`;

  el.appendChild(card);

  const grid = document.getElementById("grid");

  products.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "product-card";

    const lowStock =
      !isNaN(p.stock) && p.stock <= 5
        ? `<div style="color:red;font-size:12px">Low stock</div>`
        : "";

    div.innerHTML = `
      <strong>${p.name}</strong>
      <div>$${p.price.toFixed(2)}</div>
      <div style="font-size:12px">In Stock: ${p.stock}</div>
      ${lowStock}
      <input type="number" min="0" max="${p.stock}" id="q-${i}">
    `;

    grid.appendChild(div);

    div.querySelector("input").addEventListener("input", updateLiveTotal);
  });

  document
    .getElementById("reviewBtn")
    .addEventListener("click", reviewOrder);
}

/**************** LIVE TOTAL ****************/
function updateLiveTotal() {
  let total = 0;

  products.forEach((p, i) => {
    const qty = Number(document.getElementById(`q-${i}`).value || 0);
    total += qty * p.price;
  });

  document.getElementById("live-total").innerHTML =
    `<strong>Total: $${total.toFixed(2)}</strong>`;
}

/**************** REVIEW PAGE ****************/
function reviewOrder() {
  state.cart = [];

  products.forEach((p, i) => {
    const qty = Number(document.getElementById(`q-${i}`).value || 0);
    if (qty > 0) {
      state.cart.push({ ...p, qty });
    }
  });

  if (!state.cart.length) {
    alert("Please add at least one product.");
    return;
  }

  renderReview();
}

function renderReview() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  let subtotal = 0;
  let kegDeposit = 0;
  let cases = 0;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <h2>Review Order</h2>
    <p><strong>${state.customer.name}</strong><br>
    ${state.customer.address}<br>
    ${state.customer.city}, ${state.customer.state} ${state.customer.zip}</p>
    <hr>
    <table class="review-table">
      <tr>
        <th>Product</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </table>
  `;

  const table = card.querySelector("table");

  state.cart.forEach(item => {
    const line = item.qty * item.price;
    subtotal += line;

    if (/keg/i.test(item.name)) kegDeposit += item.qty * KEG_DEPOSIT;
    if (/case/i.test(item.name)) cases += item.qty;

    table.innerHTML += `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${line.toFixed(2)}</td>
      </tr>
    `;
  });

  const discount = cases >= 10 ? subtotal * 0.1 : 0;
  const tax =
    state.customer.businessType === "Restaurant"
      ? subtotal * TAX_RATE
      : 0;

  const total = subtotal - discount + tax + kegDeposit;

  card.innerHTML += `
    <p>Subtotal: $${subtotal.toFixed(2)}</p>
    <p>Discount: -$${discount.toFixed(2)}</p>
    <p>Tax: $${tax.toFixed(2)}</p>
    <p>Keg Deposit: $${kegDeposit.toFixed(2)}</p>
    <h3>Total: $${total.toFixed(2)}</h3>

    <button onclick="renderProducts()">Back</button>
    <button class="primary" onclick="submitOrder()">Submit</button>
  `;

  el.appendChild(card);
}

/**************** SUBMIT ****************/
async function submitOrder() {
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
