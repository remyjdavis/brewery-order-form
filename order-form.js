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

/******** CSV ********/
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(l => {
    const v = l.split(",");
    let o = {};
    headers.forEach((h, i) => o[h.trim()] = (v[i] || "").trim());
    return o;
  });
}

/******** LOAD PRODUCTS ********/
async function loadProducts() {
  const text = await (await fetch(PRODUCT_CSV_URL)).text();
  products = parseCSV(text).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"]),
    inventory: Number(p["Qty in stock"] || 0)
  }));
  render();
}

/******** CUSTOMER SEARCH ********/
async function autocomplete(val) {
  if (val.length < 2) return;
  const res = await fetch(`${API_URL}?q=${encodeURIComponent(val)}`);
  const data = await res.json();

  const box = document.getElementById("results");
  box.innerHTML = "";

  data.results.forEach(c => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.textContent = c.name;
    div.onclick = () => {
      state.customer = c;
      state.step = 2;
      render();
    };
    box.appendChild(div);
  });
}

/******** RENDER ********/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  /* STEP 1 */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <input placeholder="Search customer..." oninput="autocomplete(this.value)">
        <div id="results"></div>
      </div>`;
  }

  /* STEP 2 */
  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Products</h2>
        <div class="grid">
          ${products.map((p,i)=>`
            <div class="product-card">
              <strong>${p.name}</strong><br>
              $${p.price.toFixed(2)}<br>
              ${p.inventory <= 10 ? `<span class="stock very-low">LOW STOCK</span>` : ""}
              <input type="number" min="0" id="q-${i}" placeholder="Qty">
            </div>
          `).join("")}
        </div>
        <button onclick="review()">Review Order</button>
      </div>`;
  }

  /* STEP 3 */
  if (state.step === 3) {
    let subtotal = 0, cases = 0, keg = 0;

    el.innerHTML = `
      <div class="card">
        <h2>Review Order</h2>
        <p>
          <strong>${state.customer.name}</strong><br>
          ${state.customer.address}<br>
          ${state.customer.city}, ${state.customer.state} ${state.customer.zip}
        </p>
        <hr>
        <table class="review-table">
          <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
          ${state.cart.map(i=>{
            const line=i.qty*i.price;
            subtotal+=line;
            if(/case/i.test(i.name)) cases+=i.qty;
            if(/keg/i.test(i.name)) keg+=i.qty*30;
            return `<tr><td>${i.name}</td><td>${i.qty}</td><td>$${line.toFixed(2)}</td></tr>`;
          }).join("")}
        </table>`;

    const discount = cases >= 10 ? subtotal * 0.10 : 0;
    const tax = state.customer.businessType === "Restaurant" ? subtotal * 0.06 : 0;
    const total = subtotal - discount + tax + keg;

    el.innerHTML += `
      <p>Subtotal: $${subtotal.toFixed(2)}</p>
      <p>Discount: -$${discount.toFixed(2)}</p>
      <p>Tax: $${tax.toFixed(2)}</p>
      <p>Keg Deposit: $${keg.toFixed(2)}</p>
      <h3>Total: $${total.toFixed(2)}</h3>

      <div class="rep-override">
        <label><input type="checkbox" id="repOverride"> Sales Rep Override</label>
      </div>

      <button onclick="window.print()">Print Invoice</button>
      <button onclick="emailFlow()">Email Invoice</button>

      <div id="emailBox" style="display:none">
        <input id="emailInput" placeholder="Enter email address">
        <button onclick="submit()">Send Email</button>
      </div>
    </div>`;
  }
}

/******** ACTIONS ********/
function review() {
  state.cart = products.map((p,i)=>({
    ...p,
    qty:Number(document.getElementById(`q-${i}`).value||0)
  })).filter(i=>i.qty>0);

  if (!state.cart.length) return alert("Select products");
  state.step = 3;
  render();
}

function emailFlow() {
  document.getElementById("emailBox").style.display = "block";
}

async function submit() {
  await fetch(API_URL,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      customer: state.customer,
      items: state.cart,
      email: document.getElementById("emailInput").value,
      repOverride: document.getElementById("repOverride").checked
    })
  });
  alert("Order sent");
  location.reload();
}

/******** INIT ********/
loadProducts();
render();
