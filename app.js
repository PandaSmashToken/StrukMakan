const state = {
  imageDataUrl: '',
  people: ['Danny', 'Debbie', 'Ferry', 'Paul', 'Ella', 'Sendy'],
  receipt: {
    merchant: '',
    date: '',
    subtotal: 0,
    tax: 0,
    service: 0,
    discount: 0,
    total: 0,
  },
  items: [],
};

const $ = (id) => document.getElementById(id);
const el = {
  fileInput: $('fileInput'),
  cameraInput: $('cameraInput'),
  previewImage: $('previewImage'),
  scanBtn: $('scanBtn'),
  scanStatus: $('scanStatus'),
  merchantInput: $('merchantInput'),
  dateInput: $('dateInput'),
  subtotalInput: $('subtotalInput'),
  taxInput: $('taxInput'),
  serviceInput: $('serviceInput'),
  discountInput: $('discountInput'),
  totalInput: $('totalInput'),
  personInput: $('personInput'),
  addPersonBtn: $('addPersonBtn'),
  peopleChips: $('peopleChips'),
  itemsContainer: $('itemsContainer'),
  addItemBtn: $('addItemBtn'),
  splitAllQtyBtn: $('splitAllQtyBtn'),
  resultsContainer: $('resultsContainer'),
  itemsGrandTotal: $('itemsGrandTotal'),
  feesGrandTotal: $('feesGrandTotal'),
  adjustmentGrandTotal: $('adjustmentGrandTotal'),
  grandTotal: $('grandTotal'),
  whatsappInput: $('whatsappInput'),
  whatsappMessage: $('whatsappMessage'),
  copyMessageBtn: $('copyMessageBtn'),
  shareWaBtn: $('shareWaBtn'),
  exportPngBtn: $('exportPngBtn'),
  exportCard: $('exportCard'),
  exportMerchant: $('exportMerchant'),
  exportDate: $('exportDate'),
  exportResults: $('exportResults'),
  exportGrandTotal: $('exportGrandTotal'),
  themeToggle: $('themeToggle'),
};

function formatRp(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function sanitizeNumber(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function unitPrice(item) {
  const qty = Math.max(1, sanitizeNumber(item.qty));
  return Math.round(sanitizeNumber(item.price) / qty);
}

function normalizeItem(raw = {}) {
  return {
    id: raw.id || uid(),
    name: raw.name || 'Menu baru',
    qty: Math.max(1, sanitizeNumber(raw.qty || 1)),
    price: sanitizeNumber(raw.price || 0),
    assignedTo: Array.isArray(raw.assignedTo) ? [...new Set(raw.assignedTo)] : [],
  };
}

function splitItemByQty(itemId) {
  const idx = state.items.findIndex((it) => it.id === itemId);
  if (idx === -1) return;
  const item = state.items[idx];
  const qty = Math.max(1, sanitizeNumber(item.qty));
  if (qty <= 1) return;
  const unit = unitPrice(item);
  const newItems = [];
  for (let i = 0; i < qty; i++) {
    newItems.push({
      id: uid(),
      name: `${item.name} ${qty > 1 ? `#${i + 1}` : ''}`.trim(),
      qty: 1,
      price: unit,
      assignedTo: i === 0 ? [...item.assignedTo] : [],
    });
  }
  state.items.splice(idx, 1, ...newItems);
  render();
}

function splitAllQtyItems() {
  const copied = [...state.items];
  state.items = [];
  copied.forEach((item) => {
    const qty = Math.max(1, sanitizeNumber(item.qty));
    if (qty <= 1) {
      state.items.push(item);
      return;
    }
    const unit = unitPrice(item);
    for (let i = 0; i < qty; i++) {
      state.items.push({
        id: uid(),
        name: `${item.name} #${i + 1}`,
        qty: 1,
        price: unit,
        assignedTo: i === 0 ? [...item.assignedTo] : [],
      });
    }
  });
  render();
}

function setImage(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.imageDataUrl = reader.result;
    el.previewImage.src = state.imageDataUrl;
    el.previewImage.style.display = 'block';
    el.scanStatus.textContent = 'File siap discan.';
  };
  reader.readAsDataURL(file);
}

async function scanReceipt() {
  if (!state.imageDataUrl) {
    el.scanStatus.textContent = 'Pilih foto struk dulu.';
    return;
  }
  el.scanBtn.disabled = true;
  el.scanStatus.textContent = 'Scanning dengan AI...';
  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: state.imageDataUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal scan');
    state.receipt.merchant = data.receipt?.restaurant_name || '';
    state.receipt.date = data.receipt?.date || '';
    state.receipt.subtotal = sanitizeNumber(data.receipt?.subtotal);
    state.receipt.tax = sanitizeNumber(data.receipt?.tax);
    state.receipt.service = sanitizeNumber(data.receipt?.service);
    state.receipt.discount = sanitizeNumber(data.receipt?.discount);
    state.receipt.total = sanitizeNumber(data.receipt?.total);
    state.items = (data.receipt?.items || []).map((it) => normalizeItem(it));
    el.scanStatus.textContent = 'Scan selesai. Silakan cek dan edit hasilnya kalau perlu.';
    render();
  } catch (err) {
    el.scanStatus.textContent = 'Scan gagal: ' + err.message;
  } finally {
    el.scanBtn.disabled = false;
  }
}

