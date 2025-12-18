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
let autocompleteOpen = false;

/**************** CSV ****************/
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
    price: Number(p["Price"])
  }));

  render();
}

/**************** AUTOCOMPLETE ****************/
async function autocomplete(val) {
  const box = document.getElementById("results");
  box.innerHTML = "";
  autocompleteOpen = false;

  if (val.length < 2) return;

  const res = await fetch(`${API_URL}?q=${encodeURIComponent(val)}`);
  const data = await res.json();

  if (!data.results || !data.results.length) return;

  autocompleteResults = data.results;
  autocompleteOpen = true;

  data.results.forEach((cust, index) => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    item.textContent = cust.name;

    // SAFARI FIX: mousedown fires before blur/render
    item.addEventListener("mousedown", function (e) {
      e.preventDefault();
      selectCustomer(index);
    });

    box.appendChild(item);
  });
}

/**************** SELECT CUSTOMER ****************/
function selectCustomer(index) {
  state.customer = autocompleteResults[index];
  autocompleteResults = [];
  autocompleteOpen = false;
  state.step = 2;
  render();
}

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /******** STEP 1 ********/
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card" style="position:relative">
        <h2>Select Customer</h2>
        <input
          id="cust"
          placeholder="Search customer..."
          autocomplete="off"
        />
        <div id="results" class="autocomplete-box"></div>
      </div>
    `;

    document
      .getElementById("cust")
      .addEventListener("input", e => autocomplete(e.target.value));
  }

  /******** STEP 2 ********/
  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Products</h2>`;

    products.forEach((p, i) => {
      el.innerHTML += `
        <div class="product-line">
          ${p.name} ($${p.price.toFixed(2)})
          <input type="number" min="0" id="q-${i}">
        </div>
      `;
    });

    el.innerHTML += `
      <button onclick="review()">Review Order</button>
    </div>`;
  }

  /******** STEP 3 ********/
  if (state.step === 3) {
    let subtotal = 0;
    let kegDeposit = 0;
    let cases = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>
        <p>
          <strong>${state.customer.name}</strong><br>
          ${state.customer.address}<br>
          ${state.customer.city}, ${state.customer.state} ${state.customer.zip}<br>
          <em>${state.customer.businessType}</em>
        </p>
        <hr>
        <table>
          <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
    `;

    state.cart.forEach(item => {
      const line = item.qty * item.price;
      subtotal += line;

      if (/keg/i.test(item.name)) kegDeposit += item.qty * 30;
      if (/case/i.test(item.name)) cases += item.qty;

      el.innerHTML += `
        <tr>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>
      `;
    });

    const discount = cases >= 10 ? subtotal * 0.1 : 0;
    const tax =
      state.customer.businessType === "Restaurant"
        ? subtotal * 0.06
        : 0;

    const total = subtotal - discount + tax + kegDeposit;

    el.innerHTML += `
        </table>
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Discount: -$${discount.toFixed(2)}</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>Keg Deposit: $${kegDeposit.toFixed(2)}</p>
        <h3>Total: $${total.toFixed(2)}</h3>

        <label>
          <input type="checkbox" id="agree"> I confirm this order is binding
        </label><br><br>

        <button onclick="submitOrder()">Submit Order</button>
      </div>
    `;
  }

  /******** STEP 4 ********/
  if (state.step === 4) {
    el.innerHTML = `
      <div class="card">
        <h2>Order Submitted</h2>
        <p>Thank you — your order has been received.</p>
      </div>
    `;
  }
}

/**************** ACTIONS ****************/
function review() {
  state.cart = products
    .map((p, i) => ({
      name: p.name,
      price: p.price,
      qty: Number(document.getElementById(`q-${i}`).value || 0)
    }))
    .filter(i => i.qty > 0);

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

  state.step = 4;
  render();
}

/**************** INIT ****************/
loadProducts();
render();
