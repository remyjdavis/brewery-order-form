/***********************
 * GOOGLE SHEETS URLS
 ***********************/
const CUSTOMER_CHECK_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=2105303643&single=true&output=csv";

const CUSTOMER_FINTECH_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=799127666&single=true&output=csv";

const PRODUCT_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/***********************
 * STATE
 ***********************/
let customers = { check: [], fintech: [] };
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

/***********************
 * LOAD DATA
 ***********************/
function loadData() {
  fetch(CUSTOMER_CHECK_URL)
    .then(r => r.text())
    .then(t => customers.check = parseCSV(t));

  fetch(CUSTOMER_FINTECH_URL)
    .then(r => r.text())
    .then(t => customers.fintech = parseCSV(t));

  fetch(PRODUCT_URL)
    .then(r => r.text())
    .then(t => {
      products = parseCSV(t);
      render();
    });
}

/***********************
 * CATEGORY DETECTION
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

  /******** STEP 1 ********/
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Store Information</h2>

        <input id="store" placeholder="Store Name">
        <input id="contact" placeholder="Contact Name">
        <input id="email" placeholder="Email">

        <button onclick="nextStep()">Next</button>
      </div>
    `;
  }

  /******** STEP 2 ********/
  if (state.step === 2) {
    let cases = products.filter(p => getCategory(p) === "Cases");
    let kegs = products.filter(p => getCategory(p) === "Kegs");

    el.innerHTML = `<div class="card"><h2>Select Products</h2>`;

    el.innerHTML += `<h3>Cases</h3><div class="grid">`;
    cases.forEach(p => productCard(p));
    el.innerHTML += `</div>`;

    el.innerHTML += `<h3>Kegs</h3><div class="grid">`;
    kegs.forEach(p => productCard(p));
    el.innerHTML += `</div>`;

    el.innerHTML += `
      <div id="live-total">Total: $0.00</div>
      <button onclick="reviewOrder()">Review Order</button>
    </div>`;
  }

  /******** STEP 3 ********/
  if (state.step === 3) {
    let total = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>

        <p>
          <strong>${state.customer.store}</strong><br>
          ${state.customer.contact}<br>
          ${state.customer.email}<br><br>
          ${state.customer.address}<br>
          ${state.customer.city}, ${state.customer.state} ${state.customer.zip}
        </p>
    `;

    state.cart.forEach(i => {
      const line = i.qty * i.price;
      total += line;
      el.innerHTML += `<p>${i.name} × ${i.qty} = $${line.toFixed(2)}</p>`;
    });

    el.innerHTML += `
        <h3>Total: $${total.toFixed(2)}</h3>
        <button onclick="submitOrder()">Submit Order (Test)</button>
      </div>
    `;
  }

  /******** STEP 4 ********/
  if (state.step === 4) {
    el.innerHTML = `
      <div class="card">
        <h2>Order Submitted</h2>
        <p>This is test mode. No data saved.</p>
      </div>
    `;
  }
}

/***********************
 * PRODUCT CARD
 ***********************/
function productCard(p) {
  document.querySelector(".grid:last-of-type").innerHTML += `
    <div class="product-card" onclick="toggleQty('${p["Product Name"]}')">
      <div class="product-name">${p["Product Name"]}</div>
      <div class="product-meta">$${p.Price}</div>

      <div class="qty-box" id="qty-${p["Product Name"]}">
        <input type="number" min="0" value="0"
          onchange="updateTotal()"
          data-name="${p["Product Name"]}"
          data-price="${p.Price}">
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
    total += Number(i.value) * Number(i.dataset.price);
  });
  document.getElementById("live-total").innerText =
    `Total: $${total.toFixed(2)}`;
}

function nextStep() {
  state.customer = {
    store: document.getElementById("store").value,
    contact: document.getElementById("contact").value,
    email: document.getElementById("email").value,
    address: "",
    city: "",
    state: "",
    zip: ""
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

  if (state.cart.length === 0) {
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
