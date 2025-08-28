const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

function readProducts() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function writeProducts(products) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
}

// List products with search and sort
app.get('/api/products', (req, res) => {
  let products = readProducts();
  const { search, sortBy, order } = req.query;
  if (search) {
    const s = search.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(s));
  }
  if (sortBy) {
    products.sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return order === 'desc' ? 1 : -1;
      if (a[sortBy] > b[sortBy]) return order === 'desc' ? -1 : 1;
      return 0;
    });
  }
  res.json(products);
});

// Add product
app.post('/api/products', (req, res) => {
  const products = readProducts();
  const product = { id: uuidv4(), enabled: true, ...req.body };
  products.push(product);
  writeProducts(products);
  res.status(201).json(product);
});

// Update product
app.put('/api/products/:id', (req, res) => {
  const products = readProducts();
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).send('Not found');
  products[idx] = { ...products[idx], ...req.body };
  writeProducts(products);
  res.json(products[idx]);
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  let products = readProducts();
  const lenBefore = products.length;
  products = products.filter(p => p.id !== req.params.id);
  if (products.length === lenBefore) return res.status(404).send('Not found');
  writeProducts(products);
  res.status(204).send();
});

// Toggle enable/disable
app.post('/api/products/:id/toggle', (req, res) => {
  const products = readProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).send('Not found');
  product.enabled = !product.enabled;
  writeProducts(products);
  res.json(product);
});

// Upload image
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });
app.post('/api/upload', upload.single('image'), (req, res) => {
  res.json({ filename: req.file.filename, url: '/uploads/' + req.file.filename });
});

// Import CSV
app.post('/api/import', upload.single('file'), (req, res) => {
  const content = fs.readFileSync(req.file.path);
  const records = parse(content, { columns: true });
  const products = readProducts();
  for (const record of records) {
    products.push({ id: uuidv4(), enabled: record.enabled === 'true', name: record.name, price: parseFloat(record.price), affiliate: record.affiliate || '', image: record.image || '' });
  }
  writeProducts(products);
  res.json({ imported: records.length });
});

// Export CSV
app.get('/api/export', (req, res) => {
  const products = readProducts();
  const csv = stringify(products, { header: true });
  res.setHeader('Content-disposition', 'attachment; filename=products.csv');
  res.set('Content-Type', 'text/csv');
  res.send(csv);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

