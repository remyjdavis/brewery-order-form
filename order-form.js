/**************** CONFIG ****************/
const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

const TAX_LOOKUP_URL =
  "https://script.google.com/macros/s/AKfycbyQHrLh-nSx4LKu1hDASswlnWz3jFj4_OpJh0bmc4uppA6Z9QYHk3-g9BOvmpvz3_cU/exec";

/**************** STATE ****************/
let products = [];
let state = {
  step: 1,
  store: "",
  cart: [],
  taxRate: 0,
  businessType: ""
};

/**************** CSV ****************/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(l => {
    const obj = {};
    l.split(",").forEach((v, i) => obj[headers[i]] = v);
    return obj;
  });
}

/**************** LOAD PRODUCTS ****************/
fetch(PRODUCT_CSV_URL)
  .then(r => r.text())
  .then(t => {
    products = parseCSV(t).map(p => ({
      name: p["Product Name"],
      price: Number(p["Price"]),
      category: p["Category"]
    }));
    render();
  });

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Create Order</h2>
        <input id="store" placeholder="Enter Store Name">
        <button onclick="next()">Continue</button>
      </div>
    `;
  }

  /* STEP 2 */
  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Select Products</h2><div class="grid">`;

    products.forEach((p, i) => {
      el.innerHTML += `
        <div class="product-card">
          <strong>${p.name}</strong>
          $${p.price.toFixed(2)}
          <input class="qty" type="number" min="0" id="q-${i}" placeholder="Qty">
        </div>
      `;
    });

    el.innerHTML += `
      </div>
      <button onclick="review()">Review Order</button>
      </div>
    `;
  }

  /* STEP 3 */
  if (state.step === 3) {
    let subtotal = 0, kegDeposit = 0, caseCount = 0;

    el.innerHTML = `<div class="card"><h2>Review Order</h2>`;
    el.innerHTML += `<p><strong>${state.store}</strong></p><hr>`;

    el.innerHTML += `
      <table class="review-table">
        <tr>
          <th>Product</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
    `;

    state.cart.forEach(i => {
      const line = i.qty * i.price;
      subtotal += line;

      if (/case/i.test(i.name)) caseCount += i.qty;
      if (/keg/i.test(i.name)) kegDeposit += i.qty * 30;

      el.innerHTML += `
        <tr>
          <td>${i.name.replace(/ –.*/, "")}</td>
          <td>${i.name}</td>
          <td>${i.qty}</td>
          <td>$${i.price.toFixed(2)}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>
      `;
    });

    let discount = caseCount >= 10 ? subtotal * 0.1 : 0;
    let tax = (subtotal - discount) * state.taxRate;
    let total = subtotal - discount + tax + kegDeposit;

    el.innerHTML += `</table>
      <div class="review-summary">
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Case Discount: -$${discount.toFixed(2)}</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>Keg Deposit: $${kegDeposit.toFixed(2)}</p>
        <h3>Total: $${total.toFixed(2)}</h3>
      </div>

      <button class="secondary" onclick="back()">Edit Order</button>
      <button onclick="printOrder()">Print Order</button>
    </div>`;
  }
}

/**************** ACTIONS ****************/
function next() {
  state.store = document.getElementById("store").value.trim();
  state.step = 2;
  render();
}

async function review() {
  state.cart = products
    .map((p, i) => ({
      ...p,
      qty: Number(document.getElementById(`q-${i}`).value)
    }))
    .filter(i => i.qty > 0);

  const res = await fetch(`${TAX_LOOKUP_URL}?name=${encodeURIComponent(state.store)}`);
  const data = await res.json();

  if (data.found && data.customer.businessType === "Restaurant") {
    state.taxRate = 0.06;
  }

  state.step = 3;
  render();
}

function back() {
  state.step = 2;
  render();
}

function printOrder() {
  window.print();
}
