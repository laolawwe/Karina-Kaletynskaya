const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'karina-secret-key-123';

// Базовые middleware
app.use(express.json());
app.use(express.static(__dirname));

// Настройка папки и загрузки файлов через multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Обработчик входа в админку (логин: karina, пароль: nailmaster2026)
const handleLogin = (req, res) => {
    const { username, email, password } = req.body;
    const adminUser = 'karina';
    const adminPass = 'nailmaster2026';

    if ((username === adminUser || email === 'karina@gmail.com' || username === 'karina@gmail.com') && password === adminPass) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token: token });
    } else {
        return res.status(401).json({ success: false, message: 'Nieprawidłowy login lub hasło!' });
    }
};

app.post('/login', handleLogin);
app.post('/api/login', handleLogin);

// Проверка авторизации (Middleware)
function checkAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Нет доступа' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Сессия истекла' });
        req.user = decoded;
        next();
    });
}

// Работа с портфолио (data.json)
const DATA_FILE = path.join(__dirname, 'data.json');
function readWorks() {
    try { 
        if (!fs.existsSync(DATA_FILE)) return [];
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); 
    } 
    catch (e) { return []; }
}

app.get('/api/works', (req, res) => res.json(readWorks()));

app.post('/api/works', checkAuth, (req, res) => {
    const works = readWorks();
    const newWork = { id: Date.now().toString(), ...req.body };
    works.push(newWork);
    fs.writeFileSync(DATA_FILE, JSON.stringify(works, null, 2));
    res.json(newWork);
});

app.delete('/api/works/:id', checkAuth, (req, res) => {
    let works = readWorks();
    works = works.filter(w => w.id !== req.params.id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(works, null, 2));
    res.json({ success: true });
});

// Загрузка и удаление файлов через админку
app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nie wybrano pliku' });
    }
    res.json({ success: true, filename: req.file.filename });
});

app.delete('/api/photo/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Plik nie znaleziony' });
    }
});

// Отзывы (reviews.json)
const REVIEWS_FILE = path.join(__dirname, 'reviews.json');
function readReviews() {
    try { 
        if (!fs.existsSync(REVIEWS_FILE)) return [];
        return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8') || '[]'); 
    } 
    catch (e) { return []; }
}

app.get('/api/reviews', (req, res) => res.json(readReviews()));

app.post('/api/reviews', (req, res) => {
    const reviews = readReviews();
    const newReview = { 
        id: Date.now().toString(), 
        date: new Date().toLocaleDateString('pl-PL'),
        ...req.body 
    };
    reviews.unshift(newReview);
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
    res.json(newReview);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});