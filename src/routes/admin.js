const express = require('express');
const router = express.Router();
const db = require('../config/db'); // mysql2/promise pool

// Middleware to check for admin user
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.email === 'admin@example.com') {
        return next();
    }
    res.redirect('/');
};

// ----------------------------------------------------
// Admin page - list all users (async/await 적용)
// ----------------------------------------------------
router.get('/', isAdmin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
        // 1. 전체 유저 수 조회
        const countQuery = 'SELECT COUNT(*) AS count FROM users';
        const [countResult] = await db.query(countQuery);
        const totalUsers = countResult[0].count;
        const totalPages = Math.ceil(totalUsers / limit);

        // 2. 페이지네이션된 유저 목록 조회
        const query = 'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const [users] = await db.query(query, [limit, offset]);

        res.render('admin', {
            title: 'Admin - User Management',
            user: req.session.user,
            users: users,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (err) {
        console.error('Admin Page Error:', err);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------
// Add a new user (async/await 적용)
// ----------------------------------------------------
router.post('/add', isAdmin, async (req, res) => {
    const { user_name, email, password } = req.body;
    const query = 'INSERT INTO users (user_name, email, password) VALUES (?, ?, ?)';
    
    try {
        await db.query(query, [user_name, email, password]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Add User Error:', err);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------
// Update user (async/await 적용)
// ----------------------------------------------------
router.post('/update/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { user_name, email } = req.body;
    const query = 'UPDATE users SET user_name = ?, email = ? WHERE user_id = ?';
    
    try {
        await db.query(query, [user_name, email, id]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Update User Error:', err);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------
// Delete user (async/await 적용)
// ----------------------------------------------------
router.get('/delete/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM users WHERE user_id = ?';
    
    try {
        await db.query(query, [id]);
        res.redirect('/admin');
    } catch (err) {
        console.error('Delete User Error:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;