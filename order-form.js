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

/**************** AUTOCOMPLETE ****************/
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
  }, 250);
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

document.addEventListener("click", function (e) {
  if (e.target.classList.contains("autocomplete-item")) {
    state.customer = autocompleteResults[e.target.dataset.index];
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
        <input class="customer-search"
          placeholder="Search customer..."
          oninput="handleCustomerInput(this.value)">
        <div id="results" class="autocomplete-results"></div>
      </div>
    `;
  }

  /* STEP 2 */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
        <div class="product-grid" id="product-grid"></div>

        <div class="button-row">
          <button class="secondary" onclick="state.step=1;render()">Back</button>
          <button class="primary" onclick="review()">Review Order</button>
        </div>
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

  /* STEP 3 — REVIEW */
  if (state.step === 3) {
    let subtotal = 0, keg = 0;

    el.innerHTML = `
      <div class="card">
        <div class="review-header">
          <div>
            <strong>${state.customer.name}</strong><br>
            <div class="review-address">
              ${state.customer.address}<br>
              ${state.customer.city}, ${state.customer.state} ${state.customer.zip}
            </div>
          </div>
        </div>

        <table class="review-table">
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Line Total</th>
          </tr>
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

    const tax =
      state.customer.businessType === "Restaurant" ? subtotal * 0.06 : 0;

    el.innerHTML += `
        </table>

        <div class="review-totals">
          <div><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
          <div><span>Tax</span><span>$${tax.toFixed(2)}</span></div>
          <div><span>Keg Deposit</span><span>$${keg.toFixed(2)}</span></div>
          <div class="grand"><span>Total</span><span>$${(subtotal + tax + keg).toFixed(2)}</span></div>
        </div>

        <div class="button-row">
          <button class="secondary" onclick="state.step=2;render()">Back</button>
          <button class="primary" onclick="submitOrder()">Submit</button>
        </div>
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
