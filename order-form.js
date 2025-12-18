/******** CONFIG ********/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/******** STATE ********/
let products = [];
let state = { step: 1, customer: null, cart: [] };

/******** CSV ********/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(l => {
    const v = l.split(",");
    let o = {};
    headers.forEach((h,i)=>o[h.trim()] = (v[i]||"").trim());
    return o;
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
  render();
}

/******** SEARCH ********/
async function searchCustomers(q) {
  if (q.length < 2) return [];
  const r = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const d = await r.json();
  return d.results || [];
}

/******** RENDER ********/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML = `
      <div class="card autocomplete-wrapper">
        <h2>Select Customer</h2>
        <input class="search-input"
          oninput="handleSearch(this.value)"
          placeholder="Type customer name">
        <div id="results" class="results"></div>
      </div>`;
  }

  if (state.step === 2) {
    el.innerHTML = `<div class="card">
      <h2>Products</h2>
      <div class="grid">`;

    products.forEach((p,i)=>{
      el.innerHTML += `
        <div class="product-card">
          <strong>${p.name}</strong><br>
          $${p.price.toFixed(2)}
          <input type="number" min="0" id="q-${i}">
        </div>`;
    });

    el.innerHTML += `
      </div>
      <button onclick="review()">Review Order</button>
    </div>`;
  }
}

/******** ACTIONS ********/
async function handleSearch(val) {
  const results = await searchCustomers(val);
  const box = document.getElementById("results");
  box.innerHTML = "";

  results.forEach(c => {
    const d = document.createElement("div");
    d.className = "result-item";
    d.textContent = c.name;
    d.onclick = () => {
      state.customer = c;
      state.step = 2;
      render();
    };
    box.appendChild(d);
  });
}

function review() {
  state.cart = products.map((p,i)=>({
    ...p,
    qty: Number(document.getElementById(`q-${i}`).value || 0)
  })).filter(i=>i.qty>0);

  if (!state.cart.length) return alert("Add items");
  alert("Review step next (logic intact)");
}

/******** INIT ********/
loadProducts();
render();
