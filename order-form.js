/******** CONFIG ********/
const API_URL = "https://script.google.com/macros/s/AKfycbyT1PzljxVZ9NKBbgmAJ7kgPul228vnwrdjf_YRbzhIMR_rXhG2tx36-yzBHfFNH5DX/exec";

/******** STATE ********/
let state = {
  step: 1,
  customer: null
};

/******** AUTOCOMPLETE ********/
let debounceTimer = null;

function onCustomerInput(value) {
  clearTimeout(debounceTimer);
  if (value.length < 2) {
    clearResults();
    return;
  }

  debounceTimer = setTimeout(() => {
    fetchCustomers(value);
  }, 300);
}

async function fetchCustomers(query) {
  try {
    const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderResults(data.results || []);
  } catch (e) {
    console.error("Customer fetch failed", e);
  }
}

function renderResults(results) {
  const box = document.getElementById("autocomplete-results");
  box.innerHTML = "";

  results.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.textContent = `${c.name} — ${c.city}, ${c.state}`;
    div.addEventListener("click", () => selectCustomer(c));
    box.appendChild(div);
  });

  box.style.display = results.length ? "block" : "none";
}

function clearResults() {
  const box = document.getElementById("autocomplete-results");
  box.innerHTML = "";
  box.style.display = "none";
}

function selectCustomer(customer) {
  state.customer = customer;
  clearResults();
  document.getElementById("customer-search").value = customer.name;
  document.getElementById("selected-customer").innerHTML = `
    <strong>${customer.name}</strong><br>
    ${customer.address}<br>
    ${customer.city}, ${customer.state} ${customer.zip}
  `;
}
