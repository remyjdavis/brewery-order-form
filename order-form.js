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

/**************** CSV PARSER ****************/
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
    category: p["Category"] || "",
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
        <input
          id="customerSearch"
          placeholder="Start typing customer name..."
          oninput="autocomplete(this.value)"
        />
        <div id="autocomplete-results"></div>
      </div>
    `;
  }

  /* STEP 2 — PRODUCTS (GRID LOCKED) */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
        <div class="product-grid">
          ${products.map((p, i) => {
            let badge = "";
            if (p.inventory === 0) {
              badge = `<span class="badge out">Out of Stock</span>`;
            } else if (p.inventory < LOW_STOCK_THRESHOLD) {
              badge = `<span class="badge low">Low Stock</span>`;
            }

            return `
              <div class="product-card">
                ${badge}
                <strong>${p.name}</strong>
                <div>$${p.price.toFixed(2)}</div>
                <input type="number" min="0" id="q-${i}" placeholder="Qty">
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
    let kegDeposit = 0;
    let caseCount = 0;

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
    `;

    state.cart.forEach(item => {
      const line = item.qty * item.price;
      subtotal += line;

      if (/keg/i.test(item.name)) kegDeposit += item.qty * 30;
      if (/case/i.test(item.name)) caseCount += item.qty;

      el.innerHTML += `
        <tr>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>
      `;
    });

    const discount = caseCount >= 10 ? subtotal * 0.10 : 0;
    const tax =
      state.customer.businessType === "Restaurant" ? subtotal * 0.06 : 0;

    el.innerHTML += `
        </table>

        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Case Discount: -$${discount.toFixed(2)}</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>Keg Deposit: $${kegDeposit.toFixed(2)}</p>

        <h3>Total: $${(subtotal - discount + tax + kegDeposit).toFixed(2)}</h3>

        <div class="agreement">
          <label>
            <input type="checkbox" id="agree">
            I agree that this order is binding and final
          </label>
        </div>

        <div class="button-row">
          <button onclick="state.step=2;render()">Back</button>
          <button class="primary-btn" onclick="submitOrder()">Submit Order</button>
        </div>
      </div>
    `;
  }
}

/**************** AUTOCOMPLETE ****************/
async function autocomplete(val) {
  const results = await searchCustomers(val);
  const box = document.getElementById("autocomplete-results");

  box.innerHTML = results.map(c => `
    <div class="autocomplete-item"
         onclick='selectCustomer(${JSON.stringify(c)})'>
      ${c.name}
    </div>
  `).join("");
}

function selectCustomer(cust) {
  state.customer = cust;
  state.step = 2;
  render();
}

/**************** ACTIONS ****************/
function review() {
  state.cart = products.map((p, i) => ({
    name: p.name,
    price: p.price,
    qty: Number(document.getElementById(`q-${i}`).value || 0)
  })).filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Please add at least one product.");
    return;
  }

  state.step = 3;
  render();
}

async function submitOrder() {
  if (!document.getElementById("agree").checked) {
    alert("You must agree before submitting.");
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

  alert("Order submitted successfully.");
  location.reload();
}

/**************** INIT ****************/
loadProducts();
render();
