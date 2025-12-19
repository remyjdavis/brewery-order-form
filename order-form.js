/******** CONFIG ********/
const API_URL = "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";
const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/******** STATE ********/
let products = [];
let customerResults = [];

let state = {
  step: 1,
  customer: null,
  cart: []
};

/******** CSV ********/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");

  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || "").trim();
    });
    return obj;
  });
}

/******** LOAD PRODUCTS ********/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();

  products = parseCSV(text).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"]),
    stock: Number(p["Qty In Stock"])
  }));

  render();
}

/******** CUSTOMER SEARCH ********/
async function searchCustomers(query) {
  if (query.length < 2) return [];

  const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.results || [];
}

/******** RENDER ********/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 — CUSTOMER */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>

        <div class="autocomplete-wrapper">
          <input
            id="customer-input"
            placeholder="Start typing customer name..."
            autocomplete="off"
          >
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;

    document
      .getElementById("customer-input")
      .addEventListener("input", handleAutocomplete);
  }

  /* STEP 2 — PRODUCTS */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Products</h2>

        <div class="grid">
          ${products.map((p, i) => `
            <div class="product-card">
              <strong>${p.name}</strong>
              <div>$${p.price.toFixed(2)}</div>
              <div>In Stock: ${p.stock}</div>
              <input
                type="number"
                min="0"
                max="${p.stock}"
                id="qty-${i}"
              >
            </div>
          `).join("")}
        </div>

        <button class="primary" onclick="review()">Review Order</button>
      </div>
    `;
  }
}

/******** AUTOCOMPLETE ********/
async function handleAutocomplete(e) {
  const query = e.target.value;
  const box = document.getElementById("autocomplete-results");

  customerResults = await searchCustomers(query);

  box.innerHTML = customerResults.map((c, i) => `
    <div class="autocomplete-item" data-index="${i}">
      ${c.name}
    </div>
  `).join("");

  box.querySelectorAll(".autocomplete-item").forEach(item => {
    item.addEventListener("click", () => {
      const index = Number(item.dataset.index);
      selectCustomer(customerResults[index]);
    });
  });
}

function selectCustomer(customer) {
  state.customer = customer;
  state.step = 2;
  render();
}

/******** REVIEW ********/
function review() {
  state.cart = products.map((p, i) => ({
    ...p,
    qty: Number(document.getElementById(`qty-${i}`).value || 0)
  })).filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Add at least one product.");
    return;
  }

  alert("Review logic next step — state is correct.");
}

/******** INIT ********/
loadProducts();
render();
