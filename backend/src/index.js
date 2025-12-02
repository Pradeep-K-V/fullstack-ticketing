require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const ticketsRoute = require('./routes/tickets');
const healthRoute = require('./routes/health');
// const { getAuthMiddleware } = require('./middleware/auth'); // optional: comment out if not using Auth0

// our new auth
const authRoutes = require('./routes/auth');
const { jwtAuth } = require('./middleware/jwtAuth');

const app = express();

// CORS configuration - allow all origins for testing (can tighten later)
const corsOptions = {
  origin: '*',  // Allow all origins temporarily for mobile testing
  credentials: false,  // Can't use credentials with '*'
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 5000;

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

connectDB(process.env.MONGODB_URI);

app.use('/api/health', healthRoute);

// register auth routes
app.use('/api/auth', authRoutes);

// protect tickets with our jwtAuth middleware
app.use('/api/tickets', jwtAuth, ticketsRoute);

// If you ever want Auth0 instead, you can re-enable it:
// const authMiddleware = getAuthMiddleware(process.env.AUTH0_DOMAIN, process.env.AUTH0_AUDIENCE);
// app.use('/api/tickets', authMiddleware, ticketsRoute);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
