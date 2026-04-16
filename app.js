const state = {
  imageDataUrl: '',
  people: ['Danny', 'Debbie', 'Makan Tengah'],
  items: [],
  parsed: null,
};

const el = (id) => document.getElementById(id);
const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));

function setStatus(msg) { el('scanStatus').textContent = msg || ''; }
function escapeHtml(text) { return String(text ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function renderPreview() {
  const wrap = el('previewWrap');
  if (!state.imageDataUrl) {
    wrap.className = 'preview-wrap empty';
    wrap.innerHTML = 'Belum ada gambar struk';
    return;
  }
  wrap.className = 'preview-wrap';
  wrap.innerHTML = `<img src="${state.imageDataUrl}" alt="Receipt preview">`;
}

function populateReceiptInfo(data = {}) {
  el('restaurantName').value = data.restaurant_name || '';
  el('transactionDate').value = data.date || '';
  el('subtotal').value = Number(data.subtotal || 0);
  el('tax').value = Number(data.tax || 0);
  el('service').value = Number(data.service || 0);
  el('total').value = Number(data.total || 0);
}

function renderPeople() {
  el('peopleContainer').innerHTML = state.people.map((name, idx) => `
    <div class="person-pill">
      <span>${escapeHtml(name)}</span>
      <button class="icon-btn" type="button" onclick="removePerson(${idx})">✕</button>
    </div>`).join('');
}

function personOptions(selected) {
  return `<option value="">Belum di-assign</option>` + state.people.map(p => `<option value="${escapeHtml(p)}" ${p === selected ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
}

function renderItems() {
  el('itemsContainer').innerHTML = state.items.length ? state.items.map((item, idx) => `
    <div class="item-row">
      <div class="item-grid">
        <label>Nama Menu<input type="text" value="${escapeHtml(item.name || '')}" oninput="updateItem(${idx}, 'name', this.value)"></label>
        <label>Qty<input type="number" min="1" value="${Number(item.qty || 1)}" oninput="updateItem(${idx}, 'qty', Number(this.value || 1))"></label>
        <label>Harga<input type="number" min="0" value="${Number(item.price || 0)}" oninput="updateItem(${idx}, 'price', Number(this.value || 0))"></label>
        <label>Dimakan Oleh<select onchange="updateItem(${idx}, 'assignedTo', this.value)">${personOptions(item.assignedTo || '')}</select></label>
        <button class="icon-btn" type="button" onclick="removeItem(${idx})">🗑️</button>
      </div>
    </div>`).join('') : '<div class="item-row">Belum ada item. Scan AI atau tambah item manual.</div>';
  recalculate();
}

function addItem() {
  state.items.push({ name: '', qty: 1, price: 0, assignedTo: '' });
  renderItems();
}

function removeItem(index) { state.items.splice(index, 1); renderItems(); }
function updateItem(index, key, value) { state.items[index][key] = value; recalculate(); }
function removePerson(index) {
  const name = state.people[index];
  state.items = state.items.map(item => item.assignedTo === name ? { ...item, assignedTo: '' } : item);
  state.people.splice(index, 1);
  renderPeople(); renderItems();
}

function addPerson() {
  const name = el('personInput').value.trim();
  if (!name) return;
  if (state.people.includes(name)) return;
  state.people.push(name);
  el('personInput').value = '';
  renderPeople(); renderItems();
}

function collectFees() {
  return {
    subtotal: Number(el('subtotal').value || 0),
    tax: Number(el('tax').value || 0),
    service: Number(el('service').value || 0),
    total: Number(el('total').value || 0),
  };
}

function recalculate() {
  const fees = collectFees();
  const shared = fees.tax + fees.service;
  const map = Object.fromEntries(state.people.map(p => [p, 0]));
  state.items.forEach(item => {
    if (!item.assignedTo || !map.hasOwnProperty(item.assignedTo)) return;
    map[item.assignedTo] += Number(item.price || 0);
  });
  const sharePerPerson = state.people.length ? shared / state.people.length : 0;
  const rows = state.people.map(name => ({ name, itemsTotal: map[name] || 0, shared: sharePerPerson, total: (map[name] || 0) + sharePerPerson }));
  el('resultsContainer').innerHTML = rows.map(row => `
    <div class="result-card">
      <h3>${escapeHtml(row.name)}</h3>
      <div class="money">${rupiah(row.total)}</div>
      <div class="subline">Menu ${rupiah(row.itemsTotal)} + Pajak/Service ${rupiah(row.shared)}</div>
    </div>`).join('');
  const summary = buildSummary(rows, fees);
  el('summaryText').value = summary;
  syncBillCard(rows, fees);
}

function buildSummary(rows, fees) {
  const title = el('restaurantName').value.trim() || 'Split Bill';
  const date = el('transactionDate').value.trim() || '-';
  return [
    `*${title}*`,
    `${date}`,
    '',
    ...rows.map(r => `• ${r.name}: ${rupiah(r.total)} (menu ${rupiah(r.itemsTotal)} + pajak/service ${rupiah(r.shared)})`),
    '',
    `Subtotal: ${rupiah(fees.subtotal)}`,
    `Pajak: ${rupiah(fees.tax)}`,
    `Service: ${rupiah(fees.service)}`,
    `Total: ${rupiah(fees.total || (fees.subtotal + fees.tax + fees.service))}`,
  ].join('\n');
}

function syncBillCard(rows, fees) {
  el('billRestaurant').textContent = el('restaurantName').value || 'Split Bill';
  el('billDate').textContent = el('transactionDate').value || '-';
  el('billList').innerHTML = rows.map(r => `<div class="bill-row"><div><strong>${escapeHtml(r.name)}</strong><div class="muted">Menu ${rupiah(r.itemsTotal)} + Pajak/Service ${rupiah(r.shared)}</div></div><strong>${rupiah(r.total)}</strong></div>`).join('');
  el('billSubtotal').textContent = rupiah(fees.subtotal);
  el('billTax').textContent = rupiah(fees.tax);
  el('billService').textContent = rupiah(fees.service);
  el('billTotal').textContent = rupiah(fees.total || (fees.subtotal + fees.tax + fees.service));
}

async function fileToDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePickedFile(file) {
  if (!file) return;
  state.imageDataUrl = await fileToDataUrl(file);
  renderPreview();
  setStatus('Gambar siap di-scan.');
}

function sanitizeJsonText(text) {
  const trimmed = String(text || '').trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence ? fence[1].trim() : trimmed;
}

async function scanReceipt() {
  if (!state.imageDataUrl) {
    alert('Pilih gambar struk dulu.');
    return;
  }
  setStatus('Sedang scan AI...');
  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: state.imageDataUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal scan');

    const payload = typeof data.result === 'string' ? JSON.parse(sanitizeJsonText(data.result)) : data.result;
    state.parsed = payload;
    state.items = (payload.items || []).map(item => ({
      name: item.name || '',
      qty: Number(item.qty || 1),
      price: Number(item.price || 0),
      assignedTo: ''
    }));
    populateReceiptInfo(payload);
    renderItems();
    setStatus('Scan selesai. Silakan cek dan edit hasilnya kalau perlu.');
  } catch (err) {
    console.error(err);
    setStatus('Gagal scan AI. Cek API key / deployment / format gambar.');
    alert(err.message || 'Gagal scan');
  }
}

async function exportPng() {
  recalculate();
  const canvas = await html2canvas(el('billCard'), { backgroundColor: null, scale: 2 });
  const link = document.createElement('a');
  link.download = 'splitbill-summary.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function copySummary() {
  await navigator.clipboard.writeText(el('summaryText').value);
  alert('Ringkasan berhasil disalin.');
}

function shareWhatsapp() {
  const number = el('waNumber').value.replace(/\D/g, '');
  const text = encodeURIComponent(el('summaryText').value);
  const url = number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, '_blank');
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  el('themeToggle').textContent = document.body.classList.contains('dark') ? '☀️ Light' : '🌙 Dark';
}

window.updateItem = updateItem;
window.removeItem = removeItem;
window.removePerson = removePerson;

el('uploadBtn').onclick = () => el('fileInput').click();
el('cameraBtn').onclick = () => el('cameraInput').click();
el('fileInput').onchange = e => handlePickedFile(e.target.files?.[0]);
el('cameraInput').onchange = e => handlePickedFile(e.target.files?.[0]);
el('scanBtn').onclick = scanReceipt;
el('addItemBtn').onclick = addItem;
el('addPersonBtn').onclick = addPerson;
el('recalculateBtn').onclick = recalculate;
el('copyBtn').onclick = copySummary;
el('shareBtn').onclick = shareWhatsapp;
el('exportBtn').onclick = exportPng;
el('themeToggle').onclick = toggleTheme;
['restaurantName','transactionDate','subtotal','tax','service','total'].forEach(id => el(id).addEventListener('input', recalculate));

renderPreview();
renderPeople();
renderItems();
populateReceiptInfo();
