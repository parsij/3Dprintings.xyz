const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, wd');
})


app.get('/products/:id', (req, res) => {
const id = Number(req.params.id);

const products = [
    {id: 1, name: 'Product 1', price: 1},
    {id: 2, name: 'Product 2', price: 2},
    {id: 3, name: 'Product 3', price: 3},
    {id: 4, name: 'Product 4', price: 4},
    {id: 5, name: 'Product 5', price: 5}

]

const TheProductWanted = products.find(product => product.id === id);
res.json(TheProductWanted)
})

app.post('/api/signup', (req, res) => {
    console.log(req.body);
    const { username, email, password } = req.body;
    res.send({message: 'Hello, wd'});
})


app.listen(3000, () => {
    console.log('Server is running on port 3000');
})
