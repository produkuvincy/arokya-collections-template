const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const RAZORPAY_KEY_ID = process.env.RP_KEY_ID || 'rzp_test_xxxxxxxx';
const RAZORPAY_KEY_SECRET = process.env.RP_KEY_SECRET || 'xxxxxxxxxxxxxx';
const RAZORPAY_WEBHOOK_SECRET = process.env.RP_WEBHOOK_SECRET || 'xxxxxxxxxxxxxx';

const razorpay = new Razorpay({
key_id: RAZORPAY_KEY_ID,
key_secret: RAZORPAY_KEY_SECRET
});

// Sample products
const PRODUCTS = [
{ id: 'clip001', name: 'Floral Hair Clip Set', description: 'Set of 6 stylish clips', price: 199.00, image: '/images/clip1.jpg' },
{ id: 'bangle001', name: 'Gold Plated Bangles', description: 'Set of 2 elegant bangles', price: 349.00, image: '/images/bangle1.jpg' },
{ id: 'earring001', name: 'Dangling Earrings', description: 'Trendy danglers', price: 249.00, image: '/images/earring1.jpg' },
{ id: 'bracelet001', name: 'Charm Bracelet', description: 'Cute charm bracelet', price: 179.00, image: '/images/bracelet1.jpg' },
{ id: 'neck001', name: 'Beaded Neck-piece', description: 'Colorful beads', price: 399.00, image: '/images/neck1.jpg' }
];

// Get products
app.get('/api/products', (req, res) => res.json(PRODUCTS));

// Create Razorpay order
app.post('/api/create-order', async (req, res) => {
try {
const { items = [], customer = {} } = req.body;
if (!items.length) return res.status(400).json({ error: 'Cart empty' });

const amount = items.reduce((sum, it) => sum + it.price * it.qty, 0);
const amountPaise = Math.round(amount * 100);

const order = await razorpay.orders.create({
amount: amountPaise,
currency: 'INR',
receipt: 'rcpt_' + Date.now(),
payment_capture: 1
});

res.json({ key: RAZORPAY_KEY_ID, order, customer });
} catch (err) {
console.error(err);
res.status(500).json({ error: 'order_failed' });
}
});

// Verify payment
app.post('/api/verify-payment', (req, res) => {
try {
const { payment = {}, orderId } = req.body;
if (!payment || !orderId) return res.status(400).json({ ok: false, reason: 'missing_params' });

const generatedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
.update(orderId + '|' + payment.razorpay_payment_id)
.digest('hex');

if (generatedSignature === payment.razorpay_signature) {
console.log('Payment verified:', orderId);
return res.json({ ok: true });
} else {
return res.status(400).json({ ok: false, reason: 'invalid_signature' });
}
} catch (err) {
console.error(err);
res.status(500).json({ ok: false, reason: 'server_error' });
}
});

// Optional webhook
app.post('/api/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
const payload = req.body;
const signature = req.headers['x-razorpay-signature'];
const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(payload).digest('hex');
if (expected !== signature) return res.status(400).send('invalid_signature');
console.log('Webhook event received');
res.status(200).send('ok');
});

// Serve frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(process.env.PORT || 3000, () => console.log('Server running on port 3000'));
