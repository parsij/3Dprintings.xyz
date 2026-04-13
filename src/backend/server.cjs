const express = require('express');
const app = express();
const pool = require("./db.cjs"); // or "./db.cjs" if you rename it
const cors = require('cors');
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

  if (!passwordOk && username.trim().length < 3 && !emailOk)
    return res.status(400).json({ message: 'some of the data you provided is wrong please try again and refresh the page' });

    const query = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING username
    `;

    const values = [username, email, password];
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


app.listen(3000, () => {
    console.log('Server is running on port 3000');
})
