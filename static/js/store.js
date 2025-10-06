const productsEl = document.getElementById('products');
const cartPanel = document.getElementById('cart-panel');
const cartItemsEl = document.getElementById('cart-items');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const checkoutBtn = document.getElementById('checkout-btn');
const closeCart = document.getElementById('close-cart');

let products = [];
let cart = {};

async function loadProducts() {
const res = await fetch('/api/products');
products = await res.json();
renderProducts();
}

function renderProducts() {
productsEl.innerHTML = '';
products.forEach(p => {
const card = document.createElement('div');
card.className = 'card';
card.innerHTML = `
<img src="${p.image}" alt="${p.name}" />
<h3>${p.name}</h3>
<p>${p.description}</p>
<div>₹ ${p.price.toFixed(2)}</div>
<button data-id="${p.id}">Add to Cart</button>
`;
productsEl.appendChild(card);
});

document.querySelectorAll('.card button').forEach(btn => {
btn.addEventListener('click', e => {
const id = e.currentTarget.dataset.id;
addToCart(id);
});
});
}

function addToCart(id) {
cart[id] = (cart[id] || 0) + 1;
updateCartUI();
cartPanel.style.display = 'block';
}

function updateCartUI() {
const items = Object.entries(cart).map(([id, qty]) => {
const p = products.find(x => x.id === id);
return { ...p, qty };
});

cartItemsEl.innerHTML = items.map(it => `
<div class="cart-item">
<img src="${it.image}" />
<div>
<strong>${it.name}</strong>
<div>₹ ${it.price.toFixed(2)} x ${it.qty}</div>
<button data-id="${it.id}" data-op="minus">-</button>
<button data-id="${it.id}" data-op="plus">+</button>
<button data-id="${it.id}" data-op="remove">Remove</button>
</div>
</div>
`).join('') || '<div>Your cart is empty</div>';

cartItemsEl.querySelectorAll('button').forEach(btn => {
btn.addEventListener('click', e => {
const id = e.currentTarget.dataset.id;
const op = e.currentTarget.dataset.op;
if (op === 'plus') cart[id]++;
else if (op === 'minus') { cart[id]--; if (cart[id] <= 0) delete cart[id]; }
else if (op === 'remove') delete cart[id];
updateCartUI();
});
});

const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
cartSubtotalEl.textContent = subtotal.toFixed(2);
}

// Checkout with Razorpay
checkoutBtn.addEventListener('click', async () => {
const items = Object.entries(cart).map(([id, qty]) => {
const p = products.find(x => x.id === id);
return { id: p.id, name: p.name, price: p.price, qty };
});

if (!items.length) return alert('Cart is empty');

const res = await fetch('/api/create-order', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ items, customer: { name: 'Guest', email: 'guest@example.com', contact: '' } })
});

const data = await res.json();
if (!data.key || !data.order.id) {
alert('Demo checkout: no gateway configured. Order: ' + data.order.id);
cart = {};
updateCartUI();
cartPanel.style.display = 'none';
return;
}

const options = {
key: data.key,
amount: data.order.amount,
currency: data.order.currency,
name: 'Arokya Collections',
description: 'Order #' + data.order.id,
order_id: data.order.id,
handler: async function(response) {
const verifyRes = await fetch('/api/verify-payment', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ payment: response, orderId: data.order.id })
});
const verifyJson = await verifyRes.json();
if (verifyJson.ok) {
alert('Payment successful!');
cart = {};
updateCartUI();
cartPanel.style.display = 'none';
} else {
alert('Payment verification failed');
}
},
prefill: { name: data.customer.name, email: data.customer.email, contact: data.customer.contact },
theme: { color: '#D63384' }
};
const rzp = new Razorpay(options);
rzp.on('payment.failed', resp => alert('Payment failed: ' + (resp.error.description || resp.error.reason || 'Unknown')));
rzp.open();
});

closeCart.addEventListener('click', () => cartPanel.style.display = 'none');

loadProducts();
