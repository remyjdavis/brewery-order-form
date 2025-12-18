/************************
 * CONFIG
 ************************/
const CHECK_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=2105303643&single=true&output=csv";

const FINTECH_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=799127666&single=true&output=csv";

const PRODUCT_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

const TAX_RATE = 0.06;
const KEG_DEPOSIT = 30;

/************************
 * STATE
 ************************/
let customers = [];
let products = [];
let state = {
  step: 1,
  customer: {},
  cart: []
};

/************************
 * CSV PARSER (SAFE)
 ************************/
function parseCSV(text) {
  const rows = text.trim().split("\n").map(r => r.split(","));
  const headers = rows.shift();

  return rows.map(r => {
    let obj = {};
    headers.forEach((h, i) => {
      let v = (r[i] || "").trim();
      if (["Price", "Qty in stock"].includes(h)) v = Number(v) || 0;
      obj[h.trim()] = v;
    });
    return obj;
  });
}

function normalize(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/************************
 * LOAD DATA
 ************************/
async function loadData() {
  const [c, f, p] = await Promise.all([
    fetch(CHECK_URL).then(r => r.text()),
    fetch(FINTECH_URL).then(r => r.text()),
    fetch(PRODUCT_URL).then(r => r.text())
  ]);

  customers = [...parseCSV(c), ...parseCSV(f)];
  products = parseCSV(p);
  render();
}

/************************
 * CATEGORY
 ************************/
function getCategory(p) {
  if (/case/i.test(p.Category)) return "Cases";
  if (/1\/2|1\/6|keg/i.test(p.Category)) return "Kegs";
  return "Other";
}

/************************
 * RENDER
 ************************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Store Information</h2>

        <input id="store" list="store-list"
          placeholder="Start typing store name"
          oninput="autoFillCustomer()">

        <datalist id="store-list">
          ${customers.map(c =>
            `<option value="${c["Check Customer Name"] || c["Fintech Customer Name"]}">`
          ).join("")}
        </datalist>

        <input id="contact" placeholder="Contact Name">
        <input id="email" placeholder="Email">

        <button onclick="nextStep()">Next</button>
      </div>
    `;
  }

  /* STEP 2 */
  if (state.step === 2) {
    const cases = products.filter(p => getCategory(p) === "Cases");
    const kegs = products.filter(p => getCategory(p) === "Kegs");

    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>

        <h3>Cases</h3>
        <div class="grid">${cases.map(productCard).join("")}</div>

        <h3>Kegs</h3>
        <div class="grid">${kegs.map(productCard).join("")}</div>

        <div id="live-total">Total: $0.00</div>
        <button onclick="reviewOrder()">Review Order</button>
      </div>
    `;
  }

  /* STEP 3 */
  if (state.step === 3) {
    let subtotal = 0;
    let caseCount = 0;
    let kegCount = 0;

    const rows = state.cart.map(i => {
      const isCase = /case/i.test(i.name);
      const isKeg = /keg|1\/2|1\/6/i.test(i.name);

      if (isCase) caseCount += i.qty;
      if (isKeg) kegCount += i.qty;

      const lineTotal = i.qty * i.price;
      subtotal += lineTotal;

      let desc = "Package";
      if (isCase) desc = "Case of 24";
      if (/1\/2/i.test(i.name)) desc = "1/2 Keg";
      if (/1\/6/i.test(i.name)) desc = "1/6 Keg";

      return `
        <tr>
          <td>${i.name.replace(/–.*$/, "")}</td>
          <td>${desc}</td>
          <td>${i.qty}</td>
          <td>$${i.price.toFixed(2)}</td>
          <td>$${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

    const discount = caseCount >= 10 ? subtotal * 0.10 : 0;
    const taxable = subtotal - discount;
    const tax = /restaurant/i.test(state.customer.store) ? taxable * TAX_RATE : 0;
    const kegDeposit = kegCount * KEG_DEPOSIT;
    const total = taxable + tax + kegDeposit;

    el.innerHTML = `
      <div class="card">
        <h2>Order Review</h2>

        <p>
          <strong>${state.customer.store}</strong><br>
          ${state.customer.address}<br>
          ${state.customer.city}, ${state.customer.state} ${state.customer.zip}
        </p>

        <hr>

        <table class="review-table">
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
          <div>Subtotal <span>$${subtotal.toFixed(2)}</span></div>
          <div>Discount <span>-$${discount.toFixed(2)}</span></div>
          <div>Tax <span>$${tax.toFixed(2)}</span></div>
          <div>Keg Deposit <span>$${kegDeposit.toFixed(2)}</span></div>
          <div class="grand-total">
            Total <span>$${total.toFixed(2)}</span>
          </div>
        </div>

        <button onclick="submitOrder()">Submit Order</button>
      </div>
    `;
  }

  /* STEP 4 */
  if (state.step === 4) {
    el.innerHTML = `
      <div class="card">
        <h2>Order Submitted</h2>
        <p>Thank you for your order.</p>
      </div>
    `;
  }
}

/************************
 * PRODUCT CARD
 ************************/
function productCard(p) {
  const id = normalize(p["Product Name"]);
  const stock = p["Qty in stock"];

  return `
    <div class="product-card" onclick="toggleQty('${id}')">
      <div class="product-name">${p["Product Name"]}</div>
      <div class="product-meta">
        $${p.Price.toFixed(2)}<br>
        In Stock: ${stock}
      </div>
      <div class="qty-box" id="qty-${id}">
        <input type="number" min="0" max="${stock}"
          data-name="${p["Product Name"]}"
          data-price="${p.Price}"
          onclick="event.stopPropagation()"
          oninput="updateTotal()">
      </div>
    </div>
  `;
}

/************************
 * INTERACTIONS
 ************************/
function toggleQty(id) {
  const el = document.getElementById("qty-" + id);
  el.style.display = el.style.display === "block" ? "none" : "block";
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll(".qty-box input").forEach(i => {
    total += (+i.value || 0) * (+i.dataset.price);
  });
  document.getElementById("live-total").innerText =
    `Total: $${total.toFixed(2)}`;
}

/************************
 * CUSTOMER AUTOFILL
 ************************/
function autoFillCustomer() {
  const input = normalize(store.value);
  const match = customers.find(c =>
    normalize(c["Check Customer Name"] || c["Fintech Customer Name"]) === input
  );

  if (match) {
    contact.value = match.Contact || "";
    email.value = match.Email || "";
    state.customer.address = match.Address || "";
    state.customer.city = match.City || "";
    state.customer.state = match.State || "";
    state.customer.zip = match.Zip || "";
  }
}

/************************
 * FLOW
 ************************/
function nextStep() {
  state.customer.store = store.value;
  state.customer.contact = contact.value;
  state.customer.email = email.value;
  state.step = 2;
  render();
}

function reviewOrder() {
  state.cart = [];
  document.querySelectorAll(".qty-box input").forEach(i => {
    if (+i.value > 0) {
      state.cart.push({
        name: i.dataset.name,
        qty: +i.value,
        price: +i.dataset.price
      });
    }
  });

  if (!state.cart.length) return alert("Select at least one product.");
  state.step = 3;
  render();
}

function submitOrder() {
  state.step = 4;
  render();
}

/************************
 * INIT
 ************************/
loadData();
