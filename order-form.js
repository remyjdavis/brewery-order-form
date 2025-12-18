/******** CONFIG ********/
const API_URL = "PASTE_YOUR_WEB_APP_EXEC_URL_HERE";
const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/******** STATE ********/
let products = [];
let state = {
  step: 1,
  customer: null,
  cart: [],
  taxRate: 0
};

/******** CSV ********/
function parseCSV(t) {
  const l = t.trim().split("\n");
  const h = l.shift().split(",");
  return l.map(r => {
    const v = r.split(",");
    let o = {};
    h.forEach((k,i)=>o[k.trim()]=(v[i]||"").trim());
    return o;
  });
}

/******** LOAD PRODUCTS ********/
async function loadProducts() {
  const t = await (await fetch(PRODUCT_CSV_URL)).text();
  products = parseCSV(t).map(p => ({
    name: p["Product Name"],
    price: Number(p["Price"])
  }));
  render();
}

/******** AUTOCOMPLETE ********/
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

  /* STEP 1 */
  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>
        <input id="cust" placeholder="Search customer..." oninput="autocomplete(this.value)">
        <div id="results"></div>
      </div>`;
  }

  /* STEP 2 */
  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Products</h2>`;
    products.forEach((p,i)=>{
      el.innerHTML += `
        <div>
          ${p.name} ($${p.price.toFixed(2)})
          <input type="number" min="0" id="q-${i}">
        </div>`;
    });
    el.innerHTML += `<button onclick="review()">Review</button></div>`;
  }

  /* STEP 3 */
  if (state.step === 3) {
    let subtotal=0,keg=0,cases=0;

    el.innerHTML = `<div class="card"><h2>Review</h2>
      <p><strong>${state.customer.name}</strong><br>
      ${state.customer.address}<br>
      ${state.customer.city}, ${state.customer.state} ${state.customer.zip}</p>
      <hr><table><tr><th>Product</th><th>Qty</th><th>Total</th></tr>`;

    state.cart.forEach(i=>{
      const line=i.qty*i.price;
      subtotal+=line;
      if(/keg/i.test(i.name)) keg+=i.qty*30;
      if(/case/i.test(i.name)) cases+=i.qty;
      el.innerHTML+=`<tr><td>${i.name}</td><td>${i.qty}</td><td>$${line.toFixed(2)}</td></tr>`;
    });

    const discount=cases>=10?subtotal*0.1:0;
    const tax=state.customer.businessType==="Restaurant"?subtotal*0.06:0;

    el.innerHTML+=`</table>
      <p>Subtotal: $${subtotal.toFixed(2)}</p>
      <p>Discount: -$${discount.toFixed(2)}</p>
      <p>Tax: $${tax.toFixed(2)}</p>
      <p>Keg Deposit: $${keg.toFixed(2)}</p>
      <h3>Total: $${(subtotal-discount+tax+keg).toFixed(2)}</h3>
      <button onclick="submit()">Submit</button></div>`;
  }
}

/******** ACTIONS ********/
async function autocomplete(val) {
  const r = await searchCustomers(val);
  const box = document.getElementById("results");
  box.innerHTML = r.map(c =>
    `<div onclick='selectCustomer(${JSON.stringify(c)})'>${c.name}</div>`
  ).join("");
}

function selectCustomer(c) {
  state.customer = c;
  state.step = 2;
  render();
}

function review() {
  state.cart = products.map((p,i)=>({
    ...p,
    qty:Number(document.getElementById(`q-${i}`).value||0)
  })).filter(i=>i.qty>0);

  if (!state.cart.length) return alert("Add items");
  state.step = 3;
  render();
}

async function submit() {
  await fetch(API_URL, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ customer:state.customer, items:state.cart })
  });
  alert("Order submitted");
  location.reload();
}

/******** INIT ********/
loadProducts();
render();
