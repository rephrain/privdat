import express from 'express';
import mysql from 'mysql';
import session from 'express-session';
import memoryStore from 'memorystore';
import bodyParser from "body-parser";

const app = express();
const sessionStore = memoryStore(session);
app.use(session({
    cookie: {
        httpOnly: false,
        sameSite: 'strict',
        maxAge: 1 * 60 * 60 * 1000
    },
    store: new sessionStore({
        checkPeriod: 1 * 60 * 60 * 1000
    }),
    name: 'SID',
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}))
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));

const pool = mysql.createPool({
    user: 'root',
    password: '',
    database: 'tubes_privdat',
    host: 'localhost',
    connectionLimit: 10,
})

app.get('/', (req, res) => {
    res.render('login');
});

app.post('/', (req, res) => {
    const name = req.body.name;
    res.send(`Hello, ${name}!`);
});

app.listen(8080);
