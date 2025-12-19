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
  cart: [],
  taxRate: 0
};

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
    div.onclick = () => selectCustomer(c);
    box.appendChild(div);
  });
}

function selectCustomer(c) {
  state.customer = c;
  state.step = 2;
  render();
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
        <input id="cust" placeholder="Start typing store name…" oninput="autocomplete(this.value)">
        <div id="results"></div>
      </div>`;
  }

  /* STEP 2 */
  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Select Products</h2><div class="grid">`;
    products.forEach((p,i)=>{
      el.innerHTML += `
        <div class="product-card">
          <strong>${p.name}</strong><br>
          $${p.price.toFixed(2)}
          <input type="number" min="0" id="q-${i}" placeholder="Qty">
        </div>`;
    });
    el.innerHTML += `
      </div>
      <button onclick="review()">Review Order</button>
    </div>`;
  }

  /* STEP 3 */
  if (state.step === 3) {
    let subtotal=0,keg=0,cases=0;

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
          <tr><th>Product</th><th>Qty</th><th>Total</th></tr>`;

    state.cart.forEach(i=>{
      const line=i.qty*i.price;
      subtotal+=line;
      if(/keg/i.test(i.name)) keg+=i.qty*30;
      if(/case/i.test(i.name)) cases+=i.qty;

      el.innerHTML+=`
        <tr>
          <td>${i.name}</td>
          <td>${i.qty}</td>
          <td>$${line.toFixed(2)}</td>
        </tr>`;
    });

    const discount=cases>=10?subtotal*0.10:0;
    const tax=state.customer.businessType==="Restaurant"?subtotal*0.06:0;
    const total=subtotal-discount+tax+keg;

    el.innerHTML+=`
        </table>

        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Discount: -$${discount.toFixed(2)}</p>
        <p>Tax: $${tax.toFixed(2)}</p>
        <p>Keg Deposit: $${keg.toFixed(2)}</p>
        <h3>Total: $${total.toFixed(2)}</h3>

        <div class="agreement-box">
          <h4>Wholesale Order Agreement</h4>
          <p>
            By submitting this order, I confirm that I am an authorized
            representative of the business listed above and agree that this
            is a binding wholesale purchase order.
          </p>
          <label>
            <input type="checkbox" id="agree"> I agree to the Wholesale Order Agreement
          </label>
        </div>

        <button onclick="state.step=2;render()">Back</button>
        <button onclick="window.print()">Print</button>
        <button onclick="submit()">Email & Submit</button>
      </div>`;
  }
}

/******** ACTIONS ********/
function review() {
  state.cart = products.map((p,i)=>({
    ...p,
    qty:Number(document.getElementById(`q-${i}`).value||0)
  })).filter(i=>i.qty>0);

  if(!state.cart.length) {
    alert("Please add at least one product.");
    return;
  }
  state.step=3;
  render();
}

async function submit() {
  if (!document.getElementById("agree").checked) {
    alert("Agreement required.");
    return;
  }

  await fetch(API_URL,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ customer:state.customer, items:state.cart })
  });

  alert("Order submitted.");
  location.reload();
}

/******** INIT ********/
loadProducts();
render();
