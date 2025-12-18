/***********************
 * CONFIG
 ***********************/
const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

const TAX_LOOKUP_URL =
  "https://script.google.com/macros/s/AKfycbyQHrLh-nSx4LKu1hDASswlnWz3jFj4_OpJh0bmc4uppA6Z9QYHk3-g9BOvmpvz3_cU/exec";

const KEG_DEPOSIT = 30;

/***********************
 * STATE
 ***********************/
let products = [];
let state = {
  step: 1,
  store: "",
  cart: [],
  taxRate: 0,
  businessType: "Unknown"
};

/***********************
 * CSV PARSER
 ***********************/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(l => {
    const values = l.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (values[i] || "").trim());
    return obj;
  });
}

/***********************
 * LOAD PRODUCTS
 ***********************/
function loadProducts() {
  fetch(PRODUCT_CSV_URL)
    .then(r => r.text())
    .then(t => {
      products = parseCSV(t).map((p, i) => ({
        id: i,
        name: p["Product Name"],
        price: Number(p["Price"]),
        stock: Number(p["Qty in stock"]) || 0,
        category: p["Category"] || ""
      }));
      render();
    });
}

/***********************
 * LIVE TOTAL
 ***********************/
function updateLiveTotal() {
  let subtotal = 0;
  let keg = 0;

  products.forEach(p => {
    const q = Number(document.getElementById(`qty-${p.id}`)?.value || 0);
    subtotal += q * p.price;
    if (/keg/i.test(p.name)) keg += q * KEG_DEPOSIT;
  });

  const el = document.getElementById("live-total");
  if (el) el.innerText =
    `Subtotal: $${subtotal.toFixed(2)} | Keg Deposit: $${keg.toFixed(2)}`;
}

/***********************
 * REVIEW
 ***********************/
async function review() {
  state.cart = products
    .map(p => ({
      ...p,
      qty: Number(document.getElementById(`qty-${p.id}`)?.value || 0)
    }))
    .filter(p => p.qty > 0);

  if (!state.cart.length) {
    alert("Please select at least one product.");
    return;
  }

  try {
    const res = await fetch(`${TAX_LOOKUP_URL}?name=${encodeURIComponent(state.store)}`);
    const data = await res.json();
    if (data.found && data.customer?.businessType?.toLowerCase() === "restaurant") {
      state.taxRate = 0.06;
      state.businessType = "Restaurant";
    }
  } catch {}

  state.step = 3;
  render();
}

/***********************
 * RENDER
 ***********************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Store Information</h2>
        <input id="store" placeholder="Enter Store Name">
        <button onclick="next()">Next</button>
      </div>`;
  }

  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Select Products</h2><div class="grid">`;
    products.forEach(p => {
      el.innerHTML += `
        <div class="product-card">
          <div class="product-name">${p.name}</div>
          <div>$${p.price.toFixed(2)}</div>
          <input class="qty-input" id="qty-${p.id}" type="number" min="0"
            oninput="updateLiveTotal()">
        </div>`;
    });
    el.innerHTML += `
      </div>
      <div id="live-total">Subtotal: $0.00</div>
      <button onclick="review()">Review Order</button>
    </div>`;
  }

  if (state.step === 3) {
    let subtotal = 0, keg = 0;
    el.innerHTML = `<div class="card"><h2>Review Order</h2><hr>
      <table class="review-table">
      <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>`;
    state.cart.forEach(p => {
      const line = p.qty * p.price;
      subtotal += line;
      if (/keg/i.test(p.name)) keg += p.qty * KEG_DEPOSIT;
      el.innerHTML += `<tr>
        <td>${p.name}</td>
        <td>${p.qty}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>$${line.toFixed(2)}</td>
      </tr>`;
    });
    const tax = subtotal * state.taxRate;
    el.innerHTML += `</table>
      <p>Subtotal: $${subtotal.toFixed(2)}</p>
      <p>Tax (${state.businessType}): $${tax.toFixed(2)}</p>
      <p>Keg Deposit: $${keg.toFixed(2)}</p>
      <h3>Total: $${(subtotal + tax + keg).toFixed(2)}</h3>
      <button onclick="window.print()">Print Order</button>
    </div>`;
  }
}

/***********************
 * NAV
 ***********************/
function next() {
  state.store = document.getElementById("store").value.trim();
  if (!state.store) return alert("Enter store name");
  state.step = 2;
  render();
}

/***********************
 * INIT
 ***********************/
loadProducts();
render();
