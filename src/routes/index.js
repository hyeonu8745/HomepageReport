const express = require('express');
const router = express.Router();
const db = require('../config/db'); // mysql2/promise pool

// Login page
router.get('/', (req, res) => {
    res.render('login');
});

// Signup page
router.get('/signup', (req, res) => {
    res.render('signup');
});

// ----------------------------------------------------
// Handle login (async/await 적용)
// ----------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';

    try {
        // 💡 중요: 콜백을 제거하고 await을 사용합니다.
        // mysql2/promise는 결과로 [rows, fields] 배열을 반환하므로 [results]로 구조 분해 할당합니다.
        const [results] = await db.query(query, [email, password]);

        if (results.length > 0) {
            const user = results[0];
            req.session.user = user; // 세션에 사용자 정보 저장

            // 세션 저장 후 리다이렉트 (안정성 확보)
            req.session.save(() => {
                if (user.email === 'admin@example.com') {
                    res.redirect('/admin');
                } else {
                    res.redirect('/posts'); // 💡 /todos -> /posts 로 변경됨
                }
            });
        } else {
            res.render('login', { error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error('Login Error:', err);
        res.render('login', { error: 'Database error occurred.' });
    }
});

// ----------------------------------------------------
// Handle signup (async/await 적용)
// ----------------------------------------------------
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const query = 'INSERT INTO users (user_name, email, password) VALUES (?, ?, ?)';

    try {
        await db.query(query, [username, email, password]);
        res.redirect('/');
    } catch (err) {
        console.error('Signup Error:', err);
        // 이메일 중복 에러 처리
        if (err.code === 'ER_DUP_ENTRY') {
            return res.render('signup', { error: 'This email is already registered.' });
        }
        res.status(500).send("Signup failed due to server error.");
    }
});

// ----------------------------------------------------
// Handle logout
// ----------------------------------------------------
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout Error:', err);
            return res.redirect('/posts'); // 에러 시 게시판으로
        }
        res.clearCookie('connect.sid'); 
        res.redirect('/'); // 로그아웃 후 로그인 페이지로 이동
    });
});

module.exports = router;