function removePerson(name) {
  state.people = state.people.filter((p) => p !== name);
  state.items.forEach((item) => {
    item.assignedTo = item.assignedTo.filter((p) => p !== name);
  });
  render();
}

function addPerson() {
  const name = el.personInput.value.trim();
  if (!name) return;
  if (!state.people.includes(name)) state.people.push(name);
  el.personInput.value = '';
  render();
}

function addManualItem() {
  state.items.push(normalizeItem({ name: 'Menu baru', qty: 1, price: 0 }));
  render();
}

function removeItem(itemId) {
  state.items = state.items.filter((it) => it.id !== itemId);
  render();
}

function updateReceiptFieldsFromInputs() {
  state.receipt.merchant = el.merchantInput.value;
  state.receipt.date = el.dateInput.value;
  state.receipt.subtotal = sanitizeNumber(el.subtotalInput.value);
  state.receipt.tax = sanitizeNumber(el.taxInput.value);
  state.receipt.service = sanitizeNumber(el.serviceInput.value);
  state.receipt.discount = sanitizeNumber(el.discountInput.value);
  state.receipt.total = sanitizeNumber(el.totalInput.value);
  render(false);
}

function calculate() {
  const peopleItemTotals = Object.fromEntries(state.people.map((p) => [p, 0]));
  const itemGrand = state.items.reduce((sum, item) => sum + sanitizeNumber(item.price), 0);

  state.items.forEach((item) => {
    const eaters = item.assignedTo || [];
    if (!eaters.length) return;
    const each = sanitizeNumber(item.price) / eaters.length;
    eaters.forEach((name) => {
      if (!(name in peopleItemTotals)) peopleItemTotals[name] = 0;
      peopleItemTotals[name] += each;
    });
  });

  const fees = sanitizeNumber(state.receipt.tax) + sanitizeNumber(state.receipt.service);
  const feeEach = state.people.length ? fees / state.people.length : 0;

  const explicitDiscount = sanitizeNumber(state.receipt.discount);
  const derivedAdjustment = sanitizeNumber(state.receipt.total) - (itemGrand + fees - explicitDiscount);
  const totalDiscountOrAdjustment = explicitDiscount - derivedAdjustment;

  const totalAssignedItems = Object.values(peopleItemTotals).reduce((a, b) => a + b, 0);

  const rows = state.people.map((name) => {
    const itemsOnly = peopleItemTotals[name] || 0;
    const discountShare = totalAssignedItems > 0
      ? (itemsOnly / totalAssignedItems) * totalDiscountOrAdjustment
      : (state.people.length ? totalDiscountOrAdjustment / state.people.length : 0);
    const total = itemsOnly + feeEach - discountShare;
    return {
      name,
      itemsOnly,
      fees: feeEach,
      adjustment: -discountShare,
      total,
    };
  });

  const computedGrand = rows.reduce((sum, row) => sum + row.total, 0);
  const targetGrand = sanitizeNumber(state.receipt.total) || (itemGrand + fees - explicitDiscount);
  const reconciliation = targetGrand - computedGrand;
  if (rows.length && Math.abs(reconciliation) > 0.0001) {
    rows[rows.length - 1].total += reconciliation;
    rows[rows.length - 1].adjustment += reconciliation;
  }

  return {
    rows,
    itemGrand,
    fees,
    adjustment: totalDiscountOrAdjustment * -1,
    grand: targetGrand,
  };
}

