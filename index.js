const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.post('/', (req, res) => {
    const name = req.body.name;
    res.send(`Hello, ${name}!`);
});

app.listen(8080);
