const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

let products = [];
let state = {
  step: 1,
  customer: null,
  cart: [],
  salesOverride: false
};

function parseCSV(t) {
  const l = t.trim().split("\n");
  const h = l.shift().split(",");
  return l.map(r => {
    const v = r.split(",");
    let o = {};
    h.forEach((k,i)=>o[k.trim()] = (v[i]||"").trim());
    return o;
  });
}

async function loadProducts() {
  const t = await (await fetch(PRODUCT_CSV_URL)).text();
  products = parseCSV(t).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"]),
    low: Number(p["Qty in stock"]) < 10
  }));
  render();
}

function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <div class="customer-search">
          <input id="cust" placeholder="Search customer..." oninput="searchCustomer(this.value)">
          <div id="autocomplete-results"></div>
        </div>
      </div>`;
  }

  if (state.step === 2) {
    el.innerHTML = `<div class="card">
      <h2>Select Products</h2>
      <div class="product-grid">`;

    products.forEach((p,i)=>{
      el.innerHTML += `
        <div class="product-card ${p.low ? "low-stock":""}">
          <strong>${p.name}</strong><br>
          $${p.price.toFixed(2)}
          ${p.low ? "<div style='color:red'>Low Stock</div>":""}
          <input type="number" min="0" id="q-${i}" placeholder="Qty">
        </div>`;
    });

    el.innerHTML += `
      </div>
      <button onclick="review()">Review Order</button>
    </div>`;
  }

  if (state.step === 3) {
    let subtotal=0, cases=0, keg=0;

    el.innerHTML = `<div class="card print-area">
      <h2>Review Order</h2>
      <p>
        <strong>${state.customer.name}</strong><br>
        ${state.customer.address}<br>
        ${state.customer.city}, ${state.customer.state} ${state.customer.zip}
      </p>
      <hr>
      <table class="review-table">
        <tr><th>Product</th><th>Qty</th><th>Total</th></tr>`;

    state.cart.forEach(i=>{
      const line=i.qty*i.price;
      subtotal+=line;
      if(/case/i.test(i.name)) cases+=i.qty;
      if(/keg/i.test(i.name)) keg+=i.qty*30;
      el.innerHTML+=`<tr><td>${i.name}</td><td>${i.qty}</td><td>$${line.toFixed(2)}</td></tr>`;
    });

    const discount = cases>=10 ? subtotal*0.1 : 0;
    const tax = (!state.salesOverride && state.customer.businessType==="Restaurant")
      ? subtotal*0.06 : 0;

    el.innerHTML+=`</table>
      <p>Subtotal: $${subtotal.toFixed(2)}</p>
      <p>Discount: -$${discount.toFixed(2)}</p>
      <p>Tax: $${tax.toFixed(2)}</p>
      <p>Keg Deposit: $${keg.toFixed(2)}</p>
      <h3>Total: $${(subtotal-discount+tax+keg).toFixed(2)}</h3>

      <label><input type="checkbox" id="override"> Sales Rep Override</label><br><br>
      <label><input type="checkbox" id="agree"> I agree this order is binding</label>

      <div class="actions">
        <button onclick="state.step=2;render()">Back</button>
        <button onclick="print()">Print</button>
        <button onclick="submit()">Email Order</button>
      </div>
    </div>`;
  }
}

async function searchCustomer(q) {
  if (q.length < 2) return;
  const r = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
  const d = await r.json();
  const box = document.getElementById("autocomplete-results");
  box.innerHTML = "";
  d.results.forEach(c=>{
    const div=document.createElement("div");
    div.className="autocomplete-item";
    div.textContent=c.name;
    div.onclick=()=>{state.customer=c;state.step=2;render();}
    box.appendChild(div);
  });
}

function review() {
  state.cart = products.map((p,i)=>({
    ...p,
    qty:Number(document.getElementById(`q-${i}`).value||0)
  })).filter(i=>i.qty>0);

  if (!state.cart.length) return alert("Add items");
  state.step=3;
  render();
}

async function submit() {
  if (!document.getElementById("agree").checked) {
    alert("Agreement required");
    return;
  }
  state.salesOverride=document.getElementById("override").checked;
  await fetch(API_URL,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});
  alert("Order emailed");
  location.reload();
}

loadProducts();
render();
