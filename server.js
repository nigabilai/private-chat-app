const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const path = require('path');

// Connect to MongoDB (replace <password> and <dbname>)
mongoose.connect('mongodb+srv://nigaabilai:nur12903@nigabilai.mongodb.net/nigaabilai?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define message schema
const messageSchema = new mongoose.Schema({
  name: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// On socket connection
io.on('connection', (socket) => {
  console.log('A user connected');

  // Send previous messages
  Message.find().sort({ timestamp: 1 }).limit(50).then((msgs) => {
    socket.emit('previous messages', msgs);
  });

  // Receive and store new message
  socket.on('chat message', (msg) => {
    const message = new Message(msg);
    message.save().then(() => {
      io.emit('chat message', msg); // Send to everyone
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
