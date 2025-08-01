const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",  // Allow all origins (update in production)
    methods: ["GET", "POST"]
  }
});
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Hardcoded MongoDB Connection (no .env)
const MONGODB_URI = 'mongodb+srv://nigaabilai:nur12903@nigabilai.ecqbo4s.mongodb.net/?retryWrites=true&w=majority&appName=nigabilai';

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,  // 30 seconds
  socketTimeoutMS: 45000,          // 45 seconds
  retryWrites: true,
  w: 'majority'
};

// Connect to MongoDB with automatic retries
const connectDB = () => {
  mongoose.connect(MONGODB_URI, mongooseOptions)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
      console.error('MongoDB connection failed:', err.message);
      console.log('Retrying in 5 seconds...');
      setTimeout(connectDB, 5000);
    });
};
connectDB();

// Database event listeners
mongoose.connection.on('connected', () => console.log('Mongoose connected'));
mongoose.connection.on('error', err => console.error('Mongoose error:', err));
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));

// Message Model
const Message = mongoose.model('Message', new mongoose.Schema({
  name: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
}));

// Socket.IO with error handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send message history
  Message.find().sort({ timestamp: -1 }).limit(50)
  .then(messages => {
    // Since we fetched newest first, reverse to display them in correct order
    socket.emit('previous messages', messages.reverse());
  })

    .then(messages => socket.emit('previous messages', messages))
    .catch(err => console.error('Fetch messages error:', err));

  // Handle new messages
  socket.on('chat message', async (msg) => {
    if (!msg.name || !msg.text) return;
    
    try {
      await new Message(msg).save();
      io.emit('chat message', msg);  // Broadcast to all
    } catch (err) {
      console.error('Save message error:', err);
    }
  });

  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

// Health check route (required for Render)
app.get('/health', (req, res) => res.sendStatus(200));

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Crash prevention
process.on('uncaughtException', err => console.error('Crash prevented:', err));