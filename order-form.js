/******** CONFIG ********/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/******** STATE ********/
let products = [];
let state = {
  step: 1,
  customer: null,
  cart: []
};

let resultsBox;

/******** CSV ********/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const vals = line.split(",");
    let obj = {};
    headers.forEach((h, i) => (obj[h.trim()] = (vals[i] || "").trim()));
    return obj;
  });
}

/******** LOAD PRODUCTS ********/
async function loadProducts() {
  const res = await fetch(PRODUCT_CSV_URL);
  const text = await res.text();
  products = parseCSV(text).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"])
  }));
}

/******** AUTOCOMPLETE ********/
async function handleAutocomplete(e) {
  const q = e.target.value.trim();
  clearResults();

  if (q.length < 2) return;

  const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const data = await res.json();

  if (!data.results || !data.results.length) return;

  const rect = e.target.getBoundingClientRect();

  resultsBox.style.left = rect.left + "px";
  resultsBox.style.top = rect.bottom + "px";
  resultsBox.style.width = rect.width + "px";
  resultsBox.style.display = "block";

  data.results.forEach(customer => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.textContent = customer.name;

    // SAFARI-SAFE EVENT
    div.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      selectCustomer(customer);
    });

    resultsBox.appendChild(div);
  });
}

function clearResults() {
  resultsBox.innerHTML = "";
  resultsBox.style.display = "none";
}

/******** SELECT CUSTOMER ********/
function selectCustomer(customer) {
  state.customer = customer;
  state.step = 2;
  clearResults();
  render();
}

/******** RENDER ********/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <input
          id="customer-input"
          type="text"
          placeholder="Start typing customer name…"
          autocomplete="off"
        />
      </div>
    `;

    document
      .getElementById("customer-input")
      .addEventListener("input", handleAutocomplete);
  }

  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Products</h2>`;

    products.forEach((p, i) => {
      el.innerHTML += `
        <div>
          ${p.name} ($${p.price.toFixed(2)})
          <input type="number" min="0" id="q-${i}">
        </div>
      `;
    });

    el.innerHTML += `<button onclick="review()">Review Order</button></div>`;
  }

  if (state.step === 3) {
    let subtotal = 0,
      keg = 0,
      cases = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review</h2>
        <p>
          <strong>${state.customer.name}</strong><br>
          ${state.customer.address}<br>
          ${state.customer.city}, ${state.customer.state} ${state.customer.zip}<br>
          ${state.customer.businessType}
        </p>
        <hr>
        <table>
          <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
    `;

    state.cart.forEach(i => {
      const line = i.qty * i.price;
      subtotal += line;
      if (/keg/i.test(i.name)) keg += i.qty * 30;
      if (/case/i.test(i.name)) cases += i.qty;

      el.innerHTML += `
        <tr>
          <td>${i.name}</td>
          <td>${i.qty}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>`;
    });

    const discount = cases >= 10 ? subtotal * 0.1 : 0;
    const tax =
      state.customer.businessType === "Restaurant" ? subtotal * 0.06 : 0;

    el.innerHTML += `
        </table>
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Discount: -$${discount.toFixed(2)}</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>Keg Deposit: $${keg.toFixed(2)}</p>
        <h3>Total: $${(subtotal - discount + tax + keg).toFixed(2)}</h3>
        <button onclick="submitOrder()">Submit</button>
      </div>`;
  }
}

/******** ACTIONS ********/
function review() {
  state.cart = products
    .map((p, i) => ({
      name: p.name,
      price: p.price,
      qty: Number(document.getElementById(`q-${i}`).value || 0)
    }))
    .filter(i => i.qty > 0);

  if (!state.cart.length) return alert("Add products");
  state.step = 3;
  render();
}

async function submitOrder() {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer: state.customer, items: state.cart })
  });
  alert("Order submitted");
  location.reload();
}

/******** INIT ********/
document.addEventListener("DOMContentLoaded", async () => {
  resultsBox = document.createElement("div");
  resultsBox.id = "autocomplete-root";
  document.body.appendChild(resultsBox);

  await loadProducts();
  render();
});
