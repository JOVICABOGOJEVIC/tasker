import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth/user.js';
import companyAuthRoutes from './routes/auth/company.js';
import companyRoutes from './routes/company/company.js';
import jobRoutes from './routes/job/job.js';
import clientRoutes from './routes/client/client.js';
import workerRoutes from './routes/worker/worker.js';
import workerStatusRoutes from './routes/worker/workerStatus.js';
import sparePartRoutes from './routes/sparePart/sparePart.js';
import teamRoutes from './routes/team/team.js';
import superAdminRoutes from './routes/superadmin/superAdmin.js';
import notificationRoutes from './routes/notification/notification.js';
import inventoryRoutes from './routes/inventory/inventory.js';
import paymentRoutes from './routes/payment/payment.js';
import subscriptionPaymentRoutes from './routes/subscriptionPayment/subscriptionPayment.js';
import serviceRoutes from './routes/service/service.js';
import aiBusinessRoutes from './routes/aiBusiness.js';

// Konfigurisanje dotenv-a
dotenv.config({ path: './.env' });
console.log("📁 Server .env loaded from:", process.cwd() + '/.env');
console.log("📧 SMTP_USER:", process.env.SMTP_USER ? "✅ Postavljen" : "❌ NEDOSTAJE");
console.log("📧 SMTP_PASSWORD:", process.env.SMTP_PASSWORD ? "✅ Postavljen" : "❌ NEDOSTAJE");

const app = express();
const server = createServer(app);

// Socket.IO konfiguracija
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

// CORS konfiguracija
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['*'];

app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));

// Middleware za logovanje zahteva
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// MongoDB povezivanje
const CONNECTION_URL = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

if (!CONNECTION_URL) {
    console.error("MONGODB_URI is not defined in .env file");
    process.exit(1);
}

console.log("Attempting to connect to MongoDB Atlas...");
console.log("Connection URL:", CONNECTION_URL.replace(/\/\/[^@]+@/, '//****:****@')); // Maskiraj lozinku u logovima

mongoose.connect(CONNECTION_URL)
  .then(() => {
    console.log("Connected to MongoDB Atlas successfully");
    // Proveri da li postoji bar jedna kompanija u bazi
    const Company = mongoose.model('Company');
    Company.findOne({})
      .then(company => {
        if (company) {
          console.log("Found at least one company in the database");
        } else {
          console.log("No companies found in the database");
        }
      })
      .catch(err => console.error("Error checking companies:", err));
  })
  .catch((error) => {
    console.error("MongoDB Atlas connection error:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      codeName: error.codeName
    });
  });

// Socket.IO event handlers
io.on('connection', (socket) => {
  const timestamp = new Date().toISOString();
  const clientIP = socket.handshake.address || socket.request?.socket?.remoteAddress || 'unknown';
  const transport = socket.conn?.transport?.name || 'unknown';
  
  console.log(`[${timestamp}] 🔌 User connected: ${socket.id}`);
  console.log(`  📍 IP: ${clientIP} | Transport: ${transport}`);
  
  // Store user info for disconnect logging
  let userInfo = {
    userId: null,
    userType: null,
    businessType: null,
    rooms: []
  };
  
  // Join user to specific room based on user type
  socket.on('join_room', (data) => {
    const { userType, userId, businessType } = data;
    const roomName = `${userType}_${businessType || 'default'}`;
    socket.join(roomName);
    
    // Update user info
    userInfo.userId = userId;
    userInfo.userType = userType;
    userInfo.businessType = businessType;
    if (!userInfo.rooms.includes(roomName)) {
      userInfo.rooms.push(roomName);
    }
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 👤 User ${userId} joined room: ${roomName}`);
    console.log(`  📋 User Type: ${userType} | Business Type: ${businessType || 'default'}`);
  });
  
  // Handle job status updates
  socket.on('job_status_update', (data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📋 Job status update:`, data);
    // Broadcast to all users in the same business type
    io.to(`${data.userType}_${data.businessType}`).emit('job_updated', data);
  });
  
  // Handle worker status updates
  socket.on('worker_status_update', (data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 👷 Worker status update:`, data);
    // Broadcast to admin users
    io.to(`company_${data.businessType}`).emit('worker_status_changed', data);
  });
  
  socket.on('disconnect', (reason) => {
    const timestamp = new Date().toISOString();
    const disconnectReasons = {
      'io server disconnect': 'Server forcibly disconnected',
      'io client disconnect': 'Client manually disconnected',
      'ping timeout': 'Ping timeout - no response from client',
      'transport close': 'Transport connection closed',
      'transport error': 'Transport error occurred',
      'parse error': 'Error parsing message',
      'server shutting down': 'Server is shutting down'
    };
    
    const reasonText = disconnectReasons[reason] || reason || 'Unknown reason';
    
    console.log(`[${timestamp}] 🔌 User disconnected: ${socket.id}`);
    console.log(`  ❌ Reason: ${reasonText} (${reason || 'N/A'})`);
    
    if (userInfo.userId) {
      console.log(`  👤 User ID: ${userInfo.userId}`);
      console.log(`  📋 User Type: ${userInfo.userType || 'N/A'} | Business Type: ${userInfo.businessType || 'N/A'}`);
    }
    
    if (userInfo.rooms.length > 0) {
      console.log(`  🏠 Rooms: ${userInfo.rooms.join(', ')}`);
    }
    
    // Calculate connection duration if we have connection time
    if (socket.handshake?.issued) {
      const connectionDuration = Date.now() - new Date(socket.handshake.issued).getTime();
      const durationSeconds = Math.floor(connectionDuration / 1000);
      console.log(`  ⏱️  Connection duration: ${durationSeconds}s`);
    }
  });
  
  // Handle connection errors
  socket.on('error', (error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ⚠️  Socket error for ${socket.id}:`, error.message);
  });
});

// Make io available to routes
app.set('io', io);

app.use("/api/auth", authRoutes);
app.use("/api/auth", companyAuthRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/worker", workerRoutes); // Changed from /api/workers to /api/worker
app.use("/api/worker", workerStatusRoutes); // Worker status routes
app.use("/api/sparePart", sparePartRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/subscription-payments", subscriptionPaymentRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/ai-business", aiBusinessRoutes);

// Middleware za logovanje grešaka
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Something went wrong' });
});

server.listen(PORT, () => console.log(`Server Running on Port: http://localhost:${PORT}`));