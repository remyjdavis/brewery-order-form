/***********************
 * GOOGLE SHEETS URLS
 ***********************/
const CHECK_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=2105303643&single=true&output=csv";

const FINTECH_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=799127666&single=true&output=csv";

const PRODUCT_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/***********************
 * STATE
 ***********************/
let customers = [];
let products = [];
let state = {
  step: 1,
  customer: {},
  cart: []
};

/***********************
 * CSV PARSER (ROBUST)
 ***********************/
function parseCSV(text) {
  const rows = text.trim().split("\n").map(r => r.split(","));
  const headers = rows.shift();

  return rows.map(r => {
    let obj = {};
    headers.forEach((h, i) => {
      let v = (r[i] || "").trim();
      if (h === "Price" || h === "Qty in stock") v = Number(v) || 0;
      obj[h.trim()] = v;
    });
    return obj;
  });
}

function normalize(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/***********************
 * LOAD DATA
 ***********************/
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

/***********************
 * CATEGORY
 ***********************/
function category(p) {
  if (/case/i.test(p.Category)) return "Cases";
  if (/1\/2|1\/6/i.test(p.Category)) return "Kegs";
  return "Other";
}

/***********************
 * RENDER
 ***********************/
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
          ${customers.map(c => `
            <option value="${c["Check Customer Name"] || c["Fintech Customer Name"]}">
          `).join("")}
        </datalist>

        <input id="contact" placeholder="Contact Name">
        <input id="email" placeholder="Email">

        <button onclick="nextStep()">Next</button>
      </div>
    `;
  }

  /* STEP 2 */
  if (state.step === 2) {
    const cases = products.filter(p => category(p) === "Cases");
    const kegs = products.filter(p => category(p) === "Kegs");

    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>

        <h3>Cases</h3>
        <div class="grid">${cases.map(productHTML).join("")}</div>

        <h3>Kegs</h3>
        <div class="grid">${kegs.map(productHTML).join("")}</div>

        <div id="live-total">Total: $0.00</div>
        <button onclick="reviewOrder()">Review Order</button>
      </div>
    `;
  }

  /* STEP 3 */
  if (state.step === 3) {
    let total = 0;
    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>

        <p>
          <strong>${state.customer.store}</strong><br>
          ${state.customer.address}<br>
          ${state.customer.city}, ${state.customer.state} ${state.customer.zip}
        </p>
    `;

    state.cart.forEach(i => {
      const line = i.qty * i.price;
      total += line;
      el.innerHTML += `<p>${i.name} × ${i.qty} — $${line.toFixed(2)}</p>`;
    });

    el.innerHTML += `
        <h3>Total: $${total.toFixed(2)}</h3>
        <button onclick="submitOrder()">Submit Order</button>
      </div>
    `;
  }

  if (state.step === 4) {
    el.innerHTML = `
      <div class="card">
        <h2>Order Submitted</h2>
        <p>Thank you for your order.</p>
      </div>
    `;
  }
}

/***********************
 * PRODUCT CARD
 ***********************/
function productHTML(p) {
  const id = normalize(p["Product Name"]);
  const stock = Number(p["Qty in stock"]) || 0;

  return `
    <div class="product-card ${stock === 0 ? "out" : ""}"
         onclick="toggleQty('${id}')">

      <div class="product-name">${p["Product Name"]}</div>

      <div class="product-meta">
        $${Number(p.Price).toFixed(2)}<br>
        ${stock > 0 ? `In Stock: ${stock}` : `<span class="out-label">Out of stock</span>`}
      </div>

      <div class="qty-box" id="qty-${id}">
        <input type="number"
          min="0"
          max="${stock}"
          value="0"
          ${stock === 0 ? "disabled" : ""}
          data-name="${p["Product Name"]}"
          data-price="${p.Price}"
          data-stock="${stock}"
          onclick="event.stopPropagation()"
          oninput="updateTotal()">
      </div>
    </div>
  `;
}

/***********************
 * INTERACTIONS
 ***********************/
function toggleQty(id) {
  const box = document.getElementById("qty-" + id);
  box.style.display = box.style.display === "block" ? "none" : "block";
  box.parentElement.classList.toggle("active");
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll(".qty-box input").forEach(i => {
    let qty = Number(i.value);
    const stock = Number(i.dataset.stock);
    if (qty > stock) qty = stock;
    i.value = qty;
    total += qty * Number(i.dataset.price);
  });

  document.getElementById("live-total").innerText =
    `Total: $${total.toFixed(2)}`;
}

/***********************
 * CUSTOMER AUTOFILL
 ***********************/
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

/***********************
 * FLOW
 ***********************/
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

/***********************
 * INIT
 ***********************/
loadData();
