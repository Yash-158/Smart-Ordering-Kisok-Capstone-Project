/* ═══════════════════════════════════════════════════════════════
   BiteKaro Kiosk — Cart Logic
   ═══════════════════════════════════════════════════════════════ */

let loyaltyDiscount = 0;
let redeemPoints = 0;

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  calculateTotals();
  loadCrossSell();
  if (BiteKaroApp.customer) showLoggedInLoyalty(BiteKaroApp.customer);
  else if (BiteKaroApp.customer?.phone) document.getElementById('loyaltyPhoneInput').value = BiteKaroApp.customer.phone;
});

// ═══ RENDER CART ═══
function renderCart() {
  const cart = BiteKaroApp.cart;
  const list = document.getElementById('cartItemsList');
  const empty = document.getElementById('emptyCart');
  const badge = document.getElementById('itemCountBadge');
  const btn = document.getElementById('proceedBtn');

  badge.textContent = `(${BiteKaroApp.getCartCount()} items)`;

  if (cart.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    btn.disabled = true;
    return;
  }
  empty.classList.add('hidden');
  btn.disabled = false;

  list.innerHTML = cart.map(item => {
    const custStr = Object.values(item.customizations || {}).filter(Boolean).join(', ');
    const imgSrc = item.image_url ? encodeURI(item.image_url) : '';
    let borderColorClass = "border-[#1565C0]"; // Default primary color
    if (item.category === "hot_beverages") borderColorClass = "border-[#FF6B35]"; // Coral
    else if (item.category === "cold_beverages") borderColorClass = "border-blue-400"; // Light Blue
    else if (item.category === "snacks") borderColorClass = "border-[#FFB300]"; // Amber
    else if (item.category === "desserts") borderColorClass = "border-pink-400"; // Pink

    return `
      <div class="group relative flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all ${borderColorClass}">
        <div class="w-[70px] h-[70px] flex-shrink-0 overflow-hidden rounded-xl">
          ${imgSrc ? `<img class="w-full h-full object-cover" src="${imgSrc}" alt="${item.item_name}" onerror="this.style.display='none'">` : `<div class="w-full h-full bg-slate-200"></div>`}
        </div>
        <div class="flex-grow">
          <h3 class="font-bold text-lg font-display">${item.item_name}</h3>
          ${custStr ? `<p class="text-sm text-slate-500 font-display">${custStr}</p>` : ''}
          <p class="text-xs text-slate-400 mt-1 font-display">${BiteKaroApp.formatPrice(item.price)} each</p>
        </div>
        <div class="flex items-center gap-4 px-4">
          <div class="flex items-center gap-3 bg-slate-100 dark:bg-slate-700 rounded-full p-1 border border-slate-200">
            <button class="material-symbols-outlined text-primary size-8 flex items-center justify-center hover:bg-white rounded-full transition-colors shadow-sm active:scale-95" onclick="updateQty('${item.cartItemId}', -1)">remove</button>
            <span class="font-bold w-4 text-center font-display">${item.quantity}</span>
            <button class="material-symbols-outlined text-primary size-8 flex items-center justify-center hover:bg-white rounded-full transition-colors shadow-sm active:scale-95" onclick="updateQty('${item.cartItemId}', 1)">add</button>
          </div>
          <div class="text-right min-w-[80px]">
            <p class="font-bold text-lg text-slate-800 font-display">${BiteKaroApp.formatPrice(item.item_total)}</p>
          </div>
        </div>
        <button class="absolute -right-3 -top-3 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1.5 shadow-lg transition-all active:scale-90 flex items-center" onclick="removeItem('${item.cartItemId}')">
          <span class="material-symbols-outlined text-sm font-bold">close</span>
        </button>
      </div>`;
  }).join('');
}

function updateQty(cartItemId, delta) {
  const item = BiteKaroApp.cart.find(c => c.cartItemId === cartItemId);
  if (item) BiteKaroApp.updateCartQuantity(cartItemId, item.quantity + delta);
  renderCart();
  calculateTotals();
}

function removeItem(cartItemId) {
  BiteKaroApp.removeFromCart(cartItemId);
  renderCart();
  calculateTotals();
  loadCrossSell();
}

// ═══ LOYALTY ═══
async function checkCartLoyalty() {
  const phone = document.getElementById('loyaltyPhoneInput').value.trim();
  const msg = document.getElementById('loyaltyMsg');
  if (!phone || phone.length < 10) { msg.innerHTML = '<span style="color:var(--error)">Enter a valid 10-digit number</span>'; return; }

  try {
    const data = await BiteKaroApp.fetchAPI('/loyalty/' + phone);
    if (data.exists) {
      BiteKaroApp.customer = data.customer;
      BiteKaroApp.saveToStorage();
      showLoggedInLoyalty(data.customer);
    } else {
      msg.innerHTML = '';
      document.getElementById('loyaltyNotLoggedIn').classList.add('hidden');
      document.getElementById('loyaltyRegisterForm').classList.remove('hidden');
      document.getElementById('customer-phone-display').value = phone;
    }
  } catch (err) {
    msg.innerHTML = '<span style="color:var(--error)">Could not check. Try again.</span>';
  }
}

