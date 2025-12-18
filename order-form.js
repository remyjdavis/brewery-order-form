const PRODUCTS = [
  { id: "BEER001", name: "Pale Ale – Case (24)", check: 45, fintech: 50 },
  { id: "BEER002", name: "IPA – Case (24)", check: 50, fintech: 55 },
  { id: "BEER003", name: "Lager – Keg (50L)", check: 120, fintech: 130 }
];

let state = {
  step: 1,
  customer: {},
  cart: []
};

function render() {
  var el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML =
      '<div class="card">' +
        '<h2>Store Information</h2>' +
        '<input id="store" placeholder="Store Name">' +
        '<input id="contact" placeholder="Contact Name">' +
        '<input id="email" placeholder="Email">' +
        '<label>Payment Method</label>' +
        '<select id="payment">' +
          '<option value="check">Check</option>' +
          '<option value="fintech">Fintech</option>' +
        '</select>' +
        '<p style="font-size:12px;color:#666;margin-top:4px;">' +
          'Fintech = electronic payment (Beer30, Encompass, etc.)' +
        '</p>' +
        '<button onclick="nextStep()">Next</button>' +
      '</div>';
  }

  if (state.step === 2) {
    el.innerHTML = '<div class="card"><h2>Select Products</h2>';

    PRODUCTS.forEach(function(p) {
      el.innerHTML +=
        '<div class="product">' +
          '<div>' + p.name + '</div>' +
          '<input type="number" min="0" id="q-' + p.id + '" placeholder="Qty">' +
        '</div>';
    });

    el.innerHTML += '<button onclick="review()">Review Order</button></div>';
  }

  if (state.step === 3) {
    var total = 0;

    el.innerHTML =
      '<div class="card">' +
        '<h2>Review Order</h2>' +
        '<p><strong>' + state.customer.store + '</strong><br>' +
          state.customer.contact + '<br>' +
          state.customer.email + '<br>' +
          'Payment: ' + state.customer.payment +
        '</p>';

    state.cart.forEach(function(i) {
      var price = state.customer.payment === "check" ? i.check : i.fintech;
      total += price * i.qty;
      el.innerHTML +=
        '<p>' + i.name + ' x ' + i.qty + ' = $' + (price * i.qty) + '</p>';
    });

    el.innerHTML +=
        '<h3>Total: $' + total + '</h3>' +
        '<button onclick="submitOrder()">Submit Order (Test)</button>' +
      '</div>';
  }

  if (state.step === 4) {
    el.innerHTML =
      '<div class="card">' +
        '<h2>Order Submitted</h2>' +
        '<p>This is test mode. No data has been saved.</p>' +
      '</div>';
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
  state.cart = PRODUCTS.map(function(p) {
    return {
      id: p.id,
      name: p.name,
      check: p.check,
      fintech: p.fintech,
      qty: Number(document.getElementById("q-" + p.id).value)
    };
  }).filter(function(i) {
    return i.qty > 0;
  });

  state.step = 3;
  render();
}

function submitOrder() {
  state.step = 4;
  render();
}

render();
