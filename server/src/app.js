const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const { isAllowedOrigin } = require('./config/origins');
const ApiError = require('./utils/ApiError');
const originGuard = require('./middlewares/originGuard');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { authenticate, requireRole } = require('./middlewares/auth');

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const adminDataRoutes = require('./modules/admin-data/admin-data.routes');
const classRoutes = require('./modules/classes/class.routes');
const teacherRoutes = require('./modules/classes/teacher.routes');
const classStudentRoutes = require('./modules/students/class-student.routes');
const studentRoutes = require('./modules/students/student.routes');
const examRoutes = require('./modules/exams/exam.routes');
const publicExamRoutes = require('./modules/exams/public-exam.routes');

const app = express();

app.disable('x-powered-by');
if (env.TRUST_PROXY !== undefined) {
  app.set('trust proxy', env.TRUST_PROXY);
}
app.use(helmet());
app.use((req, res, next) =>
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin, req)) {
        return callback(null, true);
      }
      return callback(new ApiError(403, 'Nguồn gửi yêu cầu không hợp lệ'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })(req, res, next)
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(originGuard);

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'API đang hoạt động', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/data', authenticate, requireRole('ADMIN'), adminDataRoutes);
app.use('/api/admin', authenticate, requireRole('ADMIN'), userRoutes);
app.use('/api/teacher', authenticate, requireRole('TEACHER'), teacherRoutes);
app.use('/api/classes', authenticate, requireRole('TEACHER'), classStudentRoutes);
app.use('/api/classes', authenticate, requireRole('TEACHER'), classRoutes);
app.use('/api/students', authenticate, requireRole('TEACHER'), studentRoutes);
app.use('/api/exams', authenticate, requireRole('TEACHER'), examRoutes);
app.use('/api/public', publicExamRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
