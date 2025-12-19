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

/**************** CSV PARSER (LOCKED / BOM SAFE) ****************/
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);

  const rawHeaders = lines.shift().split(",");
  const headers = rawHeaders.map(h =>
    h.replace(/\uFEFF/g, "").replace(/\s+/g, " ").trim()
  );

  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || "").trim();
    });
    return obj;
  });
}

/**************** LOAD PRODUCTS ****************/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const csv = await res.text();

  const rows = parseCSV(csv);

  products = rows.map(r => ({
    name: r["Product Name"],          // COLUMN A
    price: Number(r["Price"] || 0),
    stock: Number(r["Qty In Stock"] || 0),
    category: r["Category"] || ""
  }));

  console.log("PRODUCTS LOADED:", products);
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
        <div class="autocomplete-wrapper">
          <input id="customer-input" placeholder="Start typing customer name…" autocomplete="off">
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;

    const input = document.getElementById("customer-input");
    input.addEventListener("input", async () => {
      const results = await searchCustomers(input.value);
      const box = document.getElementById("autocomplete-results");

      box.innerHTML = results.map(c => `
        <div class="autocomplete-item"
          data-name="${c.name}"
          data-address="${c.address}"
          data-city="${c.city}"
          data-state="${c.state}"
          data-zip="${c.zip}"
          data-type="${c.businessType}">
          ${c.name}
        </div>
      `).join("");

      [...box.children].forEach(item => {
        item.onclick = () => {
          state.customer = {
            name: item.dataset.name,
            address: item.dataset.address,
            city: item.dataset.city,
            state: item.dataset.state,
            zip: item.dataset.zip,
            businessType: item.dataset.type
          };
          state.step = 2;
          render();
        };
      });
    });
  }

  /* STEP 2 — PRODUCTS (GRID — LOCKED) */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
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
                id="qty-${i}"
                placeholder="Qty">
            </div>
          `).join("")}
        </div>
        <button class="primary" onclick="review()">Review Order</button>
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

        <hr>

        <table class="review-table">
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
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
          <td>$${item.price.toFixed(2)}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>
      `;
    });

    const discount = caseCount >= 10 ? subtotal * 0.10 : 0;
    const tax =
      state.customer.businessType === "Restaurant" ? subtotal * 0.06 : 0;

    const total = subtotal - discount + tax + kegDeposit;

    el.innerHTML += `
        </table>

        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Discount: -$${discount.toFixed(2)}</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>Keg Deposit: $${kegDeposit.toFixed(2)}</p>
        <h3>Total: $${total.toFixed(2)}</h3>

        <button onclick="state.step=2;render()">Back</button>
        <button class="primary" onclick="submitOrder()">Submit Order</button>
      </div>
    `;
  }
}

/**************** ACTIONS ****************/
function review() {
  state.cart = products.map((p, i) => {
    const qty = Number(document.getElementById(`qty-${i}`).value || 0);
    if (qty > p.stock) {
      alert(`Not enough stock for ${p.name}`);
      throw new Error("Stock exceeded");
    }
    return { ...p, qty };
  }).filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Please select at least one product.");
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

  alert("Order submitted successfully.");
  location.reload();
}

/**************** INIT ****************/
loadProducts();
render();
