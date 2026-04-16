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
    calculationMode: 'ai_steps',
    calculationSteps: [],
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
  calculationModeSelect: $('calculationModeSelect'),
  calcStepsHint: $('calcStepsHint'),
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
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function sanitizeNumber(v) {
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d.-]/g, '');
    const n = Number(cleaned || 0);
    return Number.isFinite(n) ? n : 0;
  }
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

function normalizeStep(raw = {}) {
  const type = String(raw.type || 'adjustment').toLowerCase();
  let amount = sanitizeNumber(raw.amount);
  if (type === 'discount' && amount > 0) amount *= -1;
  return {
    id: raw.id || uid(),
    type,
    label: raw.label || defaultStepLabel(type),
    amount,
  };
}

function defaultStepLabel(type) {
  switch (type) {
    case 'discount': return 'Discount';
    case 'tax': return 'Tax';
    case 'service': return 'Service';
    case 'adjustment': return 'Adjustment';
    default: return 'Biaya';
  }
}

function buildPresetSteps(mode) {
  const discountAmount = -Math.abs(sanitizeNumber(state.receipt.discount));
  const taxAmount = sanitizeNumber(state.receipt.tax);
  const serviceAmount = sanitizeNumber(state.receipt.service);
  const buckets = {
    discount: discountAmount ? [{ type: 'discount', label: 'Discount', amount: discountAmount }] : [],
    tax: taxAmount ? [{ type: 'tax', label: 'Tax', amount: taxAmount }] : [],
    service: serviceAmount ? [{ type: 'service', label: 'Service', amount: serviceAmount }] : [],
  };

  const orders = {
    subtotal_discount_tax_service: ['discount', 'tax', 'service'],
    subtotal_discount_service_tax: ['discount', 'service', 'tax'],
    subtotal_tax_service_discount: ['tax', 'service', 'discount'],
    subtotal_tax_discount_service: ['tax', 'discount', 'service'],
    subtotal_service_discount_tax: ['service', 'discount', 'tax'],
    subtotal_service_tax_discount: ['service', 'tax', 'discount'],
  };

  const order = orders[mode] || ['discount', 'tax', 'service'];
  return order.flatMap((key) => buckets[key]).map(normalizeStep);
}

function getEffectiveSteps() {
  if (state.receipt.calculationMode === 'ai_steps' && state.receipt.calculationSteps?.length) {
    return state.receipt.calculationSteps.map(normalizeStep);
  }
  return buildPresetSteps(state.receipt.calculationMode);
}

function describeCalculationMode() {
  const map = {
    ai_steps: 'Mengikuti urutan perhitungan yang dibaca AI dari nota.',
    subtotal_discount_tax_service: 'Subtotal item → discount → tax → service',
    subtotal_discount_service_tax: 'Subtotal item → discount → service → tax',
    subtotal_tax_service_discount: 'Subtotal item → tax → service → discount',
    subtotal_tax_discount_service: 'Subtotal item → tax → discount → service',
    subtotal_service_discount_tax: 'Subtotal item → service → discount → tax',
    subtotal_service_tax_discount: 'Subtotal item → service → tax → discount',
  };
  return map[state.receipt.calculationMode] || map.ai_steps;
}

