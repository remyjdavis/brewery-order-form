/******** CONFIG ********/
const API_URL = "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";
const PRODUCT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/******** STATE ********/
let products = [];
let customerResults = [];
let state = { step: 1, customer: null, cart: [] };

/******** CSV PARSER ********/
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines.shift().split(",").map(h => h.trim());
  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || "").trim(); });
    return obj;
  });
}

/******** LOAD PRODUCTS ********/
async function loadProducts() {
  try {
    const res = await fetch(`${PRODUCT_CSV_URL}&t=${Date.now()}`);
    const text = await res.text();
    products = parseCSV(text).map(p => ({
      name: p["Product Name"] || "Unknown",
      price: parseFloat(p["Price"]) || 0,
      stock: parseInt(p["Qty In Stock"], 10) || 0
    }));
    render();
  } catch (err) { console.error("CSV Load Error:", err); }
}

/******** CUSTOMER SEARCH ********/
async function searchCustomers(query) {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error("Search Error:", err);
    return [];
  }
}

/******** RENDER ********/
function render() {
  const el = document.getElementById("form-container");
  if (!el) return;
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <div class="autocomplete-wrapper" style="position:relative;">
          <input id="customer-input" placeholder="Start typing name..." autocomplete="off" type="text" style="width:100%; box-sizing:border-box;">
          <div id="autocomplete-results" style="position:absolute; width:100%; background:white; border:1px solid #ccc; z-index:9999; max-height:200px; overflow-y:auto; display:none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
        </div>
      </div>
    `;
    document.getElementById("customer-input").addEventListener("input", handleAutocomplete);
  }

  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Products for ${state.customer.name}</h2>
        <div class="grid">
          ${products.map((p, i) => `
            <div class="product-card">
              <strong>${p.name}</strong><br>
              $${p.price.toFixed(2)} | Stock: ${p.stock}<br>
              <input type="number" min="0" max="${p.stock}" id="qty-${i}" placeholder="0">
            </div>
          `).join("")}
        </div>
        <button class="primary" onclick="review()" style="margin-top:20px;">Review Order</button>
      </div>
    `;
  }
}

/******** AUTOCOMPLETE LOGIC ********/
async function handleAutocomplete(e) {
  const query = e.target.value;
  const box = document.getElementById("autocomplete-results");
  
  if (query.length < 2) {
    box.style.display = "none";
    return;
  }

  customerResults = await searchCustomers(query);

  if (customerResults.length > 0) {
    box.style.display = "block";
    box.innerHTML = customerResults.map((c, i) => `
      <div class="autocomplete-item" data-index="${i}" style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;">
        ${c.name}
      </div>
    `).join("");

    // Use event delegation for better mobile support
    box.onclick = (event) => {
      const item = event.target.closest('.autocomplete-item');
      if (item) {
        const index = item.getAttribute('data-index');
        selectCustomer(customerResults[index]);
      }
    };
  } else {
    box.style.display = "none";
  }
}

function selectCustomer(customer) {
  state.customer = customer;
  state.step = 2;
  render();
}

function review() {
  state.cart = products.map((p, i) => ({
    ...p,
    qty: Number(document.getElementById(`qty-${i}`).value || 0)
  })).filter(item => item.qty > 0);

  if (!state.cart.length) return alert("Add items first.");
  alert(`Order ready for ${state.customer.name}`);
}

loadProducts();
render();
