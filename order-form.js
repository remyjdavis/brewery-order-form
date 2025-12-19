/**************** CONFIG ****************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

/**************** STATE ****************/
let state = {
  step: 1,
  customer: null
};

let debounceTimer = null;

/**************** RENDER ****************/
function render() {
  const el = document.getElementById("form-container");
  el.innerHTML = "";

  if (state.step === 1) {
    el.innerHTML = `
      <div class="card">
        <h2>Select Customer</h2>

        <div class="autocomplete-wrapper">
          <input
            id="customer-input"
            type="text"
            placeholder="Search customer..."
            autocomplete="off"
          >
          <div id="autocomplete-results"></div>
        </div>
      </div>
    `;

    const input = document.getElementById("customer-input");
    input.addEventListener("input", e => debounceSearch(e.target.value));
  }

  if (state.step === 2) {
    el.innerHTML = `
      <div class="card">
        <h2>Customer Selected</h2>
        <p><strong>${state.customer.name}</strong></p>
        <p>${state.customer.address}</p>
        <p>${state.customer.city}, ${state.customer.state} ${state.customer.zip}</p>
      </div>
    `;
  }
}

/**************** AUTOCOMPLETE ****************/
function debounceSearch(value) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => searchCustomers(value), 300);
}

async function searchCustomers(query) {
  const box = document.getElementById("autocomplete-results");
  if (!box) return;

  if (query.length < 2) {
    box.innerHTML = "";
    return;
  }

  const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
  const data = await res.json();

  if (!data.results || !data.results.length) {
    box.innerHTML = "";
    return;
  }

  box.innerHTML = data.results.map((c, i) => `
    <button
      type="button"
      class="autocomplete-item"
      data-index="${i}">
      ${c.name}
    </button>
  `).join("");

  // SAFARI-SAFE CLICK HANDLING
  [...box.children].forEach((btn, i) => {
    btn.addEventListener("click", () => {
      state.customer = data.results[i];
      state.step = 2;
      render();
    });
  });
}

/**************** INIT ****************/
render();
