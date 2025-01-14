const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',        // tên user postgres mặc định
    host: 'localhost',       // host local
    database: 'postgres',    // tên database mặc định
    password: '',            // password để trống vì bạn không set
    port: 5432,             // port mặc định của PostgreSQL
    ssl: false
});

// Kiểm tra kết nối
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully at:', res.rows[0].now);
    }
});

module.exports = pool;