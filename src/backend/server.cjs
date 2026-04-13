const express = require('express');
const app = express();
const pool = require("./db.cjs"); // or "./db.cjs" if you rename it
const cors = require('cors');
const bcrypt = require("bcrypt");
app.use(cors());
app.use(express.json());



app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
    }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

  if (!passwordOk || username.trim().length < 3 || !emailOk)
    return res.status(400).json({ message: 'some of the data you provided is wrong please try again and refresh the page' });


  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    const query = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING username
    `;

const values = [username.trim(), email.toLowerCase().trim(), hashedPassword];
const result = await pool.query(query, values);

    return res.status(201).json({
      message: 'User created',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk)
      return res.status(400).json({ message: 'Invalid email format' });

 const result = await pool.query(
      "SELECT id, username, email, password FROM users WHERE email = $1",
      [email.toLowerCase().trim()]);
     if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password); // plain vs hash

    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
      return res.json({
      message: "Signed in",
      user: {username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err.message);
     return res.status(500).json({ message: "Server error" });
  }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})
