/***********************
 * PRODUCT CATALOG
 ***********************/
const PRODUCTS = [
  { id: "BEER001", name: "Pale Ale – Case (24)", check: 45, fintech: 50 },
  { id: "BEER002", name: "IPA – Case (24)", check: 50, fintech: 55 },
  { id: "BEER003", name: "Lager – Keg (50L)", check: 120, fintech: 130 }
];

/***********************
 * CUSTOMER DATA
 ***********************/
let customers = {
  check: [],
  fintech: []
};

/***********************
 * APP STATE
 ***********************/
let state = {
  step: 1,
  customer: {},
  cart: []
};

/***********************
 * CSV PARSER (Safari Safe)
 ***********************/
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

/***********************
 * LOAD CUSTOMERS (AUTO-SYNC)
 ***********************/
function loadCustomers() {
  // CHECK customers
  fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=2105303643&single=true&output=csv")
    .then(res => res.text())
    .then(text => {
      customers.check = parseCSV(text);
      render();
    });

  // FINTECH customers
  fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=799127666&single=true&output=csv")
    .then(res => res.text())
    .then(text => {
      customers.fintech = parseCSV(text);
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

  /******** STEP 1 — STORE INFO ********/
  if (state.step === 1) {
    const list = state.customer.payment === "fintech"
      ? customers.fintech
      : customers.check;

    el.innerHTML = `
      <div class="card">
        <h2>Store Information</h2>

        <label>Payment Method</label>
        <select id="payment" onchange="changePayment()">
          <option value="check">Check</option>
          <option value="fintech">Fintech</option>
        </select>

        <label>Store</label>
        <select id="store" onchange="fillContact()">
          <option value="">Select Store</option>
          ${list.map(c => `<option value="${c.store}">${c.store}</option>`).join("")}
        </select>

        <input id="contact" placeholder="Contact Name">
        <input id="email" placeholder="Email">

        <button onclick="nextStep()">Next</button>
      </div>
    `;
  }

  /******** STEP 2 — PRODUCTS ********/
  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Select Products</h2>`;

    PRODUCTS.forEach(p => {
      el.innerHTML += `
        <div class="product">
          <span>${p.name}</span>
          <input type="number" min="0" id="q-${p.id}" placeholder="Qty">
        </div>
      `;
    });

    el.innerHTML += `<button onclick="review()">Review Order</button></div>`;
  }

  /******** STEP 3 — REVIEW ********/
  if (state.step === 3) {
    let total = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>

        <p>
          <strong>${state.customer.store}</strong><br>
          ${state.customer.contact}<br>
          ${state.customer.email}<br>
          Payment: ${state.customer.payment}
        </p>
    `;

    state.cart.forEach(i => {
      const price = state.customer.payment === "check" ? i.check : i.fintech;
      total += price * i.qty;
      el.innerHTML += `<p>${i.name} x ${i.qty} = $${price * i.qty}</p>`;
    });

    el.innerHTML += `
        <h3>Total: $${total}</h3>
        <button onclick="submitOrder()">Submit Order (Test)</button>
      </div>
    `;
  }

  /******** STEP 4 — CONFIRM ********/
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
 * EVENT HANDLERS
 ***********************/
function changePayment() {
  state.customer.payment = document.getElementById("payment").value;
  render();
}

function fillContact() {
  const store = document.getElementById("store").value;
  const list = state.customer.payment === "fintech"
    ? customers.fintech
    : customers.check;

  const match = list.find(c => c.store === store);
  if (match) {
    document.getElementById("contact").value = match.contact || "";
    document.getElementById("email").value = match.email || "";
  }
}

function nextStep() {
  state.customer = {
    payment: document.getElementById("payment").value,
    store: document.getElementById("store").value,
    contact: document.getElementById("contact").value,
    email: document.getElementById("email").value
  };
  state.step = 2;
  render();
}

function review() {
  state.cart = PRODUCTS
    .map(p => ({
      ...p,
      qty: Number(document.getElementById(`q-${p.id}`).value)
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
render();
