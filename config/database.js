const sql = require('mssql');

// buat konfigurasi koneksi
const koneksi = {
    user: 'roni@ipg',
    password: 'AutoCasting',
    server: '192.168.2.1', // server IP address
    port: 1433, // change port to 5000
    database: 'Plant5',
    options: {
        encrypt: false, // Disable encryption if SSL is not required
        trustServerCertificate: true // Ignore server certificate validation (use with caution)
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// koneksi database
sql.connect(koneksi).then(pool => {
    if (pool.connected) {
        console.log('MSSQL Connected...');
        return pool;
    }
}).catch(err => {
    console.error('Database connection failed:', err);
});

module.exports = sql;
