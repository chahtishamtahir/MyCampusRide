/*
 * MyCampusRide Backend Server
 *
 * This is the main entry point for the backend server.
 * It sets up Express.js, connects to MongoDB, and configures all middleware and routes.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { initializeSocketService } = require('./services/socketService');

// Load environment variables from .env file
// This allows us to keep sensitive information (like database URLs and secrets) secure
// Instead of hardcoding values, we read them from the .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Create Express application instance
// Express is a web framework that helps us build APIs easily
const app = express();

// Create HTTP server to attach Socket.IO
const server = createServer(app);

// Configure allowed origins for CORS
const allowedOrigins = [];
if (process.env.FRONTEND_URL) {
  const url = process.env.FRONTEND_URL.trim();
  allowedOrigins.push(url);
  if (url.endsWith('/')) {
    allowedOrigins.push(url.slice(0, -1));
  } else {
    allowedOrigins.push(url + '/');
  }
}
// Always allow local development origins
allowedOrigins.push('http://localhost:3000');
allowedOrigins.push('http://localhost:3000/');
allowedOrigins.push('http://localhost:5173');
allowedOrigins.push('http://localhost:5173/');

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize socket service
initializeSocketService(io);

// CORS (Cross-Origin Resource Sharing) Configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log(`⚠️ [CORS Blocked] Origin: "${origin}". Allowed origins list:`, allowedOrigins);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware Configuration
// Middleware functions run before our route handlers and help process requests

// express.json() - Parses incoming JSON data from request bodies
// This allows us to access req.body in our route handlers
app.use(express.json());

// express.urlencoded() - Parses URL-encoded data (like form submissions)
// extended: true allows for rich objects and arrays to be encoded
app.use(express.urlencoded({ extended: true }));

// cookieParser() - Parses cookies from incoming requests
// This is used for authentication (storing JWT tokens in cookies)
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO Room Management
const activeRooms = new Map(); // Track room memberships
const userConnections = new Map(); // Track user connections

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`⚡ User connected: ${socket.id}`);
  
  // Handle user joining a room
  socket.on('join-room', (data) => {
    const { userId, role, roomId } = data;
    
    // Store user connection info
    userConnections.set(socket.id, { userId, role, roomId });
    
    // Join the specified room
    if (roomId) socket.join(roomId);
    
    // Always join private user room
    socket.join(`user-${userId}`);
    
    // Always join role-specific room
    socket.join(`${role}-room`);
    
    // Track room membership
    if (roomId) {
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Set());
      }
      activeRooms.get(roomId).add(socket.id);
    }
    
    console.log(`👥 User ${userId} (${role}) joined rooms: ${roomId || 'none'}, user-${userId}, ${role}-room`);
  });
  
  // Handle location updates from drivers
  socket.on('location-update', (data) => {
    const { busId, location, timestamp } = data;
    
    // Broadcast to relevant rooms
    // Admins get all location updates
    socket.to('admin-room').emit('bus-location-update', {
      busId,
      location,
      timestamp
    });
    
    // Students on the same route get updates
    socket.to(`route-${data.routeId}`).emit('bus-location-update', {
      busId,
      location,
      timestamp
    });
    
    // Specific bus followers
    socket.to(`bus-${busId}`).emit('bus-location-update', {
      busId,
      location,
      timestamp
    });
    
    console.log(`📍 Location update for bus ${busId}: ${location.latitude}, ${location.longitude}`);
  });
  
  // Handle trip start notification
  socket.on('trip-started', (data) => {
    const { busId, routeId, driverId } = data;
    
    // Notify admins
    socket.to('admin-room').emit('trip-notification', {
      type: 'started',
      busId,
      routeId,
      driverId,
      timestamp: new Date()
    });
    
    // Notify students on this route
    socket.to(`route-${routeId}`).emit('trip-notification', {
      type: 'started',
      busId,
      routeId,
      message: `Bus ${data.busNumber} has started its trip`
    });
    
    console.log(`🚀 Trip started for bus ${busId} on route ${routeId}`);
  });
  
  // Handle trip end notification
  socket.on('trip-ended', (data) => {
    const { busId, routeId, driverId } = data;
    
    // Notify admins
    socket.to('admin-room').emit('trip-notification', {
      type: 'ended',
      busId,
      routeId,
      driverId,
      timestamp: new Date()
    });
    
    // Notify students on this route
    socket.to(`route-${routeId}`).emit('trip-notification', {
      type: 'ended',
      busId,
      routeId,
      message: `Bus ${data.busNumber} has completed its trip`
    });
    
    console.log(`🏁 Trip ended for bus ${busId} on route ${routeId}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const userInfo = userConnections.get(socket.id);
    if (userInfo) {
      const { userId, roomId } = userInfo;
      
      // Remove from room
      if (activeRooms.has(roomId)) {
        activeRooms.get(roomId).delete(socket.id);
        if (activeRooms.get(roomId).size === 0) {
          activeRooms.delete(roomId);
        }
      }
      
      // Remove user connection
      userConnections.delete(socket.id);
      
      console.log(`🔌 User ${userId} disconnected from room: ${roomId}`);
      console.log(`📊 Active rooms: ${Array.from(activeRooms.keys()).length}`);
    }
  });
});

// API Routes Configuration
// Each route file handles a specific domain of our application
// All routes are prefixed with /api/ for better organization

// Authentication routes - handles login, register, logout
app.use('/api/auth', require('./routes/auth'));

// User management routes - CRUD operations for users
app.use('/api/users', require('./routes/users'));

// Bus management routes - CRUD operations for buses
app.use('/api/buses', require('./routes/buses'));

// Route management routes - CRUD operations for bus routes
app.use('/api/routes', require('./routes/routes'));

// Tracking routes - handles real-time bus location tracking
app.use('/api/tracking', require('./routes/tracking'));

// Notification routes - handles sending and receiving notifications
app.use('/api/notifications', require('./routes/notifications'));

// Global Error Handling Middleware
// This catches any errors from route handlers and formats them consistently
// It must be defined AFTER all routes
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// Root path endpoint (highly recommended for platform health checks)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Welcome to MyCampusRide Backend API'
  });
});

// Health Check Endpoint
// This is a simple endpoint to verify the server is running
// Useful for monitoring and deployment health checks
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MyCampusRide Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Database Connection
// Connect to MongoDB using the connection string from environment variables
// This keeps the actual database URL secure and not hardcoded
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mycampusride';
console.log('Connecting to MongoDB...');

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    // If connection fails, log the error and exit the application
    // This prevents the server from running without a database connection
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1); // Exit code 1 indicates an error
  });

// Server Configuration
// Use PORT from environment variables, or default to 5000 for local development
const PORT = process.env.PORT || 5000;

// Start the HTTP server (with Socket.IO) instead of Express server directly
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚌 MyCampusRide Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ Socket.IO enabled for real-time tracking`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
