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

// Konfigurisanje dotenv-a
dotenv.config({ path: './.env' });

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
app.use(cors({
  origin: '*', // Dozvoli pristup sa svih domena
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
  console.log(`🔌 User connected: ${socket.id}`);
  
  // Join user to specific room based on user type
  socket.on('join_room', (data) => {
    const { userType, userId, businessType } = data;
    const roomName = `${userType}_${businessType || 'default'}`;
    socket.join(roomName);
    console.log(`👤 User ${userId} joined room: ${roomName}`);
  });
  
  // Handle job status updates
  socket.on('job_status_update', (data) => {
    console.log(`📋 Job status update:`, data);
    // Broadcast to all users in the same business type
    io.to(`${data.userType}_${data.businessType}`).emit('job_updated', data);
  });
  
  // Handle worker status updates
  socket.on('worker_status_update', (data) => {
    console.log(`👷 Worker status update:`, data);
    // Broadcast to admin users
    io.to(`company_${data.businessType}`).emit('worker_status_changed', data);
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
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

// Middleware za logovanje grešaka
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Something went wrong' });
});

server.listen(PORT, () => console.log(`Server Running on Port: http://localhost:${PORT}`));