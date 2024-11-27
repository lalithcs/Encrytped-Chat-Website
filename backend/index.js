const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');
const CryptoJS = require('crypto-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// API endpoint for user login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', username); // Log the login attempt
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      console.error('Database error:', err); // Log the error
      return res.status(500).json({ error: 'Failed to log in' });
    }
    if (row) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  });
});

// API endpoint to fetch chat history
app.get('/messages', (req, res) => {
  const { username, friend } = req.query;
  console.log(`Fetching messages between ${username} and ${friend}`); // Log the request
  db.all(
    'SELECT * FROM messages WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?) ORDER BY timestamp ASC',
    [username, friend, friend, username],
    (err, rows) => {
      if (err) {
        console.error('Failed to fetch messages:', err); // Log the error
        return res.status(500).json({ error: 'Failed to fetch messages' });
      }
      console.log('Fetched messages:', rows); // Log the fetched messages
      const decryptedMessages = rows.map((msg) => ({
        ...msg,
        content: CryptoJS.AES.decrypt(msg.content, 'shared-secret-key').toString(CryptoJS.enc.Utf8),
      }));
      console.log('Decrypted messages:', decryptedMessages); // Log the decrypted messages
      res.json(decryptedMessages);
    }
  );
});

// API endpoint to fetch friends list
app.get('/friends', (req, res) => {
  const { username } = req.query;
  db.all(
    'SELECT u.username FROM friends f JOIN users u ON f.friend_id = u.id WHERE f.user_id = (SELECT id FROM users WHERE username = ?)',
    [username],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch friends' });
      }
      res.json(rows.map(row => row.username));
    }
  );
});

// WebSocket connection for real-time chat
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('send-message', ({ sender, recipient, message }) => {
    const encryptedMessage = CryptoJS.AES.encrypt(message, 'shared-secret-key').toString();
    console.log(`Sending message from ${sender} to ${recipient}: ${message}`); // Log the message

    // Save to database
    db.run(
      'INSERT INTO messages (sender, recipient, content) VALUES (?, ?, ?)',
      [sender, recipient, encryptedMessage],
      (err) => {
        if (err) {
          console.error('Failed to save message:', err.message);
        } else {
          console.log('Message saved:', { sender, recipient, message });
          io.to(recipient).emit('receive-message', { sender, message: encryptedMessage });
        }
      }
    );
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start server
server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
