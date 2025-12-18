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
  return lines.map(line => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || "").trim();
    });
    return obj;
  });
}

/******** LOAD PRODUCTS ********/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();
  products = parseCSV(text).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"])
  }));
  render();
}

/******** SEARCH CUSTOMERS ********/
async function searchCustomers(q) {
  if (q.length < 2) return [];
  const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  return data.results || [];
}

/******** RENDER ********/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card autocomplete">
        <h2>Select Customer</h2>
        <input class="search-box" id="cust"
          placeholder="Start typing store name…"
          oninput="handleSearch(this.value)">
        <div id="results" class="results"></div>
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
          <input type="number" min="0" id="q-${i}" placeholder="Qty">
        </div>
      `;
    });
    el.innerHTML += `
      </div>
      <button onclick="review()">Review Order</button>
    </div>`;
  }

  /* STEP 3 */
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
        <hr>
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
        <button onclick="submit()">Submit Order</button>
      </div>
    `;
  }
}

/******** ACTIONS ********/
async function handleSearch(val) {
  const results = await searchCustomers(val);
  const box = document.getElementById("results");
  box.innerHTML = "";

  results.forEach(c => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.textContent = c.name;
    div.onclick = () => selectCustomer(c);
    box.appendChild(div);
  });
}

function selectCustomer(c) {
  state.customer = c;
  state.step = 2;
  render();
}

function review() {
  state.cart = products
    .map((p, i) => ({
      ...p,
      qty: Number(document.getElementById(`q-${i}`).value || 0)
    }))
    .filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Please select products.");
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

/******** INIT ********/
loadProducts();
render();
