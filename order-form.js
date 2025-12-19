/**************** CONFIG ****************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?output=csv";

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
    stock: Number(p["Qty In Stock"])
  }));

  render();
}

/**************** AUTOCOMPLETE ****************/
async function searchCustomers(q) {
  if (q.length < 2) return [];
  const r = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const d = await r.json();
  return d.results || [];
}

async function autocomplete(val) {
  const results = await searchCustomers(val);
  document.getElementById("autocomplete-results").innerHTML =
    results.map(c => `
      <div class="autocomplete-item"
        onclick='selectCustomer(${JSON.stringify(c)})'>
        <strong>${c.name}</strong><br>
        ${c.city}, ${c.state}
      </div>`).join("");
}

function selectCustomer(c) {
  state.customer = c;
  state.step = 2;
  render();
}

/**************** TOTALS (AUTHORITATIVE) ****************/
function calculateTotals(cart) {
  let subtotal = 0;
  let kegDeposit = 0;
  let caseCount = 0;

  cart.forEach(i => {
    subtotal += i.qty * i.price;
    if (/keg/i.test(i.name)) kegDeposit += i.qty * 30;
    if (/case/i.test(i.name)) caseCount += i.qty;
  });

  const discount = caseCount >= 10 ? subtotal * 0.1 : 0;
  const tax =
    state.customer.businessType === "Restaurant"
      ? subtotal * 0.06
      : 0;

  return {
    subtotal,
    discount,
    tax,
    kegDeposit,
    total: subtotal - discount + tax + kegDeposit
  };
}

/**************** LIVE TOTALS ****************/
function updateLiveTotals() {
  state.cart = [];

  products.forEach((p, i) => {
    const qty = Number(document.getElementById(`q-${i}`).value || 0);
    if (qty > 0) state.cart.push({ ...p, qty });
  });

  const t = calculateTotals(state.cart);

  document.getElementById("live-subtotal").innerText = t.subtotal.toFixed(2);
  document.getElementById("live-discount").innerText = t.discount.toFixed(2);
  document.getElementById("live-tax").innerText = t.tax.toFixed(2);
  document.getElementById("live-keg").innerText = t.kegDeposit.toFixed(2);
  document.getElementById("live-total").innerText = t.total.toFixed(2);
}

/**************** REVIEW ****************/
function review() {
  state.cart = [];

  products.forEach((p, i) => {
    const qty = Number(document.getElementById(`q-${i}`).value || 0);
    if (qty > 0) {
      if (qty > p.stock) {
        alert(`Only ${p.stock} available for ${p.name}`);
        return;
      }
      state.cart.push({ name: p.name, price: p.price, qty });
    }
  });

  if (!state.cart.length) {
    alert("Add items");
    return;
  }

  state.step = 3;
  render();
}

/**************** SUBMIT ****************/
async function submit() {
  const totals = calculateTotals(state.cart);

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: state.customer,
      items: state.cart,
      totals
    })
  });

  alert("Order submitted");
  location.reload();
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
        <div class="autocomplete-wrapper">
          <input id="customer-input" oninput="autocomplete(this.value)">
          <div id="autocomplete-results"></div>
        </div>
      </div>`;
  }

  /* STEP 2 */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Products</h2>
        <div class="grid">
          ${products.map((p, i) => `
            <div class="product-card">
              <strong>${p.name}</strong>
              $${p.price.toFixed(2)}<br>
              In Stock: ${p.stock}
              <input type="number" min="0" id="q-${i}"
                oninput="updateLiveTotals()">
            </div>`).join("")}
        </div>

        <hr>
        <p>Subtotal: $<span id="live-subtotal">0.00</span></p>
        <p>Discount: $<span id="live-discount">0.00</span></p>
        <p>Tax: $<span id="live-tax">0.00</span></p>
        <p>Keg Deposit: $<span id="live-keg">0.00</span></p>
        <h3>Total: $<span id="live-total">0.00</span></h3>

        <button class="primary" onclick="review()">Review Order</button>
      </div>`;
  }

  /* STEP 3 — FIXED */
  if (state.step === 3) {
    const t = calculateTotals(state.cart);

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>

        <table class="review-table">
          <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
          ${state.cart.map(i => `
            <tr>
              <td>${i.name}</td>
              <td>${i.qty}</td>
              <td>$${i.price.toFixed(2)}</td>
              <td>$${(i.qty * i.price).toFixed(2)}</td>
            </tr>`).join("")}
        </table>

        <p>Subtotal: $${t.subtotal.toFixed(2)}</p>
        <p>Discount: -$${t.discount.toFixed(2)}</p>
        <p>Tax: $${t.tax.toFixed(2)}</p>
        <p>Keg Deposit: $${t.kegDeposit.toFixed(2)}</p>
        <h3>Total: $${t.total.toFixed(2)}</h3>

        <button onclick="state.step=2;render()">Back</button>
        <button class="primary" onclick="submit()">Submit</button>
      </div>`;
  }
}

/**************** INIT ****************/
loadProducts();
render();
