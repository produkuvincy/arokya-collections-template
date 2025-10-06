const productsEl = document.getElementById('products');
const cartBtn = document.getElementById('cart-btn');
const cartPanel = document.getElementById('cart-panel');
const cartItemsEl = document.getElementById('cart-items');
const cartCountEl = document.getElementById('cart-count');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const checkoutBtn = document.getElementById('checkout-btn');
const closeCart = document.getElementById('close-cart');

let products = [];
let cart = {};

async function loadProducts(){
  const res = await fetch('/api/products');
  products = await res.json();
  renderProducts();
}

function renderProducts(){
  productsEl.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="badge">New</div>
      <img src="${p.image}" alt="${p.name}" />
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <div class="price">₹ ${p.price.toFixed(2)}</div>
      <div style="padding:0 12px 12px;">
        <button class="btn primary" data-id="${p.id}">Add to Cart</button>
      </div>
    `;
    productsEl.appendChild(card);
  });

  document.querySelectorAll('.btn.primary').forEach(b => {
    b.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id;
      addToCart(id);
      e.currentTarget.innerText = 'Added!';
      setTimeout(()=>{ e.currentTarget.innerText = 'Add to Cart'; }, 900);
    });
  });
}

function addToCart(id){
  cart[id] = (cart[id] || 0) + 1;
  updateCartUI();
  cartPanel.classList.add('show');
}

function updateCartUI(){
  const items = Object.entries(cart).map(([id,qty]) => {
    const p = products.find(x=>x.id==id);
    return {...p, qty};
  });
  cartItemsEl.innerHTML = items.map(it => `
    <div class="cart-item">
      <img src="${it.image}" />
      <div style="flex:1">
        <div><strong>${it.name}</strong></div>
        <div>₹ ${it.price.toFixed(2)} x ${it.qty}</div>
        <div style="margin-top:8px">
          <button class="btn" data-id="${it.id}" data-op="minus">-</button>
          <button class="btn" data-id="${it.id}" data-op="plus">+</button>
          <button class="btn link" data-id="${it.id}" data-op="remove">Remove</button>
        </div>
      </div>
    </div>
  `).join('') || '<div>Your cart is empty</div>';

  cartItemsEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id;
      const op = e.currentTarget.dataset.op;
      if(op==='plus') cart[id] = (cart[id] || 0) + 1;
      else if(op==='minus'){ cart[id] = Math.max(0,(cart[id]||0)-1); if(cart[id]===0) delete cart[id]; }
      else if(op==='remove') delete cart[id];
      updateCartUI();
    });
  });

  const subtotal = items.reduce((s,it) => s + it.price * it.qty, 0);
  cartSubtotalEl.textContent = subtotal.toFixed(2);
  const count = items.reduce((s,it) => s + it.qty, 0);
  cartCountEl.textContent = count;
}

cartBtn.addEventListener('click', ()=>cartPanel.classList.toggle('show'));
closeCart.addEventListener('click', ()=>cartPanel.classList.remove('show'));

checkoutBtn.addEventListener('click', async () => {
  const items = Object.entries(cart).map(([id,qty]) => {
    const p = products.find(x=>x.id==id);
    return { id: p.id, name: p.name, price: p.price, qty };
  });
  if(items.length===0){ alert('Cart is empty'); return; }

  const res = await fetch('/api/create-order',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({items, customer:{name:'Guest', email:'guest@example.com', contact:''}})
  });
  const data = await res.json();
  if(data.error){ alert('Payment init failed'); console.error(data); return; }

  if(!data.key || !data.order.id){
    alert('Demo checkout: no payment gateway configured. Order created: ' + data.order.id);
    cart = {}; updateCartUI(); cartPanel.classList.remove('show'); return;
  }

  const options = {
    key: data.key,
    amount: data.order.amount,
    currency: data.order.currency,
    name: 'Arokya Collections',
    description: 'Order #' + data.order.id,
    order_id: data.order.id,
    handler: function (response) {
      fetch('/api/verify-payment',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({payment:response, orderId:data.order.id})
      }).then(r=>r.json()).then(res2=>{
        if(res2.ok){
          alert('Payment successful — Thank you!');
          cart = {}; updateCartUI(); cartPanel.classList.remove('show');
        } else {
          alert('Payment verification failed.');
        }
      });
    },
    modal:{escape:true},
    prefill:{name:data.customer.name,email:data.customer.email,contact:data.customer.contact}
  };
  const rzp = new Razorpay(options);
  rzp.on('payment.failed', resp=>{
    alert('Payment failed: '+(resp.error.reason||resp.error.description||'Unknown'));
  });
  rzp.open();
});

loadProducts();
