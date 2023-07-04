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

var upload = multer({
    storage: multer.memoryStorage()
});

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

    pool.query('SELECT salt FROM users WHERE username = ?', username, (err, result1) => {
        if (result1.length > 0){
            let salted = password.concat(result1[0].salt)
            const hashed_pass = crypto
            .createHash("sha256")
            .update(salted.concat('privdat'))
            .digest("hex");
            pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, hashed_pass], (err, result2) => {
                if (result2.length > 0){
                    req.session.username = username;
                    req.session.id_user = result2[0].id
                    if (result2[0].role === 1) {
                        req.session.role = 'officer';
                        res.redirect('/officer/home');
                    }
                    else if (result2[0].role === 2) {
                        req.session.role = 'nasabah'; 
                        pool.query('SELECT nama_lengkap FROM customer_data_main WHERE id_user = ?', req.session.id_user, (err, result3) => {
                            req.session.nama_lengkap = result3[0].nama_lengkap
                            res.redirect('/nasabah/home');
                        })                           
                    }
                    else if (result2[0].role === 3) {
                        req.session.role = 'cs';               
                        res.redirect('/customer_service/home');
                    }
                    
                }
                else{
                    res.send('Email/Password salah!')
                }
            })
        }
        else {
            res.send('Email/Password salah!')
        }
    })
});

app.get('/login', (req, res) => {
    req.session.destroy();
    res.render('login')
});

app.get('/nasabah/home', (req, res) => {
    if (req.session.role === 'nasabah'){
        res.render('home_nasabah', {nama_lengkap : req.session.nama_lengkap})
    }
    else {
        res.render('access_denied')
    }
});

app.get('/officer/home', (req, res) => {
    if (req.session.role === 'officer'){
        res.render('home_officer');
    }
    else {
        res.render('access_denied')
    }
});

app.get('/customer_service/home', (req, res) => {
    if (req.session.role === 'cs'){
        res.render('home_cs');
    }
    else {
        res.render('access_denied')
    }
});

app.get('/nasabah/applicant_form', (req, res) => {
    if (req.session.role === 'nasabah'){
        res.render('form_applicant');    }
    else {
        res.render('access_denied')
    }
});

app.post('/nasabah/applicant_form', upload.fields([
    { name: 'img_npwp', maxCount: 1 },
    { name: 'img_selfie', maxCount: 1 }
    ]), (req, res) => {
    
    let npwp = req.files['img_npwp'][0].buffer.toString('base64')
    let selfie = req.files['img_selfie'][0].buffer.toString('base64')
    let pekerjaan = req.body.dropdown_pekerjaan
    let jabatan = req.body.jabatan
    let jenis_usaha = req.body.dropdown_jenis
    let nama_perusahaan = req.body.company
    let penghasilan = req.body.income
    let lama_bekerja_tahun = req.body.year
    let lama_bekerja_bulan = req.body.month
    let alamat_perusahaan = req.body.address
    let kota = req.body.city
    let kode_pos = req.body.postal
    let no_telp_kantor = req.body.office
    let jumlah_pengajuan = req.body.loan
    let tanggal_pengajuan = new Date()
    tanggal_pengajuan = tanggal_pengajuan.toISOString().split('T')[0]

    let alasan = req.body.alasan
    // tanggal_pengajuan = tanggal_pengajuan.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
    // tanggal_pengajuan = tanggal_pengajuan.replace(/\//g, '-')

    // let parts = tanggal_pengajuan.split('-');
    // let transformedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

    // console.log(tanggal_pengajuan)

    pool.query('SELECT id FROM data_pekerjaan WHERE jenis = ?', pekerjaan, (err1, id_pekerjaan) =>{
        pool.query('SELECT id FROM data_usaha WHERE jenis = ?', jenis_usaha, (err2, id_usaha) =>{
            pool.query('INSERT INTO customer_data_loan_form VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
            [null, req.session.id_user, npwp, selfie,
            id_pekerjaan[0].id, jabatan, id_usaha[0].id, nama_perusahaan,
            penghasilan, lama_bekerja_tahun, lama_bekerja_bulan, alamat_perusahaan,
            kota, kode_pos, no_telp_kantor, jumlah_pengajuan, tanggal_pengajuan, alasan], (err, result) =>{
                if (err){
                    res.send(err)
                }
                else{
                    res.render('pengajuan_berhasil')
                }
            })
        })
    })
})  

app.get('/nasabah/application_management', (req, res) =>{
    // pool.query('SELECT * FROM customer_data_loan_form WHERE id_user = ?', req.session.id_user, (err1, result1) => {
    //     pool.query('SELECT * FROM customer_loan_status WHERE id_loan = ?', result1.id, (err2, result2) => {
    //         res.render('customer_application_management', {
    //             data_loan : result1,
    //             data_status : result2
    //         })
    //     })
    // })
    pool.query('SELECT * FROM customer_data_loan_form LEFT JOIN customer_loan_status ON customer_data_loan_form.id = customer_loan_status.id_loan WHERE customer_data_loan_form.id_user = ?', req.session.id_user, (err, result)=>{
        console.log(result)
        res.render('customer_application_management', {
            loans : result
        })
    })
})

app.post('/logout', (req,res) => {
    req.session.destroy();
    res.redirect('/');
})

app.get('/signup', upload.single('img_ktp'), (req, res) => {
    res.render('form_signup');
});

app.post('/signup', upload.single('img_ktp'), (req, res) => {
    let email = req.body.email
    let password = req.body.pwd
    let nama_lengkap = req.body.name
    let nik = req.body.nik
    let tanggal_lahir = req.body.dob
    let no_hp = req.body.phone
    let alamat = req.body.address
    let ktp = req.file.buffer.toString('base64')

    let salt = crypto.randomBytes(4).toString('hex')
    let salted = password.concat(salt)
    const hashed_pass = crypto
    .createHash("sha256")
    .update(salted.concat('privdat'))
    .digest("hex");

    pool.query('INSERT INTO users VALUES(?, ?, ?, ?, ?)', [null, email, hashed_pass, 2, salt], (err, result1) =>{
        pool.query('SELECT id FROM users WHERE username = ? AND password = ?', [email, hashed_pass], (err1, resId) => {
            let id_user = resId[0].id
            console.log(id_user)
            pool.query('INSERT INTO customer_data_main VALUES (?,?,?,?,?,?,?,?)', [null, id_user, nama_lengkap, nik, tanggal_lahir, no_hp, alamat, ktp], (err, result2) =>{
                res.send('Sign up berhasil. Silahkan lakukan log in!')
            })
        })
    })
});

app.get('/officer/application_management', (req, res) => {
    pool.query('SELECT customer_data_loan_form.id, customer_data_main.nama_lengkap, customer_data_loan_form.id_user, customer_data_loan_form.jumlah_pengajuan, customer_data_loan_form.tanggal_pengajuan FROM customer_data_loan_form LEFT JOIN customer_loan_status ON customer_data_loan_form.id = customer_loan_status.id_loan LEFT JOIN customer_data_main ON customer_data_loan_form.id_user = customer_data_main.id_user',
    (err, result) => {
        res.render('application_management.ejs', {
            applications : result
        })
    })
})

app.get('/officer/application_management/detail/:id', (req, res) => {
    const id_loan = req.params.id;
    pool.query('SELECT * FROM customer_data_loan_form JOIN customer_data_main ON customer_data_loan_form.id_user = customer_data_main.id_user WHERE customer_data_loan_form.id = ?', id_loan, (err, result) =>{
        res.render('application_detail', {
            detail : result[0]
        })
    })
})

app.listen(8080);
