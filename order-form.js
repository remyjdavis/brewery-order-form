/******** CONFIG ********/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "PUT_YOUR_PUBLISHED_CSV_URL_HERE";

/******** STATE ********/
let products = [];
let state = {
  step: 1,
  customer: null,
  cart: []
};

/******** CSV PARSER ********/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const rawHeaders = lines.shift().split(",");

  // normalize headers
  const headers = rawHeaders.map(h =>
    h.toLowerCase().replace(/\s+/g, " ").trim()
  );

  return lines.map(line => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || "").trim();
    });
    return obj;
  });
}

/******** LOAD PRODUCTS — BULLETPROOF ********/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();
  const rows = parseCSV(text);

  products = rows.map((row, index) => {
    const name =
      row["product name"] ||
      row["name"] ||
      row["product"] ||
      "";

    const price =
      Number(row["price"]) ||
      Number(row["unit price"]) ||
      0;

    const stock =
      Number(
        row["qty in stock"] ||
        row["quantity in stock"] ||
        row["stock"] ||
        row["inventory"] ||
        0
      );

    return {
      name,
      price,
      stock
    };
  }).filter(p => p.name); // remove empty rows

  render();
}

/******** AUTOCOMPLETE — UNTOUCHED ********/
async function fetchCustomers(q) {
  if (q.length < 2) return [];
  const r = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const d = await r.json();
  return d.results || [];
}

function bindAutocomplete() {
  const input = document.getElementById("customer-input");
  const box = document.getElementById("autocomplete-results");

  input.addEventListener("input", async () => {
    box.innerHTML = "";
    const val = input.value.trim();
    if (val.length < 2) return;

    const results = await fetchCustomers(val);
    results.forEach(c => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = `${c.name} — ${c.city}, ${c.state}`;
      div.dataset.customer = JSON.stringify(c);
      box.appendChild(div);
    });
  });
}

document.addEventListener("click", e => {
  if (!e.target.classList.contains("autocomplete-item")) return;
  state.customer = JSON.parse(e.target.dataset.customer);
  state.step = 2;
  render();
});

/******** RENDER ********/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <div class="autocomplete-wrapper">
          <input id="customer-input" placeholder="Start typing customer name">
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;
    bindAutocomplete();
  }

  if (state.step === 2) {
    let html = `<div class="card"><h2>Select Products</h2><div class="grid">`;

    products.forEach((p, i) => {
      html += `
        <div class="product-card">
          <strong>${p.name}</strong>
          $${p.price.toFixed(2)}<br>
          In Stock: ${p.stock}
          <input type="number" min="0" max="${p.stock}" id="q-${i}">
        </div>`;
    });

    html += `
      </div>
      <button class="primary" onclick="review()">Review Order</button>
      </div>`;

    el.innerHTML = html;
  }

  if (state.step === 3) {
    let subtotal = 0;
    let html = `
      <div class="card">
      <h2>Review Order</h2>
      <table class="review-table">
      <tr><th>Product</th><th>Qty</th><th>Total</th></tr>`;

    state.cart.forEach(i => {
      const line = i.qty * i.price;
      subtotal += line;
      html += `
        <tr>
          <td>${i.name}</td>
          <td>${i.qty}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>`;
    });

    html += `
      </table>
      <h3>Total: $${subtotal.toFixed(2)}</h3>
      <button onclick="state.step=2;render()">Back</button>
      <button class="primary">Submit</button>
      </div>`;

    el.innerHTML = html;
  }
}

/******** REVIEW ********/
function review() {
  state.cart = products.map((p, i) => {
    const qty = Number(document.getElementById(`q-${i}`).value || 0);
    if (qty > p.stock) return null;
    return qty > 0 ? { ...p, qty } : null;
  }).filter(Boolean);

  if (!state.cart.length) {
    alert("Please add at least one product.");
    return;
  }

  state.step = 3;
  render();
}

/******** INIT ********/
loadProducts();
render();
