const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./chat.db', (err) => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create tables
db.serialize(() => {
  // Drop the existing users and messages tables if they exist
  // db.run(`DROP TABLE IF EXISTS users`);
  // db.run(`DROP TABLE IF EXISTS messages`);
  // db.run(`DROP TABLE IF EXISTS friends`);

  // Create the users table with the correct schema
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  // Create the messages table with the correct schema
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      recipient TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create the friends table with the correct schema
  db.run(`
    CREATE TABLE IF NOT EXISTS friends (
      user_id INTEGER,
      friend_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (friend_id) REFERENCES users(id),
      PRIMARY KEY (user_id, friend_id)
    )
  `);

  // Insert two default users
  db.run(`
    INSERT INTO users (username, password) VALUES ('user1', 'password1'), ('user2', 'password2')
  `, (err) => {
    if (err) {
      console.error('Failed to insert default users:', err.message);
    } else {
      console.log('Default users created.');

      // Make them friends with each other
      db.run(`
        INSERT INTO friends (user_id, friend_id) VALUES 
        ((SELECT id FROM users WHERE username = 'user1'), (SELECT id FROM users WHERE username = 'user2')),
        ((SELECT id FROM users WHERE username = 'user2'), (SELECT id FROM users WHERE username = 'user1'))
      `, (err) => {
        if (err) {
          console.error('Failed to create friendship:', err.message);
        } else {
          console.log('Friendship created.');
        }
      });
    }
  });
});

module.exports = db;

