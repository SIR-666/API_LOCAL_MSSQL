const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const koneksi = require('./config/database');
const NodeCache = require('node-cache');

const myCache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // Cache TTL of 10 minutes
const app = express();

const PORT = process.env.PORT || 5000;
app.use(cors());
// set body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// set body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//---------------------------------API HISTORY---------------------------------//
// read data / get data
app.get('/api/spms_trans', (req, res) => {
    // Ambil parameter status dari query string
    const { status } = req.query;

    // Pastikan status diberikan
    if (!status) {
        return res.status(400).json({ message: 'Parameter status diperlukan' });
    }

    // Buat query SQL dengan parameter status
    const querySql = 'SELECT * FROM spms_transaction WHERE status = ?';

    // Jalankan query dengan parameter status
    koneksi.query(querySql, [status], (err, rows, field) => {
        // Error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // Jika request berhasil
        res.status(200).json({ success: true, data: rows });
    });
});


app.post('/api/spms_trans', (req, res) => {
    // buat variabel penampung data dan query sql
    const cacheKey = 'lowStock';
    const cachedData = myCache.get(cacheKey);

    const data = { ...req.body };
    const querySql = 'INSERT INTO spms_transaction SET ?';

    if (cachedData) {
        return res.status(200).json({ success: true, data: cachedData });
    } else {
    // jalankan query
        koneksi.query(querySql, data, (err, rows, field) => {
            // error handling
            if (err) {
                return res.status(500).json({ message: 'Gagal insert data!', error: err });
            }

            myCache.set(cacheKey, rows); // Cache the result
            // jika request berhasil
            res.status(201).json({ success: true, message: 'Berhasil insert data!' });
        });
    }
});

app.post('/api/spms_trans', (req, res) => {
    // buat variabel penampung data dan query sql
    const data = { ...req.body };
    const querySql = 'INSERT INTO spms_transaction SET ?';

    // jalankan query
    koneksi.query(querySql, data, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Gagal insert data!', error: err });
        }

        // jika request berhasil
        res.status(201).json({ success: true, message: 'Berhasil insert data!' });
    });
});

//---------------------------------API SPAREPART ALL---------------------------------//
// create data / insert data
app.post('/api/spms', (req, res) => {
    // buat variabel penampung data dan query sql
    const data = { ...req.body };
    const querySql = 'INSERT INTO sparepart SET ?';

    // jalankan query
    koneksi.query(querySql, data, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Gagal insert data!', error: err });
        }

        // jika request berhasil
        res.status(201).json({ success: true, message: 'Berhasil insert data!' });
    });
});

// read data low-stock data
app.get('/api/low-stock', (req, res) => {
    // buat query sql
    const querySql = 'SELECT * FROM sparepart where Qty < SafetyStock';

    // jalankan query
    koneksi.query(querySql, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika request berhasil
        res.status(200).json({ success: true, data: rows });
    });
});

// read specific data itemnumber
app.get('/api/spms-req/:ItemNumber', (req, res) => {
    const itemNumber = req.params.ItemNumber;
    const querySearch = 'SELECT * FROM sparepart WHERE ProductName = ?';
    
    // jalankan query untuk melakukan pencarian data
    koneksi.query(querySearch, [itemNumber], (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        if (rows.length > 0) {
            res.status(200).json({ success: true, data: rows, message: 'Berhasil searching data!' });
        } else {
            res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
    });
});


// read data / get data
app.get('/api/spms', (req, res) => {
    const cacheKey = 'sparepartData';
    const cachedData = myCache.get(cacheKey);

    if (cachedData) {
        return res.status(200).json({ success: true, data: cachedData });
    } else {
        const querySql = 'SELECT * FROM sparepart';
        
        koneksi.query(querySql, (err, rows, field) => {
            if (err) {
                return res.status(500).json({ message: 'Ada kesalahan', error: err });
            }
            
            myCache.set(cacheKey, rows); // Cache the result
            res.status(200).json({ success: true, data: rows });
        });
    }
});

// update data
app.put('/api/spms/:ItemNumber', (req, res) => {

    console.log(req.params.ItemNumber);
    // buat variabel penampung data dan query sql
    const data = { ...req.body };
    const querySearch = 'SELECT * FROM sparepart WHERE ItemNumber = ?';
    const queryUpdate = 'UPDATE sparepart SET ? WHERE ItemNumber = ?';
    
    // jalankan query untuk melakukan pencarian data
    koneksi.query(querySearch, req.params.ItemNumber, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika id yang dimasukkan sesuai dengan data yang ada di db
        if (rows.length) {
            // jalankan query update
            koneksi.query(queryUpdate, [data, req.params.ItemNumber], (err, rows, field) => {
                // error handling
                if (err) {
                    return res.status(500).json({ message: 'Ada kesalahan', error: err });
                }

                // jika update berhasil
                res.status(200).json({ success: true, message: 'Berhasil update data!' });
            });
        } else {
            return res.status(404).json({ message: 'Data tidak ditemukan!', success: false });
        }
    });
});

// delete data
app.delete('/api/spms/:ItemNumber', (req, res) => {
    // buat query sql untuk mencari data dan hapus
    const querySearch = 'SELECT * FROM sparepart WHERE ItemNumber = ?';
    const queryDelete = 'DELETE FROM sparepart WHERE ItemNumber = ?';
    console.log(queryDelete);
    // jalankan query untuk melakukan pencarian data
    koneksi.query(querySearch, req.params.ItemNumber, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika id yang dimasukkan sesuai dengan data yang ada di db
        if (rows.length) {
            // jalankan query delete
            koneksi.query(queryDelete, req.params.ItemNumber, (err, rows, field) => {
                // error handling
                if (err) {
                    return res.status(500).json({ message: 'Ada kesalahan', error: err });
                }

                // jika delete berhasil
                res.status(200).json({ success: true, message: 'Berhasil hapus data!' });
            });
        } else {
            return res.status(404).json({ message: 'Data tidak ditemukan!', success: false });
        }
    });
});
//---------------------------------API SPAREPART ALL---------------------------------//

// buat server nya
app.listen(PORT, () => console.log(`Server running at port: ${PORT}`));
