/******** CONFIG ********/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?output=csv";

/******** STATE ********/
let products = [];
let state = {
  step: 1,
  customer: null,
  cart: [],
  salesRepOverride: "",
  email: ""
};

/******** CSV ********/
function parseCSV(t) {
  const lines = t.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(r => {
    const v = r.split(",");
    let o = {};
    headers.forEach((h, i) => o[h.trim()] = (v[i] || "").trim());
    return o;
  });
}

/******** LOAD PRODUCTS ********/
async function loadProducts() {
  const t = await (await fetch(PRODUCT_CSV_URL)).text();
  products = parseCSV(t).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"]),
    inventory: Number(p["Inventory"] || 0) // hidden logic
  }));
  render();
}

/******** AUTOCOMPLETE ********/
async function searchCustomers(q) {
  if (q.length < 2) return [];
  const r = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const d = await r.json();
  return d.results || [];
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
        <input id="cust" placeholder="Search customer..." oninput="autocomplete(this.value)">
        <div id="results"></div>
      </div>`;
  }

  /* STEP 2 — GRID LOCKED */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Products</h2>
        <div class="product-grid" id="product-grid"></div>
        <button onclick="review()">Review Order</button>
      </div>
    `;

    const grid = document.getElementById("product-grid");

    products.forEach((p, i) => {
      const d = document.createElement("div");
      d.className = "product-card";

      let warning = "";
      if (p.inventory && p.inventory < 10) {
        warning = `<div class="low-stock">Low Stock</div>`;
      }

      d.innerHTML = `
        <strong>${p.name}</strong><br>
        $${p.price.toFixed(2)}
        ${warning}
        <input type="number" min="0" id="q-${i}" placeholder="Qty">
      `;
      grid.appendChild(d);
    });
  }

  /* STEP 3 */
  if (state.step === 3) {
    let subtotal = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review</h2>
        <p><strong>${state.customer.name}</strong></p>

        <table>
          <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
          ${state.cart.map(i => {
            const t = i.qty * i.price;
            subtotal += t;
            return `<tr><td>${i.name}</td><td>${i.qty}</td><td>$${t.toFixed(2)}</td></tr>`;
          }).join("")}
        </table>

        <h3>Total: $${subtotal.toFixed(2)}</h3>

        <label><input type="checkbox" id="agree"> I agree to the terms</label>

        <br>
        <button onclick="state.step=2;render()">Back</button>
        <button onclick="submitOrder('print')">Print</button>
        <button onclick="submitOrder('email')">Email</button>
      </div>
    `;
  }
}

/******** ACTIONS ********/
async function autocomplete(val) {
  const r = await searchCustomers(val);
  const box = document.getElementById("results");
  box.innerHTML = r.map(c =>
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

  if (!state.cart.length) return alert("Add products");
  state.step = 3;
  render();
}

async function submitOrder(type) {
  if (!document.getElementById("agree").checked) {
    alert("You must agree first");
    return;
  }

  if (type === "email" && !state.customer.email) {
    state.customer.email = prompt("Enter email address");
    if (!state.customer.email) return;
  }

  if (type === "print") {
    window.print();
  }

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state)
  });

  alert("Order submitted");
  location.reload();
}

/******** INIT ********/
loadProducts();
render();