function splitItemByQty(itemId) {
  const idx = state.items.findIndex((it) => it.id === itemId);
  if (idx === -1) return;
  const item = state.items[idx];
  const qty = Math.max(1, sanitizeNumber(item.qty));
  if (qty <= 1) return;
  const unit = unitPrice(item);
  const remainder = sanitizeNumber(item.price) - (unit * qty);
  const newItems = [];
  for (let i = 0; i < qty; i++) {
    newItems.push({
      id: uid(),
      name: `${item.name} ${qty > 1 ? `#${i + 1}` : ''}`.trim(),
      qty: 1,
      price: unit + (i === qty - 1 ? remainder : 0),
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
    const remainder = sanitizeNumber(item.price) - (unit * qty);
    for (let i = 0; i < qty; i++) {
      state.items.push({
        id: uid(),
        name: `${item.name} #${i + 1}`,
        qty: 1,
        price: unit + (i === qty - 1 ? remainder : 0),
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
    state.receipt.discount = Math.abs(sanitizeNumber(data.receipt?.discount));
    state.receipt.total = sanitizeNumber(data.receipt?.total);
    state.receipt.calculationMode = data.receipt?.calculation_steps?.length ? 'ai_steps' : 'subtotal_discount_tax_service';
    state.receipt.calculationSteps = (data.receipt?.calculation_steps || []).map(normalizeStep);
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
  state.receipt.discount = Math.abs(sanitizeNumber(el.discountInput.value));
  state.receipt.total = sanitizeNumber(el.totalInput.value);
  state.receipt.calculationMode = el.calculationModeSelect.value;
  render(false);
}

function distributeAmount(rows, amount) {
  const sign = amount >= 0 ? 1 : -1;
  const candidates = rows.filter((row) => row.running > 0);
  const baseRows = candidates.length ? candidates : rows;
  const baseTotal = baseRows.reduce((sum, row) => sum + Math.max(0, row.running), 0);

  if (!baseRows.length) return;

  if (baseTotal <= 0) {
    const each = amount / baseRows.length;
    baseRows.forEach((row) => { row.running += each; });
    return;
  }

  let allocated = 0;
  baseRows.forEach((row, index) => {
    const base = Math.max(0, row.running);
    let share = index === baseRows.length - 1 ? amount - allocated : Math.round((amount * base) / baseTotal);
    allocated += share;
    row.running += share;
  });
}

function calculate() {
  const peopleBaseTotals = Object.fromEntries(state.people.map((p) => [p, 0]));
  const itemGrand = state.items.reduce((sum, item) => sum + sanitizeNumber(item.price), 0);

  state.items.forEach((item) => {
    const eaters = item.assignedTo || [];
    if (!eaters.length) return;
    const each = sanitizeNumber(item.price) / eaters.length;
    eaters.forEach((name) => {
      if (!(name in peopleBaseTotals)) peopleBaseTotals[name] = 0;
      peopleBaseTotals[name] += each;
    });
  });

  const rows = state.people.map((name) => ({
    name,
    itemsOnly: peopleBaseTotals[name] || 0,
    running: peopleBaseTotals[name] || 0,
    steps: [],
  }));

  const effectiveSteps = getEffectiveSteps();
  effectiveSteps.forEach((step) => {
    const before = rows.map((row) => row.running);
    distributeAmount(rows, sanitizeNumber(step.amount));
    rows.forEach((row, index) => {
      const delta = row.running - before[index];
      if (Math.abs(delta) > 0.0001) {
        row.steps.push({
          type: step.type,
          label: step.label,
          amount: delta,
        });
      }
    });
  });

  let computedGrand = rows.reduce((sum, row) => sum + row.running, 0);
  const targetGrand = sanitizeNumber(state.receipt.total) || (itemGrand + effectiveSteps.reduce((s, step) => s + step.amount, 0));
  const reconciliation = targetGrand - computedGrand;
  if (rows.length && Math.abs(reconciliation) > 0.0001) {
    rows[rows.length - 1].running += reconciliation;
    rows[rows.length - 1].steps.push({ type: 'adjustment', label: 'Rounding', amount: reconciliation });
    computedGrand += reconciliation;
  }

  const totalsByType = { tax: 0, service: 0, discount: 0, adjustment: 0 };
  effectiveSteps.forEach((step) => {
    if (!(step.type in totalsByType)) totalsByType[step.type] = 0;
    totalsByType[step.type] += step.amount;
  });
  if (Math.abs(reconciliation) > 0.0001) totalsByType.adjustment += reconciliation;

  return {
    rows: rows.map((row) => ({
      name: row.name,
      itemsOnly: row.itemsOnly,
      total: row.running,
      stepSummary: summarizeRowSteps(row.steps),
      steps: row.steps,
    })),
    itemGrand,
    fees: (totalsByType.tax || 0) + (totalsByType.service || 0),
    adjustment: (totalsByType.discount || 0) + (totalsByType.adjustment || 0),
    grand: targetGrand,
    effectiveSteps,
    computedGrand,
  };
}

function summarizeRowSteps(steps) {
  const summary = { discount: 0, tax: 0, service: 0, adjustment: 0, other: 0 };
  steps.forEach((step) => {
    if (step.type in summary) summary[step.type] += step.amount;
    else summary.other += step.amount;
  });
  return summary;
}

function formatStepSummary(summary) {
  const parts = [];
  if (summary.discount) parts.push(`disc ${formatSigned(summary.discount)}`);
  if (summary.tax) parts.push(`tax ${formatSigned(summary.tax)}`);
  if (summary.service) parts.push(`service ${formatSigned(summary.service)}`);
  if (summary.adjustment || summary.other) parts.push(`adj ${formatSigned(summary.adjustment + summary.other)}`);
  return parts.join(' + ');
}

function formatSigned(value) {
  const amount = sanitizeNumber(value);
  return `${amount >= 0 ? '+' : '-'}${formatRp(Math.abs(amount))}`;
}

function buildWhatsappMessage(calc) {
  const lines = [];
  lines.push(`*${state.receipt.merchant || 'Split Bill'}*`);
  if (state.receipt.date) lines.push(state.receipt.date);
  lines.push(`Urutan nota: ${describeCalculationMode()}`);
  lines.push('');
  calc.rows.forEach((row) => {
    const stepText = formatStepSummary(row.stepSummary);
    lines.push(`• ${row.name}: ${formatRp(row.total)} (menu ${formatRp(row.itemsOnly)}${stepText ? `; ${stepText}` : ''})`);
  });
  lines.push('');
  lines.push(`Total item: ${formatRp(calc.itemGrand)}`);
  calc.effectiveSteps.forEach((step) => {
    lines.push(`${step.label}: ${formatSigned(step.amount)}`);
  });
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
    el.discountInput.value = Math.abs(sanitizeNumber(state.receipt.discount));
    el.totalInput.value = sanitizeNumber(state.receipt.total);
    el.calculationModeSelect.value = state.receipt.calculationMode || 'ai_steps';
  }
  el.calcStepsHint.textContent = describeCalculationMode();

  const effectiveSteps = getEffectiveSteps();
  if (state.receipt.calculationMode === 'ai_steps' && effectiveSteps.length) {
    el.calcStepsHint.textContent += ` Detail: ${effectiveSteps.map((step) => `${step.label} ${formatSigned(step.amount)}`).join(' → ')}`;
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
      <div class="muted">Menu ${formatRp(row.itemsOnly)}${formatStepSummary(row.stepSummary) ? ` + ${formatStepSummary(row.stepSummary)}` : ''}</div>
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

  [el.merchantInput, el.dateInput, el.subtotalInput, el.taxInput, el.serviceInput, el.discountInput, el.totalInput, el.calculationModeSelect].forEach((node) => {
    node.addEventListener('input', updateReceiptFieldsFromInputs);
    node.addEventListener('change', updateReceiptFieldsFromInputs);
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
