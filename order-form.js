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

/**************** CSV ****************/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const rawHeaders = lines.shift().split(",");

  const headers = rawHeaders.map(h =>
    h.trim().toLowerCase().replace(/\s+/g, "_")
  );

  return lines.map(line => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h] = (values[i] || "").trim());
    return obj;
  });
}

/**************** LOAD PRODUCTS ****************/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();

  products = parseCSV(text).map(p => ({
    name: p.product_name,
    price: Number(p.price),
    stock: Number(p.qty_in_stock)
  }));

  render();
}

/**************** AUTOCOMPLETE ****************/
async function handleAutocomplete(val) {
  const box = document.getElementById("autocomplete-results");
  box.innerHTML = "";
  if (val.length < 2) return;

  const res = await fetch(`${API_URL}?q=${encodeURIComponent(val)}`);
  const data = await res.json();

  data.results.forEach(c => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.textContent = c.name;
    div.onclick = () => selectCustomer(c);
    box.appendChild(div);
  });
}

function selectCustomer(customer) {
  state.customer = customer;
  state.step = 2;
  render();
}

/**************** TOTAL CALC ****************/
function calculateTotals() {
  let subtotal = 0;
  let caseCount = 0;
  let kegDeposit = 0;

  products.forEach((p, i) => {
    const qty = Number(document.getElementById(`q-${i}`)?.value || 0);
    if (qty > 0) {
      subtotal += qty * p.price;
      if (/case/i.test(p.name)) caseCount += qty;
      if (/keg/i.test(p.name)) kegDeposit += qty * 30;
    }
  });

  const discount = caseCount >= 10 ? subtotal * 0.10 : 0;
  const taxable = subtotal - discount;
  const tax =
    state.customer?.businessType === "Restaurant"
      ? taxable * 0.06
      : 0;

  const total = taxable + tax + kegDeposit;

  return { subtotal, discount, tax, kegDeposit, total };
}

function updateLiveTotal() {
  const t = calculateTotals();
  document.getElementById("live-subtotal").textContent =
    `$${t.subtotal.toFixed(2)}`;
  document.getElementById("live-discount").textContent =
    `-$${t.discount.toFixed(2)}`;
  document.getElementById("live-tax").textContent =
    `$${t.tax.toFixed(2)}`;
  document.getElementById("live-keg").textContent =
    `$${t.kegDeposit.toFixed(2)}`;
  document.getElementById("live-total").textContent =
    `$${t.total.toFixed(2)}`;
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
          <input id="customer-input"
                 placeholder="Search customer..."
                 oninput="handleAutocomplete(this.value)">
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;
    return;
  }

  /* STEP 2 — PRODUCT GRID + LIVE TOTAL */
  if (state.step === 2) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h2>Select Products</h2>`;

    const grid = document.createElement("div");
    grid.className = "grid";

    products.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "product-card";
      div.innerHTML = `
        <strong>${p.name}</strong>
        <div>Price: $${p.price.toFixed(2)}</div>
        <div>In Stock: ${p.stock}</div>
        ${p.stock <= 5 ? `<div style="color:red;">Low stock</div>` : ""}
        <input type="number"
               min="0"
               max="${p.stock}"
               id="q-${i}"
               oninput="updateLiveTotal()">
      `;
      grid.appendChild(div);
    });

    card.appendChild(grid);

    card.innerHTML += `
      <div style="margin-top:20px;">
        <div>Subtotal: <strong id="live-subtotal">$0.00</strong></div>
        <div>Discount: <strong id="live-discount">$0.00</strong></div>
        <div>Tax: <strong id="live-tax">$0.00</strong></div>
        <div>Keg Deposit: <strong id="live-keg">$0.00</strong></div>
        <h3>Total: <span id="live-total">$0.00</span></h3>
      </div>
    `;

    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "Review Order";
    btn.onclick = review;

    card.appendChild(btn);
    el.appendChild(card);
    return;
  }

  /* STEP 3 — REVIEW */
  if (state.step === 3) {
    const t = calculateTotals();

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>

        <p>
          <strong>${state.customer.name}</strong><br>
          ${state.customer.address}<br>
          ${state.customer.city}, ${state.customer.state} ${state.customer.zip}
        </p>

        <table class="review-table">
          <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
          ${state.cart.map(i => `
            <tr>
              <td>${i.name}</td>
              <td>${i.qty}</td>
              <td>$${(i.qty * i.price).toFixed(2)}</td>
            </tr>
          `).join("")}
        </table>

        <p>Subtotal: $${t.subtotal.toFixed(2)}</p>
        <p>Discount: -$${t.discount.toFixed(2)}</p>
        <p>Tax: $${t.tax.toFixed(2)}</p>
        <p>Keg Deposit: $${t.kegDeposit.toFixed(2)}</p>

        <h3>Total: $${t.total.toFixed(2)}</h3>

        <button onclick="state.step=2;render()">Back</button>
        <button class="primary" onclick="submit()">Submit Order</button>
      </div>
    `;
  }
}

/**************** ACTIONS ****************/
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

  alert("Order submitted successfully");
  location.reload();
}

/**************** INIT ****************/
loadProducts();
render();
