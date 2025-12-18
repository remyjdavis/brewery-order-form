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
  cart: [],
  error: ""
};

/***********************
 * CSV PARSER
 ***********************/
function parseCSV(text, nameHeader) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");

  const nameIndex = headers.findIndex(
    h => h.trim() === nameHeader
  );

  if (nameIndex === -1) return [];

  return lines
    .map(line => {
      const cols = line.split(",");
      return {
        store: (cols[nameIndex] || "").trim()
      };
    })
    .filter(r => r.store);
}

/***********************
 * LOAD CUSTOMERS (AUTO-SYNC)
 ***********************/
function loadCustomers() {
  fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=2105303643&single=true&output=csv")
    .then(res => res.text())
    .then(text => {
      customers.check = parseCSV(text, "Check Customer Name");
    });

  fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=799127666&single=true&output=csv")
    .then(res => res.text())
    .then(text => {
      customers.fintech = parseCSV(text, "Fintech Customer Name");
    });
}

/***********************
 * RENDER UI
 ***********************/
function render() {
  const el = document.getElementById("form-container");
  if (!el) return;
  el.innerHTML = "";

  /******** STEP 1 — STORE IDENTIFICATION ********/
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Store Information</h2>

        <input
          id="store"
          placeholder="Enter Store Name"
        />

        ${state.error ? `<p style="color:red;">${state.error}</p>` : ""}

        <button onclick="validateStore()">Next</button>
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
          Payment Method: ${state.customer.payment}
        </p>
    `;

    state.cart.forEach(i => {
      const price =
        state.customer.payment === "check" ? i.check : i.fintech;
      total += price * i.qty;
      el.innerHTML += `<p>${i.name} × ${i.qty} = $${price * i.qty}</p>`;
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
 * STORE VALIDATION
 ***********************/
function validateStore() {
  const input = document.getElementById("store").value.trim();

  if (!input) {
    state.error = "Please enter your store name.";
    render();
    return;
  }

  const checkMatch = customers.check.find(
    c => c.store.toLowerCase() === input.toLowerCase()
  );

  const fintechMatch = customers.fintech.find(
    c => c.store.toLowerCase() === input.toLowerCase()
  );

  if (checkMatch) {
    state.customer = {
      store: checkMatch.store,
      payment: "check"
    };
  } else if (fintechMatch) {
    state.customer = {
      store: fintechMatch.store,
      payment: "fintech"
    };
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