async function registerCustomer() {
  const phone = document.getElementById('customer-phone-display').value;
  const name = document.getElementById('customer-name-input').value.trim();
  if (!name) { BiteKaroApp.showToast('Please enter your name', 'error'); return; }

  try {
    const data = await BiteKaroApp.fetchAPI('/loyalty/register', { method: 'POST', body: JSON.stringify({ phone, name }) });
    if (data.customer) {
      BiteKaroApp.customer = data.customer;
      BiteKaroApp.saveToStorage();
      document.getElementById('loyaltyRegisterForm').classList.add('hidden');
      showLoggedInLoyalty(data.customer);
      BiteKaroApp.showToast(`Welcome, ${name}! Account created 🎉`, 'success');
    }
  } catch(e) { BiteKaroApp.showToast('Registration failed.', 'error'); }
}

function showLoggedInLoyalty(customer) {
  document.getElementById('loyaltyNotLoggedIn').classList.add('hidden');
  document.getElementById('loyaltyLoggedIn').classList.remove('hidden');
  document.getElementById('welcomeCustomer').innerHTML = `
    <div style="font-size:15px;font-weight:600;color:var(--success);">Welcome ${customer.name || 'friend'}! 🎉</div>
    <div class="points-display">${customer.loyalty_points || 0} points</div>
    <div style="font-size:12px;color:var(--text-light);">${customer.total_orders || 0} orders placed</div>
  `;

  const points = customer.loyalty_points || 0;
  if (points >= 10) {
    const maxDiscount = Math.min(points, Math.floor(BiteKaroApp.getCartTotal() * 0.5));
    redeemPoints = maxDiscount;
    document.getElementById('redeemSection').classList.remove('hidden');
    document.getElementById('redeemLabel').textContent = `Use ${maxDiscount} points for Rs.${maxDiscount} off`;
  }
}

function toggleRedeem() {
  const btn = document.getElementById('redeemToggle');
  const isActive = btn.classList.toggle('active');
  loyaltyDiscount = isActive ? redeemPoints : 0;
  calculateTotals();
}

// ═══ TOTALS ═══
function calculateTotals() {
  const sub = BiteKaroApp.getCartTotal();
  const total = Math.max(sub - loyaltyDiscount, 0);
  document.getElementById('summarySubtotal').textContent = BiteKaroApp.formatPrice(sub);
  document.getElementById('summaryTotal').textContent = BiteKaroApp.formatPrice(total);
  const dr = document.getElementById('discountRow');
  if (loyaltyDiscount > 0) { dr.style.display = 'flex'; document.getElementById('summaryDiscount').textContent = `-Rs.${loyaltyDiscount}`; }
  else { dr.style.display = 'none'; }
}

// ═══ CROSS-SELL ═══
async function loadCrossSell() {
  const cart = BiteKaroApp.cart;
  const banner = document.getElementById('crossSellBanner');
  const container = document.getElementById('crossSellItems');
  if (cart.length === 0) { banner.classList.add('hidden'); return; }
  const hasBev = cart.some(i => i.category === 'hot_beverages' || i.category === 'cold_beverages');
  if (hasBev) { banner.classList.add('hidden'); return; }

  try {
    const data = await BiteKaroApp.fetchAPI('/recommend', {
      method: 'POST',
      body: { cart_items: cart.map(i => i.item_id), mood: BiteKaroApp.mood || 'happy', hour: BiteKaroApp.getCurrentHour(), month: BiteKaroApp.getCurrentMonth(), top_k: 4 }
    });
    const bevs = (data.recommendations || []).filter(r => r.category === 'hot_beverages' || r.category === 'cold_beverages').slice(0, 2);
    if (bevs.length > 0) {
      banner.classList.remove('hidden');
      container.innerHTML = bevs.map(b => `
        <button class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors tracking-wide shadow-sm flex-shrink-0 font-display" onclick="crossSellAdd('${b.item_id}', '${b.item_name}', ${b.price}, '${b.category}')">
          Add ${b.item_name} · ${BiteKaroApp.formatPrice(b.price)}
        </button>`).join('');
    } else { banner.classList.add('hidden'); }
  } catch(e) { banner.classList.add('hidden'); }
}

function crossSellAdd(id, name, price, category) {
  BiteKaroApp.addToCart({ item_id: id, item_name: name, price, category }, {}, 1);
  renderCart(); calculateTotals(); loadCrossSell();
}

// ═══ PROCEED ═══
function proceedToPayment() {
  if (BiteKaroApp.cart.length === 0) return;
  const orderData = {
    customer_id: BiteKaroApp.customer?.id || null,
    items: BiteKaroApp.cart,
    subtotal: BiteKaroApp.getCartTotal(),
    discount: loyaltyDiscount,
    total: Math.max(BiteKaroApp.getCartTotal() - loyaltyDiscount, 0),
    payment_method: null,
    mood: BiteKaroApp.mood || null,
    special_instructions: document.getElementById('specialInstructions').value.trim(),
    loyalty_points_used: loyaltyDiscount > 0 ? redeemPoints : 0
  };
  sessionStorage.setItem('bk_pending_order', JSON.stringify(orderData));
  window.location.href = 'payment.html';
}
