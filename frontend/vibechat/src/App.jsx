import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import CryptoJS from 'crypto-js';

const socket = io('http://localhost:3001');
const SECRET_KEY = 'shared-secret-key';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [friends, setFriends] = useState([]);
  const [currentFriend, setCurrentFriend] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (loggedIn && currentFriend) {
      console.log(`Fetching messages for ${username} with ${currentFriend}`); // Log the request
      axios.get('http://localhost:3001/messages', { params: { username, friend: currentFriend } }).then((response) => {
        console.log('Fetched messages:', response.data); // Log the fetched messages
        const decryptedMessages = response.data.map((msg) => ({
          ...msg,
          content: decryptMessage(msg.content),
        }));
        console.log('Decrypted messages:', decryptedMessages); // Log the decrypted messages
        setMessages(decryptedMessages);
      }).catch((error) => {
        console.error('Failed to fetch messages:', error); // Log the error
      });

      socket.on('receive-message', (data) => {
        const decryptedContent = decryptMessage(data.message);
        console.log('Received message:', { sender: data.sender, content: decryptedContent }); // Log the received message
        setMessages((prev) => [...prev, { sender: data.sender, content: decryptedContent }]);
      });
    }
  }, [loggedIn, currentFriend]);

  const encryptMessage = (message) => CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
  const decryptMessage = (encryptedMessage) =>
    CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY).toString(CryptoJS.enc.Utf8);

  const handleLogin = () => {
    axios.post('http://localhost:3001/login', { username, password }).then(() => {
      setLoggedIn(true);
      axios.get('http://localhost:3001/friends', { params: { username } }).then((response) => {
        setFriends(response.data);
      });
    }).catch((error) => {
      console.error('Login error:', error);
      alert('Login failed. Please check your username and password.');
    });
  };

  const sendMessage = () => {
    const encryptedMessage = encryptMessage(message);
    console.log(`Sending message: ${message} to ${currentFriend}`); // Log the message
    socket.emit('send-message', { sender: username, recipient: currentFriend, message: encryptedMessage });
    setMessage('');
  };

  return !loggedIn ? (
    <div className="flex flex-col items-center justify-center h-screen">
      <input
        type="text"
        placeholder="Enter your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="border rounded p-2 mb-4"
      />
      <input
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border rounded p-2 mb-4"
      />
      <button onClick={handleLogin} className="bg-blue-500 text-white p-2 rounded">
        Login
      </button>
    </div>
  ) : (
    <div className="flex h-screen">
      <div className="w-1/4 border-r p-4">
        <h2 className="text-xl mb-4">Friends</h2>
        {friends.map((friend, idx) => (
          <div key={idx} className="mb-2 cursor-pointer" onClick={() => setCurrentFriend(friend)}>
            {friend}
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg, idx) => (
            <div key={idx} className="mb-2">
              <strong>{msg.sender}: </strong>
              <span>{msg.content}</span>
            </div>
          ))}
        </div>
        <div className="flex p-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 border rounded p-2"
            placeholder="Type a message"
          />
          <button onClick={sendMessage} className="ml-4 bg-blue-500 text-white p-2 rounded">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;