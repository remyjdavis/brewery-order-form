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

let autocompleteResults = [];

/**************** CSV ****************/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(l => {
    const v = l.split(",");
    let o = {};
    headers.forEach((h, i) => (o[h.trim()] = (v[i] || "").trim()));
    return o;
  });
}

/**************** LOAD PRODUCTS ****************/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();
  products = parseCSV(text).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"]),
    inventory: Number(p["Qty in stock"] || 0)
  }));
  render();
}

/**************** AUTOCOMPLETE (SAFE) ****************/
let searchTimer = null;

function handleCustomerInput(val) {
  clearTimeout(searchTimer);
  if (val.length < 2) {
    document.getElementById("results").innerHTML = "";
    return;
  }

  searchTimer = setTimeout(async () => {
    const res = await fetch(`${API_URL}?q=${encodeURIComponent(val)}`);
    const data = await res.json();
    autocompleteResults = data.results || [];
    drawAutocomplete();
  }, 300);
}

function drawAutocomplete() {
  const box = document.getElementById("results");
  box.innerHTML = "";

  autocompleteResults.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.textContent = c.name;
    div.dataset.index = i;
    box.appendChild(div);
  });
}

/* CLICK HANDLER — EVENT DELEGATION (SAFARI SAFE) */
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("autocomplete-item")) {
    const idx = e.target.dataset.index;
    state.customer = autocompleteResults[idx];
    state.step = 2;
    render();
  }
});

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <input
          class="customer-search"
          placeholder="Search customer..."
          oninput="handleCustomerInput(this.value)"
        >
        <div id="results" class="autocomplete-results"></div>
      </div>
    `;
  }

  /* STEP 2 — GRID (UNTOUCHED) */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
        <div class="product-grid" id="product-grid"></div>
        <button onclick="review()">Review Order</button>
      </div>
    `;

    const grid = document.getElementById("product-grid");

    products.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "product-card";

      card.innerHTML = `
        <strong>${p.name}</strong><br>
        $${p.price.toFixed(2)}
        ${p.inventory < 10 ? `<div class="low-stock">Low Stock</div>` : ""}
        <input type="number" min="0" id="q-${i}" placeholder="Qty">
      `;

      grid.appendChild(card);
    });
  }

  /* STEP 3 */
  if (state.step === 3) {
    let subtotal = 0, keg = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>
        <p><strong>${state.customer.name}</strong><br>
        ${state.customer.address}, ${state.customer.city}, ${state.customer.state} ${state.customer.zip}</p>

        <table class="review-table">
          <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
    `;

    state.cart.forEach(i => {
      const line = i.qty * i.price;
      subtotal += line;
      if (/keg/i.test(i.name)) keg += i.qty * 30;

      el.innerHTML += `
        <tr>
          <td>${i.name}</td>
          <td>${i.qty}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>
      `;
    });

    const tax = state.customer.businessType === "Restaurant" ? subtotal * 0.06 : 0;

    el.innerHTML += `
        </table>
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>Keg Deposit: $${keg.toFixed(2)}</p>
        <h3>Total: $${(subtotal + tax + keg).toFixed(2)}</h3>

        <button onclick="state.step=2;render()">Back</button>
        <button onclick="submitOrder()">Submit</button>
      </div>
    `;
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
    alert("Please add items.");
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
