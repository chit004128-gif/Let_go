let currentImage = '';
const form = document.getElementById('product-form');
const idField = document.getElementById('product-id');
const nameField = document.getElementById('name');
const priceField = document.getElementById('price');
const affiliateField = document.getElementById('affiliate');
const imageField = document.getElementById('image');
const preview = document.getElementById('preview');
const searchField = document.getElementById('search');
const sortField = document.getElementById('sort');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const exportBtn = document.getElementById('export-btn');
let productCache = [];

async function loadProducts() {
  const params = new URLSearchParams();
  if (searchField.value) params.append('search', searchField.value);
  if (sortField.value) params.append('sortBy', sortField.value);
  const res = await fetch('/api/products?' + params.toString());
  const products = await res.json();
  productCache = products;
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = '';
  for (const p of products) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.price}</td>
      <td>${p.affiliate || ''}</td>
      <td>${p.image ? `<img src="${p.image}" width="50">` : ''}</td>
      <td>${p.enabled ? 'On' : 'Off'}</td>
      <td>
        <button data-action="toggle" data-id="${p.id}">${p.enabled ? 'Disable' : 'Enable'}</button>
        <button data-action="edit" data-id="${p.id}">Edit</button>
        <button data-action="delete" data-id="${p.id}">Delete</button>
        <button data-action="copy" data-id="${p.id}">Copy Link</button>
      </td>`;
    tbody.appendChild(tr);
  }
}

loadProducts();
searchField.addEventListener('input', loadProducts);
sortField.addEventListener('change', loadProducts);

document.querySelector('#products-table').addEventListener('click', async e => {
  const action = e.target.dataset.action;
  const id = e.target.dataset.id;
  if (!action) return;
  if (action === 'toggle') {
    await fetch(`/api/products/${id}/toggle`, { method: 'POST' });
    loadProducts();
  } else if (action === 'delete') {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    loadProducts();
  } else if (action === 'edit') {
    const p = productCache.find(p => p.id === id);
    if (!p) return;
    idField.value = p.id;
    nameField.value = p.name;
    priceField.value = p.price;
    affiliateField.value = p.affiliate || '';
    currentImage = p.image || '';
    if (p.image) { preview.src = p.image; preview.style.display = 'block'; }
  } else if (action === 'copy') {
    const p = productCache.find(p => p.id === id);
    const link = `${location.origin}/product/${id}${p.affiliate ? '?aff=' + p.affiliate : ''}`;
    navigator.clipboard.writeText(link);
    alert('Link copied: ' + link);
  }
});

imageField.addEventListener('change', async () => {
  const file = imageField.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  currentImage = '/uploads/' + data.filename;
  preview.src = currentImage;
  preview.style.display = 'block';
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    name: nameField.value,
    price: parseFloat(priceField.value),
    affiliate: affiliateField.value,
    image: currentImage
  };
  const id = idField.value;
  if (id) {
    await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } else {
    await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }
  form.reset();
  preview.style.display = 'none';
  currentImage = '';
  loadProducts();
});

importBtn.addEventListener('click', async () => {
  const file = importFile.files[0];
  if (!file) return alert('Choose file');
  const fd = new FormData();
  fd.append('file', file);
  await fetch('/api/import', { method: 'POST', body: fd });
  importFile.value = '';
  loadProducts();
});

exportBtn.addEventListener('click', () => {
  window.location = '/api/export';
});
