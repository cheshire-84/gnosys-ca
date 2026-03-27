require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

// Import modular routes
const authRoutes = require('./routes/auth.routes');
const pkiRoutes = require('./routes/pki.routes');

const app = express();

// Security & Middleware
app.use(helmet());
app.use(cors({ origin: ['https://ca.gnosys.labs', 'http://localhost:5173'] }));
app.use(express.json());

// Initialize Database Connection
connectDB();

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api', pkiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Gnosys API: Online (Port ${PORT})`));