/**************** CONFIG ****************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/**************** STATE ****************/
let products = [];
let state = {
  step: 1,
  customer: null,
  cart: []
};

/**************** CSV ****************/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(row => {
    const values = row.split(",");
    let obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || "").trim();
    });
    return obj;
  });
}

/**************** LOAD PRODUCTS ****************/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();

  products = parseCSV(text).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"])
  }));

  render();
}

/**************** RENDER ****************/
function render() {
  const container = document.getElementById("form-container");
  container.innerHTML = "";

  /* ================= STEP 1 ================= */
  if (state.step === 1) {
    container.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>

        <div class="autocomplete-wrapper">
          <input
            class="search-input"
            id="customer-search"
            placeholder="Start typing customer name..."
            oninput="autocomplete(this.value)"
          />
          <div id="results" class="results"></div>
        </div>
      </div>
    `;
    return;
  }

  /* ================= STEP 2 ================= */
  if (state.step === 2) {
    container.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
        <div id="product-grid" class="grid"></div>
        <button onclick="review()">Review Order</button>
      </div>
    `;

    const grid = document.getElementById("product-grid");

    products.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "product-card";

      card.innerHTML = `
        <strong>${p.name}</strong>
        <div>$${p.price.toFixed(2)}</div>
        <input type="number" min="0" id="qty-${i}" placeholder="Qty">
      `;

      grid.appendChild(card);
    });

    return;
  }

  /* ================= STEP 3 ================= */
  if (state.step === 3) {
    let subtotal = 0;
    let keg = 0;
    let cases = 0;

    const rows = state.cart.map(item => {
      const line = item.qty * item.price;
      subtotal += line;
      if (/keg/i.test(item.name)) keg += item.qty * 30;
      if (/case/i.test(item.name)) cases += item.qty;

      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>$${item.price.toFixed(2)}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

    const discount = cases >= 10 ? subtotal * 0.1 : 0;
    const tax =
      state.customer.businessType === "Restaurant" ? subtotal * 0.06 : 0;

    const total = subtotal - discount + tax + keg;

    container.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>

        <p>
          <strong>${state.customer.name}</strong><br>
          ${state.customer.address}<br>
          ${state.customer.city}, ${state.customer.state} ${state.customer.zip}
        </p>

        <hr>

        <table class="review-table">
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
          ${rows}
        </table>

        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Discount: -$${discount.toFixed(2)}</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>Keg Deposit: $${keg.toFixed(2)}</p>

        <h3>Total: $${total.toFixed(2)}</h3>

        <button onclick="submit()">Submit Order</button>
      </div>
    `;
  }
}

/**************** AUTOCOMPLETE ****************/
async function autocomplete(value) {
  if (value.length < 2) {
    document.getElementById("results").innerHTML = "";
    return;
  }

  const res = await fetch(`${API_URL}?q=${encodeURIComponent(value)}`);
  const data = await res.json();

  const results = document.getElementById("results");
  results.innerHTML = "";

  data.results.forEach(c => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.textContent = c.name;
    div.onclick = () => selectCustomer(c);
    results.appendChild(div);
  });
}

function selectCustomer(customer) {
  state.customer = customer;
  state.step = 2;
  render();
}

/**************** REVIEW ****************/
function review() {
  state.cart = products.map((p, i) => ({
    name: p.name,
    price: p.price,
    qty: Number(document.getElementById(`qty-${i}`).value || 0)
  })).filter(i => i.qty > 0);

  if (!state.cart.length) {
    alert("Please select at least one product.");
    return;
  }

  state.step = 3;
  render();
}

/**************** SUBMIT ****************/
async function submit() {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: state.customer,
      items: state.cart
    })
  });

  alert("Order submitted successfully.");
  location.reload();
}

/**************** INIT ****************/
loadProducts();
render();
