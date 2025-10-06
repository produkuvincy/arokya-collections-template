const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const PRODUCTS = [
  { id: 'clip001', name: 'Floral Hair Clip Set', description: 'Set of 6 stylish clips', price: 199.00, image: '/images/clip1.jpg' },
  { id: 'clip002', name: 'Glitter Hair Clip Set', description: 'Set of 4 glitter clips', price: 149.00, image: '/images/clip2.jpg' },
  { id: 'bangle001', name: 'Gold Plated Bangles', description: 'Set of 2 elegant bangles', price: 349.00, image: '/images/bangle1.jpg' },
  { id: 'bangle002', name: 'Colorful Bangles', description: 'Set of 3 vibrant bangles', price: 299.00, image: '/images/bangle2.jpg' },
  { id: 'earring001', name: 'Dangling Earrings', description: 'Trendy danglers', price: 249.00, image: '/images/earring1.jpg' },
  { id: 'earring002', name: 'Stud Earrings', description: 'Cute studs', price: 179.00, image: '/images/earring2.jpg' },
  { id: 'bracelet001', name: 'Charm Bracelet', description: 'Cute charm bracelet', price: 179.00, image: '/images/bracelet1.jpg' },
  { id: 'bracelet002', name: 'Beaded Bracelet', description: 'Colorful beads', price: 199.00, image: '/images/bracelet2.jpg' },
  { id: 'neck001', name: 'Beaded Neck-piece', description: 'Colorful beads', price: 399.00, image: '/images/neck1.jpg' },
  { id: 'neck002', name: 'Pendant Necklace', description: 'Elegant pendant necklace', price: 499.00, image: '/images/neck2.jpg' }
];

const RAZORPAY_KEY_ID = process.env.RP_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RP_KEY_SECRET || '';

let razorpay;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

app.get('/api/products', (req, res) => {
  res.json(PRODUCTS);
});

app.post('/api/create-order', async (req, res) => {
  try {
    const { items, customer } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'Cart empty' });

    const amount = items.reduce((s, i) => s + (i.price * i.qty), 0);
    const amountPaise = Math.round(amount * 100);

    if (!razorpay) {
      // return a fake order for demo if keys not set
      return res.json({
        key: '',
        order: { id: 'order_demo_' + Date.now(), amount: amountPaise, currency: 'INR' },
        customer: { name: customer?.name || '', email: customer?.email || '', contact: customer?.contact || '' }
      });
    }

    const orderOptions = { amount: amountPaise, currency: 'INR', receipt: 'rcpt_' + Date.now(), payment_capture: 1 };
    const order = await razorpay.orders.create(orderOptions);
    res.json({ key: RAZORPAY_KEY_ID, order, customer: { name: customer?.name || '', email: customer?.email || '', contact: customer?.contact || '' } });
  } catch (err) {
    console.error('create-order error', err);
    res.status(500).json({ error: 'order_failed' });
  }
});

app.post('/api/verify-payment', (req, res) => {
  const { payment, orderId } = req.body;
  if (!RAZORPAY_KEY_SECRET) return res.status(400).json({ ok:false, reason:'no_secret' });

  const shasum = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
  shasum.update(orderId + '|' + payment.razorpay_payment_id);
  const digest = shasum.digest('hex');
  if (digest === payment.razorpay_signature) {
    console.log('Payment verified for order', orderId);
    return res.json({ ok:true });
  } else {
    console.warn('Signature mismatch', digest, payment.razorpay_signature);
    return res.status(400).json({ ok:false });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server running on port', PORT));
