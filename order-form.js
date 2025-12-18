/***********************
 * CONFIG
 ***********************/
const TAX_LOOKUP_URL = 
  "https://script.google.com/macros/s/AKfycbyQHrLh-nSx4LKu1hDASswlnWz3jFj4_OpJh0bmc4uppA6Z9QYHk3-g9BOvmpvz3_cU/exec";

/***********************
 * APP STATE
 ***********************/
let customers = []; // not used for tax lookup now
let products = [];
let state = {
  step: 1,
  customer: {},
  cart: [],
  taxRate: 0,
  businessType: ""
};

/***********************
 * LOAD PRODUCTS (unchanged)
 ***********************/
function loadProducts() {
  fetch(PRODUCT_CSV_URL)
    .then(r => r.text())
    .then(t => {
      products = parseCSV(t).map(p => ({
        name: p["Product Name"],
        price: Number(p["Price"]),
        stock: Number(p["Qty in stock"]),
        category: p["Category"] || ""
      }));
      render();
    });
}

/***********************
 * REVIEW STEP — WITH TAX LOOKUP
 ***********************/
async function review() {
  // Build cart
  state.cart = products
    .map((p, i) => ({
      ...p,
      qty: Number(document.getElementById(`q-${i}`)?.value || 0)
    }))
    .filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Please select at least one product.");
    return;
  }

  const storeName = document.getElementById("store")?.value?.trim();
  if (!storeName) {
    alert("Please enter your store name.");
    return;
  }

  // Default (no tax)
  state.taxRate = 0;
  state.businessType = "Unknown";

  try {
    const res = await fetch(
      `${TAX_LOOKUP_URL}?name=${encodeURIComponent(storeName)}`
    );
    const data = await res.json();

    if (data.found && data.customer && data.customer.businessType) {
      state.businessType = data.customer.businessType;
      if (state.businessType.toLowerCase() === "restaurant") {
        state.taxRate = 0.06;
      }
    }
  } catch (err) {
    console.warn("Tax lookup failed — defaulting to no tax.", err);
  }

  state.step = 3;
  render();
}

/***********************
 * RENDER UI
 ***********************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* Step 1 – Customer info */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Store Information</h2>

        <input id="store" placeholder="Enter Store Name">

        <button onclick="nextStep()">Next</button>
      </div>
    `;
  }

  /* Step 2 – Product selection */
  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Select Products</h2>`;
    products.forEach((p, i) => {
      el.innerHTML += `
        <div class="product-card">
          <div>${p.name} ($${p.price.toFixed(2)})</div>
          <input type="number" min="0" id="q-${i}" placeholder="Qty">
        </div>
      `;
    });
    el.innerHTML += `
      <div id="live-total">Total: $0.00</div>
      <button onclick="review()">Review Order</button>
      </div>
    `;
  }

  /* Step 3 – Review */
  if (state.step === 3) {
    let subtotal = 0;
    let kegDepositTotal = 0;

    el.innerHTML = `<div class="card"><h2>Review Order</h2>`;

    el.innerHTML += `<p><strong>${state.customer.store || ""}</strong></p>`;

    el.innerHTML += `<table class="review-table">
      <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
    `;

    state.cart.forEach(i => {
      const line = i.qty * i.price;
      subtotal += line;

      if (/keg/i.test(i.name)) {
        kegDepositTotal += i.qty * 30;
      }

      el.innerHTML += `
        <tr>
          <td>${i.name}</td>
          <td>${i.qty}</td>
          <td>$${i.price.toFixed(2)}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>
      `;
    });

    const tax = subtotal * state.taxRate;
    const total = subtotal + tax + kegDepositTotal;

    el.innerHTML += `</table>`;

    el.innerHTML += `
      <div>Subtotal: $${subtotal.toFixed(2)}</div>
      <div>Tax (${state.businessType}): $${tax.toFixed(2)}</div>
      <div>Keg Deposit: $${kegDepositTotal.toFixed(2)}</div>
      <h3>Total: $${total.toFixed(2)}</h3>
      <button onclick="submitOrder()">Submit Order</button>
    `;
    el.innerHTML += `</div>`;
  }

  /* Step 4 – Confirmation */
  if (state.step === 4) {
    el.innerHTML = `
      <div class="card">
        <h2>Order Submitted</h2>
        <p>Thank you! Your order has been submitted.</p>
      </div>
    `;
  }
}

/***********************
 * NAVIGATION
 ***********************/
function nextStep() {
  state.customer.store = document.getElementById("store").value.trim();
  state.step = 2;
  render();
}

function submitOrder() {
  state.step = 4;
  render();
}

/***********************
 * INIT
 ***********************/
loadProducts();
render();
