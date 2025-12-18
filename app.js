const PRODUCTS = [
  { id: "BEER001", name: "Pale Ale – Case (24)", prepaid: 45, invoice: 50 },
  { id: "BEER002", name: "IPA – Case (24)", prepaid: 50, invoice: 55 },
  { id: "BEER003", name: "Lager – Keg (50L)", prepaid: 120, invoice: 130 }
];

let state = {
  step: 1,
  customer: {},
  cart: []
};

function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Store Information</h2>
        <input id="store" placeholder="Store Name">
        <input id="contact" placeholder="Contact Name">
        <input id="email" placeholder="Email">
        <select id="payment">
          <option value="prepaid">Prepaid</option>
          <option value="invoice">Invoice</option>
        </select>
        <button onclick="nextStep()">Next</button>
      </div>
    `;
  }

  if (state.step === 2) {
    el.innerHTML = `<div class="card"><h2>Select Products</h2>`;
    PRODUCTS.forEach(p => {
      el.innerHTML += `
        <div class="product">
          <div>${p.name}</div>
          <input type="number" min="0" id="q-${p.id}" placeholder="Qty">
        </div>
      `;
    });
    el.innerHTML += `<button onclick="review()">Review Order</button></div>`;
  }

  if (state.step === 3) {
    let total = 0;
    el.innerHTML = `<div class="card"><h2>Review Order</h2>`;
    state.cart.forEach(i => {
      const price = state.customer.payment === "prepaid" ? i.prepaid : i.invoice;
      total += price * i.qty;
      el.innerHTML += `<p>${i.name} x ${i.qty} = $${price * i.qty}</p>`;
    });
    el.innerHTML += `
      <h3>Total: $${total}</h3>
      <button onclick="submitOrder()">Submit Order (Test)</button>
    </div>`;
  }

  if (state.step === 4) {
    el.innerHTML = `
      <div class="card">
        <h2>Order Submitted</h2>
        <p>This is test mode. No data saved.</p>
      </div>
    `;
  }
}

function nextStep() {
  state.customer = {
    store: document.getElementById("store").value,
    contact: document.getElementById("contact").value,
    email: document.getElementById("email").value,
    payment: document.getElementById("payment").value
  };
  state.step = 2;
  render();
}

function review() {
  state.cart = PRODUCTS.map(p => ({
    ...p,
    qty: Number(document.getElementById(`q-${p.id}`).value)
  })).filter(i => i.qty > 0);
  state.step = 3;
  render();
}

function submitOrder() {
  state.step = 4;
  render();
}

render();