function buildWhatsappMessage(calc) {
  const lines = [];
  lines.push(`*${state.receipt.merchant || 'Split Bill'}*`);
  if (state.receipt.date) lines.push(state.receipt.date);
  lines.push('');
  calc.rows.forEach((row) => {
    lines.push(`• ${row.name}: ${formatRp(row.total)} (menu ${formatRp(row.itemsOnly)} + fee ${formatRp(row.fees)})`);
  });
  lines.push('');
  lines.push(`Total item: ${formatRp(calc.itemGrand)}`);
  lines.push(`Pajak + service: ${formatRp(calc.fees)}`);
  if (calc.adjustment) lines.push(`Diskon / penyesuaian: ${formatRp(calc.adjustment)}`);
  lines.push(`Grand total: ${formatRp(calc.grand)}`);
  return lines.join('\n');
}

function render(syncInputs = true) {
  if (syncInputs) {
    el.merchantInput.value = state.receipt.merchant || '';
    el.dateInput.value = state.receipt.date || '';
    el.subtotalInput.value = sanitizeNumber(state.receipt.subtotal);
    el.taxInput.value = sanitizeNumber(state.receipt.tax);
    el.serviceInput.value = sanitizeNumber(state.receipt.service);
    el.discountInput.value = sanitizeNumber(state.receipt.discount);
    el.totalInput.value = sanitizeNumber(state.receipt.total);
  }

  el.peopleChips.innerHTML = state.people.map((name) => `
    <div class="chip">
      <span>${escapeHtml(name)}</span>
      <button data-remove-person="${encodeURIComponent(name)}">×</button>
    </div>
  `).join('');

  el.itemsContainer.innerHTML = state.items.length ? state.items.map((item) => `
    <div class="item-card">
      <div class="item-top">
        <div>
          <label>Nama Menu</label>
          <input data-item-name="${item.id}" type="text" value="${escapeAttr(item.name)}" />
        </div>
        <div>
          <label>Qty</label>
          <input data-item-qty="${item.id}" type="number" min="1" step="1" value="${sanitizeNumber(item.qty)}" />
        </div>
        <div>
          <label>Harga</label>
          <input data-item-price="${item.id}" type="number" min="0" step="1" value="${sanitizeNumber(item.price)}" />
        </div>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="btn btn-secondary" data-split-item="${item.id}">Pisahkan Qty</button>
          <button class="icon-btn" title="Hapus" data-remove-item="${item.id}">🗑</button>
        </div>
      </div>
      <div class="small-note">Nilai per porsi: ${formatRp(unitPrice(item))}</div>
      <div class="people-picker">
        <label>Dimakan oleh</label>
        <div class="people-grid">
          ${state.people.map((person) => `
            <label class="pill ${item.assignedTo.includes(person) ? 'active' : ''}">
              <input data-item-person="${item.id}||${encodeURIComponent(person)}" type="checkbox" ${item.assignedTo.includes(person) ? 'checked' : ''} />
              <span>${escapeHtml(person)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('') : '<div class="muted">Belum ada item. Upload struk lalu klik Scan AI, atau tambah item manual.</div>';

  const calc = calculate();
  el.resultsContainer.innerHTML = calc.rows.map((row) => `
    <div class="result-card">
      <strong>${escapeHtml(row.name)}</strong>
      <div class="muted">Menu ${formatRp(row.itemsOnly)} + fee ${formatRp(row.fees)}${row.adjustment ? ` + adj ${formatRp(row.adjustment)}` : ''}</div>
      <div style="font-size:20px; font-weight:800; margin-top:6px;">${formatRp(row.total)}</div>
    </div>
  `).join('');
  el.itemsGrandTotal.textContent = formatRp(calc.itemGrand);
  el.feesGrandTotal.textContent = formatRp(calc.fees);
  el.adjustmentGrandTotal.textContent = formatRp(calc.adjustment);
  el.grandTotal.textContent = formatRp(calc.grand);

  const message = buildWhatsappMessage(calc);
  el.whatsappMessage.value = message;

  el.exportMerchant.textContent = state.receipt.merchant || 'Split Bill';
  el.exportDate.textContent = state.receipt.date || '-';
  el.exportResults.innerHTML = calc.rows.map((row) => `
    <div class="export-line">
      <span>${escapeHtml(row.name)}</span>
      <strong>${formatRp(row.total)}</strong>
    </div>
  `).join('');
  el.exportGrandTotal.textContent = formatRp(calc.grand);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function escapeAttr(value) { return escapeHtml(value); }

function bindEvents() {
  el.fileInput.addEventListener('change', (e) => setImage(e.target.files?.[0]));
  el.cameraInput.addEventListener('change', (e) => setImage(e.target.files?.[0]));
  el.scanBtn.addEventListener('click', scanReceipt);
  el.addPersonBtn.addEventListener('click', addPerson);
  el.personInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addPerson(); });
  el.addItemBtn.addEventListener('click', addManualItem);
  el.splitAllQtyBtn.addEventListener('click', splitAllQtyItems);

  [el.merchantInput, el.dateInput, el.subtotalInput, el.taxInput, el.serviceInput, el.discountInput, el.totalInput].forEach((node) => {
    node.addEventListener('input', updateReceiptFieldsFromInputs);
  });

  document.body.addEventListener('click', (e) => {
    const removePersonBtn = e.target.closest('[data-remove-person]');
    if (removePersonBtn) removePerson(decodeURIComponent(removePersonBtn.dataset.removePerson));

    const removeItemBtn = e.target.closest('[data-remove-item]');
    if (removeItemBtn) removeItem(removeItemBtn.dataset.removeItem);

    const splitItemBtn = e.target.closest('[data-split-item]');
    if (splitItemBtn) splitItemByQty(splitItemBtn.dataset.splitItem);
  });

  document.body.addEventListener('input', (e) => {
    if (e.target.dataset.itemName) {
      const item = state.items.find((it) => it.id === e.target.dataset.itemName);
      if (item) item.name = e.target.value;
      render(false);
    }
    if (e.target.dataset.itemQty) {
      const item = state.items.find((it) => it.id === e.target.dataset.itemQty);
      if (item) item.qty = Math.max(1, sanitizeNumber(e.target.value));
      render(false);
    }
    if (e.target.dataset.itemPrice) {
      const item = state.items.find((it) => it.id === e.target.dataset.itemPrice);
      if (item) item.price = Math.max(0, sanitizeNumber(e.target.value));
      render(false);
    }
  });

  document.body.addEventListener('change', (e) => {
    if (e.target.dataset.itemPerson) {
      const [itemId, encodedName] = e.target.dataset.itemPerson.split('||');
      const person = decodeURIComponent(encodedName);
      const item = state.items.find((it) => it.id === itemId);
      if (!item) return;
      if (e.target.checked) {
        if (!item.assignedTo.includes(person)) item.assignedTo.push(person);
      } else {
        item.assignedTo = item.assignedTo.filter((p) => p !== person);
      }
      render(false);
    }
  });

  el.copyMessageBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(el.whatsappMessage.value);
    alert('Pesan berhasil dicopy.');
  });

  el.shareWaBtn.addEventListener('click', () => {
    const target = el.whatsappInput.value.replace(/[^\d]/g, '');
    const url = target
      ? `https://wa.me/${target}?text=${encodeURIComponent(el.whatsappMessage.value)}`
      : `https://wa.me/?text=${encodeURIComponent(el.whatsappMessage.value)}`;
    window.open(url, '_blank');
  });

  el.exportPngBtn.addEventListener('click', async () => {
    const canvas = await html2canvas(el.exportCard, { backgroundColor: null, scale: 2 });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${(state.receipt.merchant || 'splitbill').replace(/\s+/g, '-').toLowerCase()}-bill.png`;
    a.click();
  });

  el.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    el.themeToggle.textContent = document.body.classList.contains('dark') ? '☀️ Light mode' : '🌙 Dark mode';
  });
}

bindEvents();
render();
