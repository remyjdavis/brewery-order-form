/**************** CONFIG ****************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

/**************** STATE ****************/
let products = [];
let state = {
  step: 1,
  customer: null,
  cart: []
};

/**************** LOAD PRODUCTS (FROM SHEET) ****************/
async function loadProducts() {
  const res = await fetch(`${API_URL}?products=1`);
  products = await res.json();
  render();
}

/**************** CUSTOMER SEARCH ****************/
async function searchCustomers(q) {
  if (q.length < 2) return [];
  const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  return data.results || [];
}

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <div class="autocomplete-wrapper">
          <input id="customer-input" placeholder="Start typing customer name" autocomplete="off">
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;

    const input = document.getElementById("customer-input");
    const results = document.getElementById("autocomplete-results");

    input.addEventListener("input", async () => {
      results.innerHTML = "";
      const matches = await searchCustomers(input.value);
      matches.forEach(c => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.textContent = c.name;
        div.onclick = () => {
          state.customer = c;
          state.step = 2;
          render();
        };
        results.appendChild(div);
      });
    });
  }

  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
        <div class="grid" id="product-grid"></div>
        <button class="primary" onclick="review()">Review Order</button>
      </div>
    `;

    const grid = document.getElementById("product-grid");

    products.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "product-card";

      const low = p.stock > 0 && p.stock <= 10
        ? `<div style="color:red;font-size:12px;">Low stock (${p.stock})</div>`
        : "";

      div.innerHTML = `
        <strong>${p.name}</strong>
        <div>$${p.price.toFixed(2)}</div>
        ${low}
        <input type="number" min="0" max="${p.stock}" id="q-${i}">
      `;
      grid.appendChild(div);
    });
  }

  if (state.step === 3) {
    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>
        <table class="review-table">
          <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
        </table>
        <button onclick="state.step=2;render()">Back</button>
        <button class="primary" onclick="submit()">Submit</button>
      </div>
    `;

    const table = el.querySelector(".review-table");

    state.cart.forEach(i => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i.name}</td>
        <td>${i.qty}</td>
        <td>$${(i.qty * i.price).toFixed(2)}</td>
      `;
      table.appendChild(tr);
    });
  }
}

/**************** ACTIONS ****************/
function review() {
  state.cart = [];

  products.forEach((p, i) => {
    const qty = Number(document.getElementById(`q-${i}`).value || 0);

    if (qty > p.stock) {
      alert(`Only ${p.stock} available for ${p.name}`);
      return;
    }

    if (qty > 0) {
      state.cart.push({ name: p.name, price: p.price, qty });
    }
  });

  if (!state.cart.length) return alert("Add at least one product");
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

  alert("Order submitted");
  location.reload();
}

/**************** INIT ****************/
loadProducts();
render();
