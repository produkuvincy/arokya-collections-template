const express = require('express');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/', express.static(path.join(__dirname, 'public')));

const PRODUCTS = [
  { id: 'clip001', name: 'Floral Hair Clip Set', description: 'Set of 6 stylish clips', price: 199.00, image: '/static/images/clip1.jpg' },
  { id: 'bangle001', name: 'Gold Plated Bangle (Set of 2)', description: 'Lightweight & elegant', price: 349.00, image: '/static/images/bangle1.jpg' },
  { id: 'earring001', name: 'Dangling Earrings', description: 'Trendy danglers', price: 249.00, image: '/static/images/earring1.jpg' },
  { id: 'bracelet001', name: 'Charm Bracelet', description: 'Cute charm bracelet', price: 179.00, image: '/static/images/bracelet1.jpg' },
  { id: 'neck001', name: 'Beaded Neck-piece', description: 'Colorful beads', price: 399.00, image: '/static/images/neck1.jpg' }
];

const RAZORPAY_KEY_ID = process.env.RP_KEY_ID || 'rzp_test_your_key_here';
const RAZORPAY_KEY_SECRET = process.env.RP_KEY_SECRET || 'your_key_secret_here';

const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

app.get('/api/products', (req,res)=>res.json(PRODUCTS));

app.listen(process.env.PORT || 3000, ()=>console.log('Server running...'));
