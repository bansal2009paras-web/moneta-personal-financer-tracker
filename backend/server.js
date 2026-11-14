import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true }));
app.use(express.json());

const userSchema = new mongoose.Schema({ name: { type: String, required: true }, email: { type: String, required: true, unique: true }, password: { type: String, required: true } }, { timestamps: true });
const txSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, title: { type: String, required: true }, amount: { type: Number, required: true, min: 0.01 }, type: { type: String, enum: ['income', 'expense'], required: true }, category: { type: String, required: true }, date: { type: Date, required: true } }, { timestamps: true });
const budgetSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, month: { type: String, required: true }, amount: { type: Number, required: true, min: 0 } }, { timestamps: true });
budgetSchema.index({ user: 1, month: 1 }, { unique: true });
const User = mongoose.model('User', userSchema), Transaction = mongoose.model('Transaction', txSchema), Budget = mongoose.model('Budget', budgetSchema);

const auth = (req, res, next) => { try { req.userId = jwt.verify(req.headers.authorization?.replace(/^Bearer\s+/i, '') || '', process.env.JWT_SECRET).id; next(); } catch { res.status(401).json({ message: 'Please sign in again.' }); } };
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.post('/api/auth/register', asyncRoute(async (req, res) => { const { name, email, password } = req.body; if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 8) return res.status(400).json({ message: 'Enter a name, valid email, and password with at least 8 characters.' }); if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with that email already exists.' }); const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password: await bcrypt.hash(password, 12) }); res.status(201).json({ token: jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' }), user: { name: user.name, email: user.email } }); }));
app.post('/api/auth/login', asyncRoute(async (req, res) => { const user = await User.findOne({ email: (req.body.email || '').toLowerCase() }); if (!user || !await bcrypt.compare(req.body.password || '', user.password)) return res.status(401).json({ message: 'Email or password is incorrect.' }); res.json({ token: jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' }), user: { name: user.name, email: user.email } }); }));
app.get('/api/auth/me', auth, asyncRoute(async (req, res) => { const user = await User.findById(req.userId).select('name email'); res.json(user); }));
app.get('/api/transactions', auth, asyncRoute(async (req, res) => { const q = { user: req.userId }; if (['income','expense'].includes(req.query.type)) q.type = req.query.type; if (req.query.category) q.category = req.query.category; res.json(await Transaction.find(q).sort({ date: -1, createdAt: -1 })); }));
app.post('/api/transactions', auth, asyncRoute(async (req, res) => { const t = await Transaction.create({ ...req.body, user: req.userId }); res.status(201).json(t); }));
app.put('/api/transactions/:id', auth, asyncRoute(async (req, res) => { const { title, amount, type, category, date } = req.body; const t = await Transaction.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { title, amount, type, category, date }, { new: true, runValidators: true }); if (!t) return res.status(404).json({ message: 'Transaction not found.' }); res.json(t); }));
app.delete('/api/transactions/:id', auth, asyncRoute(async (req, res) => { const t = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId }); if (!t) return res.status(404).json({ message: 'Transaction not found.' }); res.json({ message: 'Deleted.' }); }));
app.get('/api/dashboard', auth, asyncRoute(async (req, res) => { const month = req.query.month || new Date().toISOString().slice(0, 7); const start = new Date(`${month}-01T00:00:00.000Z`), end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1); const all = await Transaction.find({ user: req.userId }).sort({ date: -1 }).limit(100); const monthly = all.filter(t => t.date >= start && t.date < end); const sum = (list, type) => list.filter(t => t.type === type).reduce((a, t) => a + t.amount, 0); const budget = await Budget.findOne({ user: req.userId, month }); res.json({ income: sum(monthly, 'income'), expenses: sum(monthly, 'expense'), balance: sum(all, 'income') - sum(all, 'expense'), budget: budget?.amount || 0, recent: all.slice(0, 6), byCategory: Object.entries(monthly.filter(t => t.type === 'expense').reduce((a,t) => (a[t.category]=(a[t.category]||0)+t.amount,a), {})).map(([category,amount])=>({category,amount})) }); }));
app.put('/api/budget/:month', auth, asyncRoute(async (req, res) => { const month = req.params.month; if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(Number(req.body.amount)) || Number(req.body.amount) < 0) return res.status(400).json({ message: 'Enter a valid month and budget amount.' }); res.json(await Budget.findOneAndUpdate({ user: req.userId, month }, { amount: Number(req.body.amount) }, { upsert: true, new: true, runValidators: true })); }));
app.use((err, _req, res, _next) => { if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message }); if (err.code === 11000) return res.status(409).json({ message: 'That record already exists.' }); console.error(err); res.status(500).json({ message: 'Server error. Check the backend terminal.' }); });
const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI).then(() => app.listen(port, '0.0.0.0', () => console.log(`Moneta API listening on ${port}`))).catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
