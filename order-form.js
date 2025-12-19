/*********************************
 * CONFIG
 *********************************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/*********************************
 * STATE
 *********************************/
let products = [];
let customerResults = [];

let state = {
  step: 1,
  customer: null,
  cart: []
};

/*********************************
 * CSV PARSER (SAFE)
 *********************************/
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

/*********************************
 * LOAD PRODUCTS
 *********************************/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();

  const rows = parseCSV(text);

  products = rows.map(r => ({
    name: r["Product Name"],
    price: Number(r["Price"]),
    stock: Number(r["Qty In Stock"]),
    category: r["Category"] || ""
  }));

  render();
}

/*********************************
 * AUTOCOMPLETE
 *********************************/
async function searchCustomers(q) {
  if (q.length < 2) return [];

  const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  return data.results || [];
}

async function handleAutocompleteInput(val) {
  const root = document.getElementById("autocomplete-root");
  root.innerHTML = "";

  if (val.length < 2) return;

  customerResults = await searchCustomers(val);

  if (!customerResults.length) return;

  const wrap = document.createElement("div");
  wrap.className = "autocomplete-wrapper";

  customerResults.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.dataset.index = i;
    div.textContent = c.name;
    wrap.appendChild(div);
  });

  root.appendChild(wrap);
}

/*********************************
 * SAFARI-SAFE CUSTOMER SELECT
 *********************************/
function selectCustomer(index) {
  state.customer = customerResults[index];
  document.getElementById("autocomplete-root").innerHTML = "";
  state.step = 2;
  render();
}

document.addEventListener("mousedown", handleAutoSelect, true);
document.addEventListener("touchstart", handleAutoSelect, true);

function handleAutoSelect(e) {
  const item = e.target.closest(".autocomplete-item");
  if (!item) return;

  e.preventDefault();
  e.stopPropagation();

  const index = Number(item.dataset.index);
  selectCustomer(index);
}

/*********************************
 * RENDER
 *********************************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 — CUSTOMER */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <input
          id="customer-input"
          placeholder="Start typing customer name..."
          oninput="handleAutocompleteInput(this.value)"
        >
      </div>
    `;
  }

  /* STEP 2 — PRODUCTS */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Products</h2>
        <div class="grid">
          ${products.map((p, i) => `
            <div class="product-card">
              <strong>${p.name}</strong>
              <div>$${p.price.toFixed(2)}</div>
              <div>In Stock: ${p.stock}</div>
              <input
                type="number"
                min="0"
                max="${p.stock}"
                data-index="${i}"
                placeholder="Qty"
                onchange="updateCart(this)"
              >
            </div>
          `).join("")}
        </div>
        <button class="primary" onclick="goReview()">Review Order</button>
      </div>
    `;
  }

  /* STEP 3 — REVIEW */
  if (state.step === 3) {
    let subtotal = 0;
    let kegDeposit = 0;
    let caseCount = 0;

    state.cart.forEach(i => {
      subtotal += i.qty * i.price;
      if (/keg/i.test(i.name)) kegDeposit += i.qty * 30;
      if (/case/i.test(i.name)) caseCount += i.qty;
    });

    const discount = caseCount >= 10 ? subtotal * 0.10 : 0;
    const tax =
      state.customer.businessType === "Restaurant"
        ? subtotal * 0.06
        : 0;

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
          ${state.cart.map(i => `
            <tr>
              <td>${i.name}</td>
              <td>${i.qty}</td>
              <td>$${(i.qty * i.price).toFixed(2)}</td>
            </tr>
          `).join("")}
        </table>

        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Discount: -$${discount.toFixed(2)}</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>Keg Deposit: $${kegDeposit.toFixed(2)}</p>

        <h3>Total: $${(subtotal - discount + tax + kegDeposit).toFixed(2)}</h3>

        <button onclick="state.step=2;render()">Back</button>
        <button class="primary" onclick="submitOrder()">Submit Order</button>
      </div>
    `;
  }
}

/*********************************
 * CART
 *********************************/
function updateCart(input) {
  const idx = Number(input.dataset.index);
  const qty = Number(input.value || 0);
  const p = products[idx];

  state.cart = state.cart.filter(i => i.name !== p.name);

  if (qty > 0) {
    state.cart.push({
      name: p.name,
      qty,
      price: p.price
    });
  }
}

function goReview() {
  if (!state.cart.length) {
    alert("Please add at least one product.");
    return;
  }
  state.step = 3;
  render();
}

/*********************************
 * SUBMIT
 *********************************/
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

/*********************************
 * INIT
 *********************************/
loadProducts();
render();
