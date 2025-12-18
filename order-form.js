/*************************
 * CONSTANTS
 *************************/
const KEG_DEPOSIT = 30;
const TAX_RATE = 0.06;

/*************************
 * STATE
 *************************/
let state = {
  step: 1,
  customer: {},
  products: [],
  cart: []
};

/*************************
 * CSV PARSER (Safari Safe)
 *************************/
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

/*************************
 * LOAD PRODUCTS
 *************************/
function loadProducts() {
  fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv")
    .then(res => res.text())
    .then(text => {
      state.products = parseCSV(text).map(p => ({
        name: p["Product Name"],
        price: Number(p["Price"]),
        stock: Number(p["Qty in stock"]),
        category: p["Category"]
      }));
      render();
    });
}

/*************************
 * RENDER
 *************************/
function render() {
  const el = document.getElementById("form-container");
  if (!el) return;
  el.innerHTML = "";

  if (state.step === 1) renderCustomer(el);
  if (state.step === 2) renderProducts(el);
  if (state.step === 3) renderReview(el);
}

/*************************
 * STEP 1 — CUSTOMER
 *************************/
function renderCustomer(el) {
  el.innerHTML = `
    <div class="card">
      <h2>Customer Information</h2>

      <input id="store" placeholder="Store Name" />
      <select id="type">
        <option value="retail">Retail</option>
        <option value="restaurant">Restaurant</option>
      </select>

      <button onclick="nextStep()">Continue</button>
    </div>
  `;
}

/*************************
 * STEP 2 — PRODUCTS
 *************************/
function renderProducts(el) {
  let cases = state.products.filter(p => /case/i.test(p.category));
  let kegs = state.products.filter(p => /1\/2|1\/6|keg/i.test(p.category));

  el.innerHTML = `
    <div class="card">
      <h2>Order Products</h2>

      <h3>Cases</h3>
      <div class="grid">${renderProductGrid(cases)}</div>

      <h3>Kegs</h3>
      <div class="grid">${renderProductGrid(kegs)}</div>

      <div id="live-total" class="total-box"></div>

      <button onclick="reviewOrder()">Review Order</button>
    </div>
  `;

  updateTotal();
}

/*************************
 * PRODUCT GRID
 *************************/
function renderProductGrid(list) {
  return list.map(p => `
    <div class="product-card" onclick="toggleQty(this)">
      <div class="product-name">${p.name}</div>
      <div class="product-meta">$${p.price.toFixed(2)} | In Stock: ${p.stock}</div>

      <div class="qty-box">
        <input 
          type="number" 
          min="0" 
          value="0"
          data-name="${p.name}"
          data-price="${p.price}"
          oninput="updateTotal(); event.stopPropagation();" />
      </div>
    </div>
  `).join("");
}

/*************************
 * TOGGLE QTY
 *************************/
function toggleQty(card) {
  const box = card.querySelector(".qty-box");
  box.style.display = box.style.display === "block" ? "none" : "block";
}

/*************************
 * LIVE TOTAL (INCLUDES KEG DEPOSIT)
 *************************/
function updateTotal() {
  let productTotal = 0;
  let kegCount = 0;

  document.querySelectorAll(".qty-box input").forEach(i => {
    const qty = Number(i.value) || 0;
    const price = Number(i.dataset.price) || 0;
    const name = i.dataset.name || "";

    productTotal += qty * price;

    if (/keg|1\/2|1\/6/i.test(name)) {
      kegCount += qty;
    }
  });

  const kegDepositTotal = kegCount * KEG_DEPOSIT;
  const grandTotal = productTotal + kegDepositTotal;

  document.getElementById("live-total").innerHTML = `
    <div>Products: $${productTotal.toFixed(2)}</div>
    <div>Keg Deposit: $${kegDepositTotal.toFixed(2)}</div>
    <strong>Total: $${grandTotal.toFixed(2)}</strong>
  `;
}

/*************************
 * REVIEW ORDER
 *************************/
function reviewOrder() {
  state.cart = [];

  document.querySelectorAll(".qty-box input").forEach(i => {
    const qty = Number(i.value);
    if (qty > 0) {
      state.cart.push({
        name: i.dataset.name,
        price: Number(i.dataset.price),
        qty
      });
    }
  });

  state.step = 3;
  render();
}

/*************************
 * STEP 3 — REVIEW PAGE
 *************************/
function renderReview(el) {
  let subtotal = 0;
  let kegCount = 0;
  let caseCount = 0;

  let rows = state.cart.map(i => {
    const line = i.qty * i.price;
    subtotal += line;

    if (/case/i.test(i.name)) caseCount += i.qty;
    if (/keg|1\/2|1\/6/i.test(i.name)) kegCount += i.qty;

    return `
      <tr>
        <td>${i.name.replace(/–.*$/, "")}</td>
        <td>${/case/i.test(i.name) ? "Case" : "Keg"}</td>
        <td>${i.qty}</td>
        <td>$${i.price.toFixed(2)}</td>
        <td>$${line.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  const discount = caseCount >= 10 ? subtotal * 0.10 : 0;
  const taxable = subtotal - discount;
  const tax = state.customer?.type === "restaurant" ? taxable * TAX_RATE : 0;
  const kegDeposit = kegCount * KEG_DEPOSIT;
  const total = taxable + tax + kegDeposit;

  el.innerHTML = `
    <div class="card">
      <h2>Review Order</h2>

      <hr />

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="summary">
        <div>Subtotal: $${subtotal.toFixed(2)}</div>
        <div>Discount: -$${discount.toFixed(2)}</div>
        <div>Tax: $${tax.toFixed(2)}</div>
        <div>Keg Deposit: $${kegDeposit.toFixed(2)}</div>
        <strong>Total: $${total.toFixed(2)}</strong>
      </div>
    </div>
  `;
}

/*************************
 * NAV
 *************************/
function nextStep() {
  state.customer = {
    store: document.getElementById("store").value,
    type: document.getElementById("type").value
  };
  state.step = 2;
  render();
}

/*************************
 * INIT
 *************************/
loadProducts();
render();
