const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
// ✅ Use Render’s dynamic port
const PORT = process.env.PORT || 3000;

const PROD_DB = path.join(__dirname, 'products.json');
const SALES_DB = path.join(__dirname, 'sales.json');

app.use(cors());
app.use(express.json());

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname)));

// ✅ Default route to load index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function initDB() {
  if (!fs.existsSync(PROD_DB)) fs.writeFileSync(PROD_DB, JSON.stringify([], null, 2));
  if (!fs.existsSync(SALES_DB)) fs.writeFileSync(SALES_DB, JSON.stringify([], null, 2));
}

const readDB = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeDB = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ✅ API routes
app.get('/api/products', (req, res) => res.json(readDB(PROD_DB)));
app.get('/api/sales', (req, res) => res.json(readDB(SALES_DB)));

app.post('/api/inventory', (req, res) => {
  let products = readDB(PROD_DB);
  products.push({ ...req.body, id: Date.now() });
  writeDB(PROD_DB, products);
  res.json({ success: true });
});

app.delete('/api/sales/:id', (req, res) => {
  let sales = readDB(SALES_DB);
  sales = sales.filter(s => s.invoiceID !== req.params.id);
  writeDB(SALES_DB, sales);
  res.json({ success: true });
});

app.post('/api/checkout', (req, res) => {
  const { invoiceID, customer, mobile, items, subtotal, tax, grandTotal, isEdit } = req.body;
  let products = readDB(PROD_DB);
  let sales = readDB(SALES_DB);

  if (isEdit) {
    const oldSale = sales.find(s => s.invoiceID === invoiceID);
    if (oldSale) {
      oldSale.items.forEach(oldItem => {
        const pIdx = products.findIndex(p => p.name === oldItem.name);
        if (pIdx !== -1) products[pIdx].stock += oldItem.qty;
      });
      sales = sales.filter(s => s.invoiceID !== invoiceID);
    }
  }

  items.forEach(item => {
    const pIdx = products.findIndex(p => p.name === item.name);
    if (pIdx !== -1) products[pIdx].stock -= item.qty;
  });

  const finalID = isEdit ? invoiceID : "INV-" + Math.floor(10000 + Math.random() * 90000);
  sales.unshift({
    invoiceID: finalID,
    date: new Date().toLocaleString('en-IN'),
    customer,
    mobile,
    items,
    subtotal,
    tax,
    grandTotal
  });

  writeDB(PROD_DB, products);
  writeDB(SALES_DB, sales);
  res.json({ success: true, invoiceID: finalID });
});

app.listen(PORT, () => {
  initDB();
  console.log(`🚀 Server ready on port ${PORT}`);
});
