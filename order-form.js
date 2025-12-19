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

/**************** CSV PARSER ****************/
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

/**************** LOAD PRODUCTS ****************/
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

/**************** AUTOCOMPLETE ****************/
async function handleAutocomplete(val) {
  const box = document.getElementById("autocomplete-results");
  box.innerHTML = "";

  if (val.length < 2) return;

  const res = await fetch(`${API_URL}?q=${encodeURIComponent(val)}`);
  const data = await res.json();

  data.results.forEach(c => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.textContent = c.name;
    div.onclick = () => selectCustomer(c);
    box.appendChild(div);
  });
}

function selectCustomer(customer) {
  state.customer = customer;
  state.step = 2;
  render();
}

/**************** RENDER ****************/
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
            placeholder="Search customer..."
            oninput="handleAutocomplete(this.value)"
          >
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;
    return;
  }

  /* STEP 2 — PRODUCT GRID (LOCKED) */
  if (state.step === 2) {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `<h2>Select Products</h2>`;

    const grid = document.createElement("div");
    grid.className = "grid";

    products.forEach((p, i) => {
      const prod = document.createElement("div");
      prod.className = "product-card";

      prod.innerHTML = `
        <strong>${p.name}</strong>
        <div>Price: $${p.price.toFixed(2)}</div>
        <div>In Stock: ${p.stock}</div>
        ${p.stock <= 5 ? `<div style="color:red;">Low stock</div>` : ""}
        <input
          type="number"
          min="0"
          max="${p.stock}"
          id="q-${i}"
        >
      `;

      grid.appendChild(prod);
    });

    card.appendChild(grid);

    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "Review Order";
    btn.onclick = review;

    card.appendChild(btn);
    el.appendChild(card);
    return;
  }

  /* STEP 3 — REVIEW */
  if (state.step === 3) {
    let subtotal = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>
        <p>
          <strong>${state.customer.name}</strong><br>
          ${state.customer.address}<br>
          ${state.customer.city}, ${state.customer.state} ${state.customer.zip}
        </p>

        <table class="review-table">
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
          ${state.cart.map(i => {
            const line = i.qty * i.price;
            subtotal += line;
            return `
              <tr>
                <td>${i.name}</td>
                <td>${i.qty}</td>
                <td>$${line.toFixed(2)}</td>
              </tr>
            `;
          }).join("")}
        </table>

        <h3>Total: $${subtotal.toFixed(2)}</h3>

        <button onclick="state.step=2;render()">Back</button>
        <button class="primary" onclick="submit()">Submit</button>
      </div>
    `;
  }
}

/**************** ACTIONS ****************/
function review() {
  state.cart = [];

  products.forEach((p, i) => {
    const qty = Number(document.getElementById(`q-${i}`).value || 0);
    if (qty > 0) {
      if (qty > p.stock) {
        alert(`Only ${p.stock} units available for ${p.name}`);
        return;
      }
      state.cart.push({
        name: p.name,
        price: p.price,
        qty: qty
      });
    }
  });

  if (!state.cart.length) {
    alert("Please add at least one product.");
    return;
  }

  state.step = 3;
  render();
}

async function submit() {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: state.customer,
      items: state.cart
    })
  });

  alert("Order submitted successfully");
  location.reload();
}

/**************** INIT ****************/
loadProducts();
render();
