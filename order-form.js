/**************** CONFIG ****************/
const PRODUCT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYHzF6u43ORNewiUMe-i-FtSGPB4mHw-BN9xlqY-UzHvRWUVr-Cgro_kqiGm4G-fKAA6w3ErQwp3O/pub?gid=1782602603&single=true&output=csv";

/**************** STATE ****************/
let products = [];

/**************** CSV PARSER (ROBUST) ****************/
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h => h.trim());

  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || "").trim();
    });
    return obj;
  });
}

/**************** LOAD PRODUCTS (LOCKED) ****************/
async function loadProducts() {
  const response = await fetch(PRODUCT_CSV_URL);
  const csvText = await response.text();

  const rows = parseCSV(csvText);

  products = rows.map(row => ({
    name: row["Product Name"],          // COLUMN A
    price: Number(row["Price"] || 0),   // COLUMN B
    stock: Number(row["Qty In Stock"] || 0), // COLUMN C
    category: row["Category"] || ""     // COLUMN D
  }));

  console.log("PRODUCTS LOADED:", products);
  renderProducts();
}
