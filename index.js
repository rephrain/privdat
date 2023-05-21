import express from 'express';
import mysql from 'mysql';
import session from 'express-session';
import memoryStore from 'memorystore';
import bodyParser from "body-parser";
import crypto from 'crypto';

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
    let username = req.body.username
    let password = req.body.password
    const hashed_pass = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
    pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, hashed_pass], (err, result) => {
        if (result.length > 0){
            req.session.username = username;
            //login as admin
            if (result[0].role === 1) {
                req.session.role = 'officer';               
                res.redirect('/officer/home');
            }
        }
        else{
            res.send(hashed_pass)
        }
    })
});

app.get('/officer/home', (req, res) => {

    res.render('home_officer');
});

app.get('/applicant_form', (req, res) => {

    res.render('form1_applicant');
});

app.listen(8080);
