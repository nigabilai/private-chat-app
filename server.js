const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection with your URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nigaabilai:nur12903@nigabilai.ecqbo4s.mongodb.net/?retryWrites=true&w=majority&appName=nigabilai';

// Enhanced connection settings
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds timeout
  socketTimeoutMS: 45000, // 45 seconds socket timeout
  retryWrites: true,
  w: 'majority'
};

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Attempt to reconnect after 5 seconds
    setTimeout(() => mongoose.connect(MONGODB_URI, mongooseOptions), 5000);
  });

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from DB');
});

// Message Schema
const messageSchema = new mongoose.Schema({
  name: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Socket.io with improved error handling
io.on('connection', (socket) => {
  console.log('A user connected with ID:', socket.id);

  // Get previous messages with timeout handling
  const fetchMessages = async () => {
    try {
      const messages = await Message.find()
        .sort({ timestamp: 1 })
        .limit(50)
        .maxTimeMS(20000); // 20 second timeout for query
      socket.emit('previous messages', messages);
    } catch (err) {
      console.error('Error fetching messages:', err);
      socket.emit('error', 'Failed to load message history');
    }
  };

  fetchMessages();

  socket.on('chat message', async (msg) => {
    if (!msg.name || !msg.text) {
      return console.error('Invalid message format:', msg);
    }

    try {
      const message = new Message(msg);
      await message.save();
      console.log('Message saved:', msg);
      io.emit('chat message', msg);
    } catch (err) {
      console.error('Error saving message:', err);
      socket.emit('error', 'Failed to save message');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});