// 1. 환경 변수 로드 (가장 먼저 실행되어야 함)
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

const app = express();
// .env 파일에 정의된 PORT를 사용하거나, 없으면 3000번 사용
const port = process.env.PORT || 3000;

// 2. View Engine 설정 (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 3. 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: false })); // 폼 데이터 파싱
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일(css 등) 제공

// 4. 세션 설정 (환경 변수 사용)
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret_key', // .env의 시크릿 키 사용
    resave: false,
    saveUninitialized: true
}));

// 5. 라우터 불러오기
const indexRouter = require('./routes/index'); // 로그인, 회원가입, 로그아웃
const adminRouter = require('./routes/admin'); // 관리자 페이지 (사용자 관리)
const postsRouter = require('./routes/posts'); // 게시판 (공지사항/자유게시판)

// 6. 라우터 연결
app.use('/', indexRouter);       // 기본 경로 (로그인 등)
app.use('/admin', adminRouter);  // 관리자 경로
app.use('/posts', postsRouter);  // 게시판 경로 (핵심 기능)

// ⚠️ 기존의 todos, test 라우터는 제거되었습니다.

// 7. 서버 시작
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});