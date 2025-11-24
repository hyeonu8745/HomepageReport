const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 로그인 체크 미들웨어
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/'); 
};

// ----------------------------------------------------
// 1. 게시물 목록 조회 (탭 기능 추가)
// ----------------------------------------------------
router.get('/', isAuthenticated, async (req, res) => {
    const page = parseInt(req.query.page) || 1; 
    const limit = 10; 
    const search = req.query.search || ''; 
    // 💡 탭 구분을 위한 type 변수 (기본값: free)
    const type = req.query.type === 'notice' ? 'notice' : 'free';

    const offset = (page - 1) * limit; 
    
    // 💡 type 조건 추가 (p.type = ?)
    let query = `
        SELECT p.id, p.title, p.views, p.created_at, p.type, u.user_name AS author 
        FROM posts p
        JOIN users u ON p.user_id = u.user_id 
        WHERE p.type = ? 
    `;
    let countQuery = 'SELECT COUNT(*) AS total_count FROM posts WHERE type = ?';
    const params = [type]; 
    const countParams = [type];

    // 검색 기능
    if (search) {
        query += ' AND p.title LIKE ?';
        countQuery += ' AND title LIKE ?'; // countQuery는 JOIN이 없으므로 p.title 대신 title 사용 가능 (단, 위 countQuery에 JOIN 추가시 p.title 권장)
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?'; 
    params.push(limit, offset);

    try {
        const [countRows] = await db.query(countQuery, countParams);
        const totalCount = countRows[0].total_count;
        const totalPages = Math.ceil(totalCount / limit);
        
        const [posts] = await db.query(query, params);

        res.render('posts/list', { 
            title: type === 'notice' ? '공지사항' : '자유게시판',
            user: req.session.user,
            posts: posts,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            currentType: type // 뷰에 현재 탭 정보 전달
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------
// 2. 게시물 상세 조회
// ----------------------------------------------------
router.get('/:id', isAuthenticated, async (req, res) => {
    const postId = req.params.id;
    try {
        await db.query('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]);

        const [rows] = await db.query(`
            SELECT p.*, u.user_name AS author
            FROM posts p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.id = ?
        `, [postId]);

        if (rows.length === 0) {
            return res.status(404).send('Post not found');
        }
        
        res.render('posts/detail', { 
            title: rows[0].title,
            user: req.session.user,
            post: rows[0]
        });
    } catch (error) {
        console.error('Error fetching post detail:', error);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------
// 3. 글쓰기 뷰 (타입 정보 전달)
// ----------------------------------------------------
router.get('/new/create', isAuthenticated, (req, res) => {
    // 현재 보고 있던 탭 정보를 가져옴
    const type = req.query.type === 'notice' ? 'notice' : 'free';

    res.render('posts/new', { 
        title: type === 'notice' ? '공지사항 작성' : '새 게시물 작성',
        user: req.session.user,
        targetType: type // 작성할 글의 타입 전달
    });
});

// ----------------------------------------------------
// 4. 글쓰기 처리 (타입 저장)
// ----------------------------------------------------
router.post('/', isAuthenticated, async (req, res) => {
    const user_id = req.session.user.user_id; 
    const { title, content, type } = req.body; // hidden input으로 받은 type
    
    // type 값 검증
    const finalType = (type === 'notice') ? 'notice' : 'free';

    if (!title || !content) {
        return res.status(400).send('Title and content are required.');
    }

    try {
        // type 컬럼 포함해서 INSERT
        await db.query(
            'INSERT INTO posts (title, content, user_id, type) VALUES (?, ?, ?, ?)',
            [title, content, user_id, finalType]
        );
        // 작성했던 탭 목록으로 이동
        res.redirect(`/posts?type=${finalType}`); 
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------
// 5. 게시물 수정 뷰
// ----------------------------------------------------
router.get('/edit/:id', isAuthenticated, async (req, res) => {
    const postId = req.params.id;
    const currentUserId = req.session.user.user_id;

    try {
        const [rows] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
        
        if (rows.length === 0) return res.status(404).send('Post not found');
        
        if (rows[0].user_id !== currentUserId) {
             return res.status(403).send('권한이 없습니다.');
        }

        res.render('posts/edit', { 
            title: '게시물 수정',
            user: req.session.user,
            post: rows[0]
        });
    } catch (error) {
        console.error('Error fetching post for edit:', error);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------
// 6. 게시물 수정 처리
// ----------------------------------------------------
router.post('/update/:id', isAuthenticated, async (req, res) => {
    const postId = req.params.id;
    const currentUserId = req.session.user.user_id;
    const { title, content } = req.body; 

    if (!title || !content) return res.status(400).send('Title and content are required.');
    
    try {
        const [result] = await db.query(
            'UPDATE posts SET title = ?, content = ? WHERE id = ? AND user_id = ?',
            [title, content, postId, currentUserId]
        );

        if (result.affectedRows === 0) {
            return res.status(403).send('수정 권한이 없거나 게시물이 없습니다.');
        }

        res.redirect(`/posts/${postId}`); 
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------
// 7. 게시물 삭제 처리
// ----------------------------------------------------
router.post('/delete/:id', isAuthenticated, async (req, res) => {
    const postId = req.params.id;
    const currentUserId = req.session.user.user_id;

    try {
        const [result] = await db.query('DELETE FROM posts WHERE id = ? AND user_id = ?', [postId, currentUserId]);

        if (result.affectedRows === 0) {
            return res.status(403).send('삭제 권한이 없거나 게시물이 없습니다.');
        }

        res.redirect('/posts'); 
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;