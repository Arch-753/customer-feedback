const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // For Fast2SMS

const app = express();
const PORT = 3000;

// ==========================================
// 🚀 INSERT YOUR FAST2SMS API KEY HERE
// ==========================================
const FAST2SMS_API_KEY = "YOUR_FAST2SMS_API_KEY_HERE";

// MongoDB handles OTP storage now
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// Connect to local MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/abc-trading-company')
    .then(() => console.log('Connected to local MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Schemas & Models ---

const reviewSchema = new mongoose.Schema({
    firmName: String,
    customerName: String,
    review: String,
    rating: Number,
    product: String,
    seen: { type: Boolean, default: false },
    adminReply: { type: String, default: "" },
    visits: [String],
    images: [String], // Array of Base64 strings
    createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    loginCount: { type: Number, default: 0 }
});

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    firmName: { type: String, required: true },
    customerName: { type: String, required: true },
    address: { type: String, required: true },
    statusNode: { type: Number, default: -1 }, // -1: idle/completed, 0: placed, 1: ready, 2: dispatched, 3: delivered, 4: reviewed
    isPaid: { type: Boolean, default: false },
    visits: [{ type: Date, default: Date.now }], // Tracking visits log
    createdAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true }
});
// TTL Index: Delete record when 'expiresAt' date is reached
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Review = mongoose.model('Review', reviewSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Order = mongoose.model('Order', orderSchema);
const Otp = mongoose.model('Otp', otpSchema);

// --- API Routes (Reviews) ---

app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: 1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const newReview = new Review(req.body);
        await newReview.save();
        res.status(201).json(newReview);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/reviews/:id/seen', async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(req.params.id, { seen: true }, { new: true });
        res.json(review);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/reviews/:id', async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reviews/search', async (req, res) => {
    try {
        const { firmName, customerName } = req.query;
        if(!firmName || !customerName) return res.status(400).json({ message: "Firm Name and Customer Name required" });
        const reviews = await Review.find({ 
            firmName: new RegExp(`^${firmName}$`, 'i'), 
            customerName: new RegExp(`^${customerName}$`, 'i') 
        }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/reviews/:id/reply', async (req, res) => {
    try {
        const { adminReply } = req.body;
        const review = await Review.findByIdAndUpdate(req.params.id, { adminReply, seen: true }, { new: true });
        res.json(review);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- Admin Auth Flow ---

// Check if admin is setup
app.get('/api/admin/check', async (req, res) => {
    try {
        const count = await Admin.countDocuments();
        res.json({ exists: count > 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Admin (First Login)
app.post('/api/admin/create', async (req, res) => {
    try {
        const count = await Admin.countDocuments();
        if (count > 0) return res.status(400).json({ message: 'Admin already exists' });

        const { phoneNumber, password } = req.body;
        if (!phoneNumber || !password) return res.status(400).json({ message: 'Missing fields' });

        const newAdmin = new Admin({ phoneNumber, password });
        await newAdmin.save();
        res.status(201).json({ message: 'Admin created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const admin = await Admin.findOne();
        if (!admin) return res.status(404).json({ message: 'No admin setup' });

        if (admin.phoneNumber === phoneNumber && admin.password === password) {
            await Admin.findByIdAndUpdate(admin._id, { $inc: { loginCount: 1 } });
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'Incorrect Phone Code or Password' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Request OTP (Forgot Password)
app.post('/api/admin/forgot', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        const admin = await Admin.findOne();
        if (!admin) return res.status(404).json({ message: "No admin configured" });

        if (admin.phoneNumber !== phoneNumber) {
            return res.status(401).json({ message: "Phone number not recognized" });
        }

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        // Store in MongoDB (Expires in 5 minutes)
        await Otp.deleteMany({ phoneNumber }); // Remove any existing OTPs for this number
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await new Otp({ phoneNumber, otp, expiresAt }).save();

        // Fallback or Simulation if API KEY is not set
        if (!FAST2SMS_API_KEY || FAST2SMS_API_KEY === "YOUR_FAST2SMS_API_KEY_HERE") {
            console.log(`\n\n=== 🚨 [TEST MODE] SMS SIMULATED 🚨 ===`);
            console.log(`FAST2SMS_API_KEY is not configured.`);
            console.log(`OTP FOR ${phoneNumber} is: ${otp}`);
            console.log(`======================================\n\n`);
            return res.json({ success: true, message: "OTP sent to console (API Key missing practically)" });
        }

        // Send via Fast2SMS
        await axios.get("https://www.fast2sms.com/dev/bulkV2", {
            params: {
                authorization: FAST2SMS_API_KEY,
                variables_values: otp,
                route: "otp",
                numbers: phoneNumber
            }
        });

        res.json({ success: true, message: "OTP sent successfully via SMS" });
    } catch (err) {
        let errorMsg = err.response?.data?.message || "Failed to send SMS. Check your API Keys.";
        console.error("Fast2SMS Error:", errorMsg);
        res.status(500).json({ message: errorMsg });
    }
});

// Verify OTP and Reset
app.post('/api/admin/reset', async (req, res) => {
    try {
        const { phoneNumber, otp, newPassword } = req.body;

        const record = await Otp.findOne({ phoneNumber });
        if (!record) return res.status(400).json({ success: false, message: "OTP missing or expired" });

        if (Date.now() > record.expiresAt.getTime()) {
            await Otp.deleteMany({ phoneNumber });
            return res.status(400).json({ success: false, message: "OTP Expired" });
        }

        if (record.otp !== otp) {
            return res.status(400).json({ success: false, message: "Incorrect OTP" });
        }

        // OTP Verified
        await Otp.deleteMany({ phoneNumber }); // Prevent reuse

        await Admin.updateOne({}, { password: newPassword });
        res.json({ success: true, message: "Password updated successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- Orders API ---

// Fetch all orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch single order (Track)
app.get('/api/orders/track/:orderId', async (req, res) => {
    try {
        const order = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            { $push: { visits: new Date() } },
            { new: true }
        );
        if(!order) return res.status(404).json({ message: "Order not found" });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add new Order
app.post('/api/orders', async (req, res) => {
    try {
        const { firmName, customerName, address } = req.body;
        if(!firmName || !customerName || !address) return res.status(400).json({ message: "Missing required fields" });
        
        // Generate random 6-digit ID
        let orderId;
        while (true) {
            orderId = Math.floor(100000 + Math.random() * 900000).toString();
            let check = await Order.findOne({ orderId });
            if (!check) break;
        }
        
        const newOrder = new Order({ orderId, firmName, customerName, address });
        await newOrder.save();
        res.status(201).json(newOrder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Order status
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { statusNode } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { statusNode }, { new: true });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Payment status
app.put('/api/orders/:id/payment', async (req, res) => {
    try {
        const { isPaid } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { isPaid }, { new: true });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start/Restart Order (generate new order ID and set status = 0)
app.put('/api/orders/:id/start', async (req, res) => {
    try {
        let orderId;
        while (true) {
            orderId = Math.floor(100000 + Math.random() * 900000).toString();
            let check = await Order.findOne({ orderId });
            if (!check) break;
        }
        const order = await Order.findByIdAndUpdate(req.params.id, { statusNode: 0, orderId }, { new: true });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Order completely
app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Server Start ---

app.listen(PORT, () => {
    console.log(`\n==========================================`);
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`==========================================`);
});
