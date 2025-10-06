// server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load keys from env
const RAZORPAY_KEY_ID = process.env.RP_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RP_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RP_WEBHOOK_SECRET || '';

const razorpay = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) ? new Razorpay({
key_id: RAZORPAY_KEY_ID,
key_secret: RAZORPAY_KEY_SECRET
}) : null;

// --- demo products (persist in DB in prod) ---
const PRODUCTS = [ /* your products array */ ];

// GET products
app.get('/api/products', (req, res) => res.json(PRODUCTS));

// CREATE ORDER (called by frontend)
app.post('/api/create-order', async (req, res) => {
try {
const { items = [], customer = {} } = req.body;
if (!items.length) return res.status(400).json({ error: 'Cart empty' });

// compute total (INR) and convert to paise
const amount = items.reduce((s, it) => s + (it.price * it.qty), 0);
const amountPaise = Math.round(amount * 100);

// If Razorpay not configured, return a demo order object (so client can still behave)
if (!razorpay) {
return res.json({
key: '', // empty means frontend should treat as demo/no gateway
order: { id: 'order_demo_' + Date.now(), amount: amountPaise, currency: 'INR' },
customer: { name: customer.name || '', email: customer.email || '', contact: customer.contact || '' }
});
}

// create Razorpay order
const orderOptions = {
amount: amountPaise,
currency: 'INR',
receipt: 'rcpt_' + Date.now(),
payment_capture: 1 // 1 => auto-capture; 0 => manual capture
};
const order = await razorpay.orders.create(orderOptions);

// Save order to DB (id, items, customer) — recommended in production

res.json({
key: RAZORPAY_KEY_ID,
order,
customer: { name: customer.name || '', email: customer.email || '', contact: customer.contact || '' }
});
} catch (err) {
console.error('create-order error', err);
res.status(500).json({ error: 'order_failed' });
}
});

// VERIFY PAYMENT (called by frontend after successful checkout)
app.post('/api/verify-payment', (req, res) => {
try {
const { payment = {}, orderId } = req.body;
// payment must contain: razorpay_payment_id, razorpay_order_id, razorpay_signature
if (!payment || !orderId) return res.status(400).json({ ok: false, reason: 'missing_params' });

// Signature verification (server-side)
// compute hmac_sha256(order_id + "|" + payment_id, key_secret)
const generatedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
.update(orderId + '|' + payment.razorpay_payment_id)
.digest('hex');

if (generatedSignature === payment.razorpay_signature) {
// verified -> mark order as paid in DB
console.log('Payment verified for order', orderId, payment.razorpay_payment_id);
return res.json({ ok: true });
} else {
console.warn('Payment signature mismatch', { generatedSignature, provided: payment.razorpay_signature });
return res.status(400).json({ ok: false, reason: 'invalid_signature' });
}
} catch (err) {
console.error('verify-payment error', err);
res.status(500).json({ ok: false, reason: 'server_error' });
}
});

/*
OPTIONAL: Webhook endpoint (recommended)
- Configure this URL in Razorpay Dashboard: https://<your-domain>/api/webhook
- Set the webhook secret in RP_WEBHOOK_SECRET env var and in Razorpay dashboard
*/
app.post('/api/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
const payload = req.body; // raw body required for signature verification
const signature = req.headers['x-razorpay-signature'];

if (!RAZORPAY_WEBHOOK_SECRET) {
console.warn('Webhook received but no webhook secret configured.');
return res.status(400).send('no_webhook_secret');
}

const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(payload).digest('hex');
if (expected !== signature) {
console.warn('Webhook signature mismatch');
return res.status(400).send('invalid_signature');
}

const event = JSON.parse(payload.toString());
// handle events e.g., payment.captured, payment.failed, order.paid etc.
console.log('Webhook event:', event.event, 'payload:', event.payload?.payment?.entity?.id);
// Persist payment status in DB here

res.status(200).send('ok');
});

app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
