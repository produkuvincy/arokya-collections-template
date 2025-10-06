// simplified store.js
async function loadProducts(){
  const res = await fetch('/api/products');
  const products = await res.json();
  const grid = document.getElementById('products');
  grid.innerHTML = products.map(p=>`
    <div class='card'>
      <img src='${p.image}' alt='${p.name}' />
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <strong>₹${p.price}</strong><br>
      <button class='btn primary' onclick='alert("Add to cart feature active in full version")'>Add</button>
    </div>
  `).join('');
}
loadProducts();
