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
 * CSV PARSER (SAFARI SAFE)
 ***********************/
function parseCSV(text) {
  const rows = text.trim().split("\n").map(r => r.split(","));
  const headers = rows.shift();

  return rows.map(r => {
    let obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (r[i] || "").trim();
    });
    return obj;
  });
}

/***********************
 * NORMALIZATION (SEARCH FIX)
 ***********************/
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/***********************
 * LOAD DATA
 ***********************/
async function loadData() {
  const [check, fintech, prod] = await Promise.all([
    fetch(CHECK_URL).then(r => r.text()),
    fetch(FINTECH_URL).then(r => r.text()),
    fetch(PRODUCT_URL).then(r => r.text())
  ]);

  customers = [
    ...parseCSV(check),
    ...parseCSV(fintech)
  ];

  products = parseCSV(prod);
  render();
}

/***********************
 * CATEGORY LOGIC
 ***********************/
function getCategory(p) {
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

  /* STEP 1 — CUSTOMER INFO */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Store Information</h2>

        <input id="store" placeholder="Store Name"
               onblur="autoFillCustomer()">

        <input id="contact" placeholder="Contact Name">
        <input id="email" placeholder="Email">
        <input id="address" placeholder="Address">
        <input id="city" placeholder="City">
        <input id="state" placeholder="State">
        <input id="zip" placeholder="Zip">

        <button onclick="nextStep()">Next</button>
      </div>
    `;
  }

  /* STEP 2 — PRODUCTS */
  if (state.step === 2) {
    const cases = products.filter(p => getCategory(p) === "Cases");
    const kegs = products.filter(p => getCategory(p) === "Kegs");

    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>

        <h3>Cases</h3>
        <div class="grid">
          ${cases.map(p => productHTML(p)).join("")}
        </div>

        <h3>Kegs</h3>
        <div class="grid">
          ${kegs.map(p => productHTML(p)).join("")}
        </div>

        <div id="live-total">Total: $0.00</div>
        <button onclick="reviewOrder()">Review Order</button>
      </div>
    `;
  }

  /* STEP 3 — REVIEW */
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
      el.innerHTML += `
        <p>${i.name} × ${i.qty} — $${line.toFixed(2)}</p>
      `;
    });

    el.innerHTML += `
        <h3>Total: $${total.toFixed(2)}</h3>
        <button onclick="submitOrder()">Submit Order (Test)</button>
      </div>
    `;
  }

  /* STEP 4 — CONFIRM */
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
  return `
    <div class="product-card" onclick="toggleQty('${id}')">
      <div class="product-name">${p["Product Name"]}</div>
      <div class="product-meta">$${Number(p.Price).toFixed(2)}</div>

      <div class="qty-box" id="qty-${id}">
        <input type="number" min="0" value="0"
          data-name="${p["Product Name"]}"
          data-price="${p.Price}"
          onchange="updateTotal()">
      </div>
    </div>
  `;
}

/***********************
 * INTERACTIONS
 ***********************/
function toggleQty(id) {
  const box = document.getElementById("qty-" + id);
  if (!box) return;

  const isOpen = box.style.display === "block";
  box.style.display = isOpen ? "none" : "block";
  box.parentElement.classList.toggle("active", !isOpen);
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll(".qty-box input").forEach(i => {
    total += Number(i.value) * Number(i.dataset.price);
  });

  const totalEl = document.getElementById("live-total");
  if (totalEl) {
    totalEl.innerText = `Total: $${total.toFixed(2)}`;
  }
}

/***********************
 * CUSTOMER AUTOFILL (FIXED)
 ***********************/
function autoFillCustomer() {
  const input = normalize(document.getElementById("store").value);
  if (!input) return;

  const match = customers.find(c => {
    const checkName = normalize(c["Check Customer Name"]);
    const fintechName = normalize(c["Fintech Customer Name"]);

    return (
      checkName.includes(input) ||
      fintechName.includes(input) ||
      input.includes(checkName) ||
      input.includes(fintechName)
    );
  });

  if (!match) {
    console.log("No customer match found");
    return;
  }

  document.getElementById("contact").value = match.Contact || "";
  document.getElementById("email").value = match.Email || "";
  document.getElementById("address").value = match.Address || "";
  document.getElementById("city").value = match.City || "";
  document.getElementById("state").value = match.State || "";
  document.getElementById("zip").value = match.Zip || "";
}

/***********************
 * NAVIGATION
 ***********************/
function nextStep() {
  state.customer = {
    store: store.value,
    contact: contact.value,
    email: email.value,
    address: address.value,
    city: city.value,
    state: state.value,
    zip: zip.value
  };
  state.step = 2;
  render();
}

function reviewOrder() {
  state.cart = [];

  document.querySelectorAll(".qty-box input").forEach(i => {
    if (Number(i.value) > 0) {
      state.cart.push({
        name: i.dataset.name,
        qty: Number(i.value),
        price: Number(i.dataset.price)
      });
    }
  });

  if (!state.cart.length) {
    alert("Please select at least one product.");
    return;
  }

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
