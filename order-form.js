/***********************
 * CSV URLS
 ***********************/
const CHECK_CUSTOMERS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=2105303643&single=true&output=csv";

const FINTECH_CUSTOMERS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=799127666&single=true&output=csv";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/***********************
 * DATA STORES
 ***********************/
let customers = { check: [], fintech: [] };
let products = [];

/***********************
 * APP STATE
 ***********************/
let state = {
  step: 1,
  customer: {},
  cart: [],
  error: ""
};

/***********************
 * CSV PARSER
 ***********************/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");

  return lines.map(line => {
    const cols = line.split(",");
    let obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (cols[i] || "").trim();
    });
    return obj;
  });
}

/***********************
 * LOAD CUSTOMERS
 ***********************/
function loadCustomers() {
  fetch(CHECK_CUSTOMERS_CSV)
    .then(r => r.text())
    .then(t => {
      customers.check = parseCSV(t).map(r => ({
        store: r["Check Customer Name"],
        address: r["Address"],
        city: r["City"],
        state: r["State"],
        zip: r["Zip"]
      }));
    });

  fetch(FINTECH_CUSTOMERS_CSV)
    .then(r => r.text())
    .then(t => {
      customers.fintech = parseCSV(t).map(r => ({
        store: r["Fintech Customer Name"],
        address: r["Address"],
        city: r["City"],
        state: r["State"],
        zip: r["Zip"]
      }));
    });
}

/***********************
 * LOAD PRODUCTS
 ***********************/
function loadProducts() {
  fetch(PRODUCT_CSV_URL)
    .then(r => r.text())
    .then(t => {
      products = parseCSV(t).map(p => ({
        name: p["Product Name"],
        price: Number(p["Price"]),
        stock: Number(p["Qty in stock"]),
        category: p["Category"]
      }));
      render();
    });
}

/***********************
 * RENDER UI
 ***********************/
function render() {
  const el = document.getElementById("form-container");
  if (!el) return;
  el.innerHTML = "";

  /** STEP 1 — STORE **/
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Store Information</h2>
        <input id="store" placeholder="Enter Store Name">
        ${state.error ? `<p style="color:red;">${state.error}</p>` : ""}
        <button onclick="validateStore()">Next</button>
      </div>
    `;
  }

  /** STEP 2 — PRODUCTS **/
  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Select Products</h2>`;

    products.forEach((p, i) => {
      el.innerHTML += `
        <div class="product">
          <div>
            <strong>${p.name}</strong><br>
            Price: $${p.price} · In stock: ${p.stock}
          </div>
          <input type="number" min="0" id="q-${i}" placeholder="Qty">
        </div>
      `;
    });

    el.innerHTML += `<button onclick="review()">Review Order</button></div>`;
  }

  /** STEP 3 — REVIEW **/
  if (state.step === 3) {
    let total = 0;
    const c = state.customer;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>
        <p>
          <strong>${c.store}</strong><br>
          ${c.address}<br>
          ${c.city}, ${c.state} ${c.zip}<br>
          <strong>Payment Method:</strong> ${c.payment}
        </p>
    `;

    state.cart.forEach(i => {
      total += i.price * i.qty;
      el.innerHTML += `<p>${i.name} × ${i.qty} = $${i.price * i.qty}</p>`;
    });

    el.innerHTML += `
      <h3>Total: $${total}</h3>
      <button onclick="submitOrder()">Submit Order (Test)</button>
    </div>`;
  }

  /** STEP 4 — CONFIRM **/
  if (state.step === 4) {
    el.innerHTML = `
      <div class="card">
        <h2>Order Submitted</h2>
        <p>This is test mode. No data has been saved.</p>
      </div>
    `;
  }
}

/***********************
 * STORE VALIDATION
 ***********************/
function validateStore() {
  const input = document.getElementById("store").value.trim();

  const check = customers.check.find(
    c => c.store?.toLowerCase() === input.toLowerCase()
  );
  const fintech = customers.fintech.find(
    c => c.store?.toLowerCase() === input.toLowerCase()
  );

  if (check) {
    state.customer = { ...check, payment: "Check" };
  } else if (fintech) {
    state.customer = { ...fintech, payment: "Fintech" };
  } else {
    state.error = "Store not found. Please check spelling.";
    render();
    return;
  }

  state.error = "";
  state.step = 2;
  render();
}

/***********************
 * ORDER FLOW
 ***********************/
function review() {
  state.cart = products
    .map((p, i) => ({
      ...p,
      qty: Number(document.getElementById(`q-${i}`).value)
    }))
    .filter(i => i.qty > 0);

  state.step = 3;
  render();
}

function submitOrder() {
  state.step = 4;
  render();
}

/***********************
 * INIT
 ***********************/
loadCustomers();
loadProducts();
render();
