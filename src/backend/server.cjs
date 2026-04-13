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
      return res.status(400).json({ message: 'Missing fields' });
    }

    const query = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email
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
