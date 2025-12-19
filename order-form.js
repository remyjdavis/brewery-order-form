/******** CONFIG ********/
const API_URL = "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";
const PRODUCT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/******** STATE ********/
let products = [];
let customerResults = [];

let state = {
  step: 1,
  customer: null,
  cart: []
};

/******** CSV PARSER (Safari Optimized) ********/
function parseCSV(text) {
  // Use regex to split by any newline variation (Unix or Windows)
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  // Trim headers to remove hidden spaces or \r
  const headers = lines.shift().split(",").map(h => h.trim());

  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      // Ensure values are trimmed of whitespace and hidden characters
      obj[h] = (values[i] || "").trim();
    });
    return obj;
  });
}

/******** LOAD PRODUCTS ********/
async function loadProducts() {
  try {
    // Safari fix: Append a timestamp to prevent cached empty responses
    const separator = PRODUCT_CSV_URL.includes('?') ? '&' : '?';
    const res = await fetch(`${PRODUCT_CSV_URL}${separator}t=${Date.now()}`);
    const text = await res.text();

    const rawData = parseCSV(text);
    
    products = rawData.map(p => ({
      name: p["Product Name"] || "Unknown",
      price: parseFloat(p["Price"]) || 0,
      stock: parseInt(p["Qty In Stock"], 10) || 0
    }));

    render();
  } catch (err) {
    console.error("Error loading CSV:", err);
  }
}

/******** CUSTOMER SEARCH ********/
async function searchCustomers(query) {
  if (query.length < 2) return [];

  try {
    const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error("Error searching customers:", err);
    return [];
  }
}

/******** RENDER ********/
function render() {
  const el = document.getElementById("form-container");
  if (!el) return;
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
            type="text"
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
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2>Products</h2>
            <small>Customer: <strong>${state.customer.name}</strong></small>
        </div>

        <div class="grid">
          ${products.map((p, i) => `
            <div class="product-card">
              <strong>${p.name}</strong>
              <div>$${p.price.toFixed(2)}</div>
              <div>In Stock: ${p.stock}</div>
              <input
                type="number"
                min="0"
                pattern="[0-9]*"
                max="${p.stock}"
                id="qty-${i}"
                placeholder="0"
              >
            </div>
          `).join("")}
        </div>

        <button class="primary" id="btn-review">Review Order</button>
      </div>
    `;
    
    document.getElementById("btn-review").onclick = review;
  }
}

/******** AUTOCOMPLETE ********/
async function handleAutocomplete(e) {
  const query = e.target.value;
  const box = document.getElementById("autocomplete-results");

  customerResults = await searchCustomers(query);

  box.innerHTML = customerResults.map((c, i) => `
    <div class="autocomplete-item" data-index="${i}" style="cursor:pointer;">
      ${c.name}
    </div>
  `).join("");

  box.querySelectorAll(".autocomplete-item").forEach(item => {
    // Safari sometimes needs 'touchstart' or specific cursor styles to trigger clicks
    item.onclick = function() {
      const index = Number(this.dataset.index);
      selectCustomer(customerResults[index]);
    };
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
  })).filter(item => item.qty > 0);

  if (!state.cart.length) {
    alert("Add at least one product.");
    return;
  }

  alert(`Reviewing order for ${state.customer.name} with ${state.cart.length} items.`);
  console.log("Final State:", state);
}

/******** INIT ********/
loadProducts();
render();
