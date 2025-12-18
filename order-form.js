/**************** CONFIG ****************/
const TAX_LOOKUP_URL =
  "https://script.google.com/macros/s/AKfycbyQHrLh-nSx4LKu1hDASswlnWz3jFj4_OpJh0bmc4uppA6Z9QYHk3-g9BOvmpvz3_cU/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/**************** STATE ****************/
let products = [];
let state = {
  step: 1,
  customer: {},
  cart: [],
  taxRate: 0,
  businessType: ""
};

/**************** CSV ****************/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(l => {
    const v = l.split(",");
    let o = {};
    headers.forEach((h, i) => o[h.trim()] = (v[i] || "").trim());
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
    category: p["Category"] || ""
  }));
  render();
}

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Store Information</h2>
        <input id="store" placeholder="Enter Store Name">
        <button onclick="nextStep()">Next</button>
      </div>
    `;
  }

  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Select Products</h2><div class="grid">`;
    products.forEach((p, i) => {
      el.innerHTML += `
        <div class="product-card">
          <strong>${p.name}</strong><br>
          $${p.price.toFixed(2)}
          <input type="number" min="0" id="q-${i}" placeholder="Qty">
        </div>
      `;
    });
    el.innerHTML += `
      </div>
      <button onclick="review()">Review Order</button>
    </div>`;
  }

  if (state.step === 3) {
    let subtotal = 0, keg = 0, cases = 0;

    el.innerHTML = `<div class="card"><h2>Review Order</h2><table class="review-table">
      <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>`;

    state.cart.forEach((i, idx) => {
      const line = i.qty * i.price;
      subtotal += line;
      if (/keg/i.test(i.name)) keg += i.qty * 30;
      if (/case/i.test(i.name)) cases += i.qty;

      el.innerHTML += `
        <tr>
          <td>${i.name}</td>
          <td><input type="number" value="${i.qty}" onchange="updateQty(${idx},this.value)"></td>
          <td>$${i.price.toFixed(2)}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>`;
    });

    const discount = cases >= 10 ? subtotal * 0.10 : 0;
    const tax = subtotal * state.taxRate;
    const total = subtotal - discount + tax + keg;

    el.innerHTML += `</table>
      <p>Subtotal: $${subtotal.toFixed(2)}</p>
      <p>Discount: -$${discount.toFixed(2)}</p>
      <p>Tax: $${tax.toFixed(2)}</p>
      <p>Keg Deposit: $${keg.toFixed(2)}</p>
      <h3>Total: $${total.toFixed(2)}</h3>

      <div class="agreement">
        <input type="checkbox" id="agree"> I confirm this order is binding
      </div>

      <button onclick="submitOrder()">Submit Order</button>
    </div>`;
  }

  if (state.step === 4) {
    el.innerHTML = `
      <div class="card">
        <h2>Order Submitted</h2>
        <p>Thank you! A confirmation email has been sent.</p>
      </div>
    `;
  }
}

/**************** ACTIONS ****************/
function nextStep() {
  state.customer.store = document.getElementById("store").value.trim();
  state.step = 2;
  render();
}

async function review() {
  state.cart = products.map((p, i) => ({
    ...p,
    qty: Number(document.getElementById(`q-${i}`).value || 0)
  })).filter(i => i.qty > 0);

  const res = await fetch(TAX_LOOKUP_URL + "?name=" + encodeURIComponent(state.customer.store));
  const data = await res.json();
  if (data.found && data.customer.businessType === "Restaurant") {
    state.taxRate = 0.06;
  }

  state.step = 3;
  render();
}

function updateQty(i, val) {
  state.cart[i].qty = Number(val);
  render();
}

function submitOrder() {
  if (!document.getElementById("agree").checked) {
    alert("You must agree before submitting.");
    return;
  }
  state.step = 4;
  render();
}

/**************** INIT ****************/
loadProducts();
render();
