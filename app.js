const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sql = require('./config/database'); // Assuming your MSSQL config is in the same file
const NodeCache = require('node-cache');

const myCache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // Cache TTL of 10 minutes
const app = express();

const PORT = process.env.PORT || 5000;
app.use(cors());
// set body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// read data / get data
app.get('/api/userlog', (req, res) => {
    const { rfid } = req.query;

    if (!rfid) {
        return res.status(400).json({ message: 'Parameter rfid diperlukan' });
    }

    const querySql = 'SELECT * FROM users WHERE rfid = @rfid';

    sql.connect().then(pool => {
        return pool.request()
            .input('rfid', sql.VarChar, rfid)
            .query(querySql);
    }).then(result => {
        res.status(200).json({ success: true, data: result.recordset });
    }).catch(err => {
        res.status(500).json({ message: 'Ada kesalahan', error: err });
    });
});

// API HISTORY
app.get('/api/spms_trans', (req, res) => {
    const { status } = req.query;

    if (!status) {
        return res.status(400).json({ message: 'Parameter status diperlukan' });
    }

    const querySql = 'SELECT * FROM sparepart_management_history_sparepart_transaction WHERE status = @status';

    sql.connect().then(pool => {
        return pool.request()
            .input('status', sql.VarChar, status)
            .query(querySql);
    }).then(result => {
        res.status(200).json({ success: true, data: result.recordset });
    }).catch(err => {
        res.status(500).json({ message: 'Ada kesalahan', error: err });
    });
});

app.post('/api/spms_trans', (req, res) => {
    const cacheKey = 'lowStock';
    const cachedData = myCache.get(cacheKey);

    const data = req.body;
    const querySql = 'INSERT INTO sparepart_management_history_sparepart_transaction (field1, field2, ...) VALUES (@field1, @field2, ...)';

    if (cachedData) {
        return res.status(200).json({ success: true, data: cachedData });
    } else {
        sql.connect().then(pool => {
            const request = pool.request();
            for (let key in data) {
                request.input(key, sql.VarChar, data[key]);
            }
            return request.query(querySql);
        }).then(result => {
            myCache.set(cacheKey, result);
            res.status(201).json({ success: true, message: 'Berhasil insert data!' });
        }).catch(err => {
            res.status(500).json({ message: 'Gagal insert data!', error: err });
        });
    }
});

// API SPAREPART ALL
app.post('/api/spms', (req, res) => {
    const data = req.body;
    const querySql = 'INSERT INTO SparepartPlant5 (field1, field2, ...) VALUES (@field1, @field2, ...)';

    sql.connect().then(pool => {
        const request = pool.request();
        for (let key in data) {
            request.input(key, sql.VarChar, data[key]);
        }
        return request.query(querySql);
    }).then(result => {
        res.status(201).json({ success: true, message: 'Berhasil insert data!' });
    }).catch(err => {
        res.status(500).json({ message: 'Gagal insert data!', error: err });
    });
});

app.get('/api/low-stock', (req, res) => {
    const querySql = 'SELECT * FROM SparepartPlant5 WHERE Qty < SafetyStock';

    sql.connect().then(pool => {
        return pool.request().query(querySql);
    }).then(result => {
        res.status(200).json({ success: true, data: result.recordset });
    }).catch(err => {
        res.status(500).json({ message: 'Ada kesalahan', error: err });
    });
});

app.get('/api/spms-req/:ItemNumber', (req, res) => {
    const itemNumber = req.params.ItemNumber;
    const querySearch = 'SELECT * FROM SparepartPlant5 WHERE ProductName = @itemNumber';

    sql.connect().then(pool => {
        return pool.request()
            .input('itemNumber', sql.VarChar, itemNumber)
            .query(querySearch);
    }).then(result => {
        if (result.recordset.length > 0) {
            res.status(200).json({ success: true, data: result.recordset, message: 'Berhasil searching data!' });
        } else {
            res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
    }).catch(err => {
        res.status(500).json({ message: 'Ada kesalahan', error: err });
    });
});

app.get('/api/spms', (req, res) => {
    const cacheKey = 'sparepartData';
    const cachedData = myCache.get(cacheKey);

    if (cachedData) {
        return res.status(200).json({ success: true, data: cachedData });
    } else {
        const querySql = 'SELECT * FROM SparepartPlant5';

        sql.connect().then(pool => {
            return pool.request().query(querySql);
        }).then(result => {
            myCache.set(cacheKey, result.recordset);
            res.status(200).json({ success: true, data: result.recordset });
        }).catch(err => {
            res.status(500).json({ message: 'Ada kesalahan', error: err });
        });
    }
});

app.put('/api/spms/:ItemNumber', (req, res) => {
    const data = req.body;
    const itemNumber = req.params.ItemNumber;
    const querySearch = 'SELECT * FROM SparepartPlant5 WHERE ItemNumber = @itemNumber';
    const queryUpdate = 'UPDATE SparepartPlant5 SET field1 = @field1, field2 = @field2, ... WHERE ItemNumber = @itemNumber';

    sql.connect().then(pool => {
        return pool.request()
            .input('itemNumber', sql.VarChar, itemNumber)
            .query(querySearch);
    }).then(result => {
        if (result.recordset.length) {
            const request = pool.request();
            for (let key in data) {
                request.input(key, sql.VarChar, data[key]);
            }
            return request.query(queryUpdate);
        } else {
            res.status(404).json({ message: 'Data tidak ditemukan!', success: false });
        }
    }).then(result => {
        res.status(200).json({ success: true, message: 'Berhasil update data!' });
    }).catch(err => {
        res.status(500).json({ message: 'Ada kesalahan', error: err });
    });
});

app.delete('/api/spms/:ItemNumber', (req, res) => {
    const itemNumber = req.params.ItemNumber;
    const querySearch = 'SELECT * FROM SparepartPlant5 WHERE ItemNumber = @itemNumber';
    const queryDelete = 'DELETE FROM SparepartPlant5 WHERE ItemNumber = @itemNumber';

    sql.connect().then(pool => {
        return pool.request()
            .input('itemNumber', sql.VarChar, itemNumber)
            .query(querySearch);
    }).then(result => {
        if (result.recordset.length) {
            return pool.request()
                .input('itemNumber', sql.VarChar, itemNumber)
                .query(queryDelete);
        } else {
            res.status(404).json({ message: 'Data tidak ditemukan!', success: false });
        }
    }).then(result => {
        res.status(200).json({ success: true, message: 'Berhasil hapus data!' });
    }).catch(err => {
        res.status(500).json({ message: 'Ada kesalahan', error: err });
    });
});

// buat server nya
app.listen(PORT, () => console.log(`Server running at port: ${PORT}`));
