import express from 'express';
import mysql from 'mysql';
import session from 'express-session';
import memoryStore from 'memorystore';
import bodyParser from "body-parser";
import crypto from 'crypto';
import multer from 'multer';

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
    res.render('home_page');
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

app.get('/employee', (req, res) => {
    res.render('login');
});

app.get('/officer/home', (req, res) => {
    if (req.session.role === 'officer'){
        res.render('home_officer');
    }
    else {
        res.send('Silahkan melakukan login employee')
    }
});

app.get('/applicant_form1', (req, res) => {
    res.render('form1_applicant');
});

app.get('/applicant_form2', (req, res) => {
    res.render('form2_applicant');
});

app.get('/applicant_form3', (req, res) => {
    res.render('form3_applicant');
});

app.post('/logout', (req,res) => {
    req.session.destroy();
    res.redirect('/employee');
})

app.listen(8080);
