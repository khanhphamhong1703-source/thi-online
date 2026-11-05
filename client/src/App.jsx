import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import PublicLayout from './layouts/PublicLayout';

import LoginPage from './pages/auth/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminDataPage from './pages/admin/AdminDataPage';
import TeacherListPage from './pages/admin/TeacherListPage';
import TeacherCreatePage from './pages/admin/TeacherCreatePage';
import TeacherEditPage from './pages/admin/TeacherEditPage';
import TeacherDetailPage from './pages/admin/TeacherDetailPage';
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage';
import ClassListPage from './pages/teacher/ClassListPage';
import ClassCreatePage from './pages/teacher/ClassCreatePage';
import ClassEditPage from './pages/teacher/ClassEditPage';
import ClassDetailPage from './pages/teacher/ClassDetailPage';
import StudentListPage from './pages/teacher/StudentListPage';
import StudentCreatePage from './pages/teacher/StudentCreatePage';
import StudentEditPage from './pages/teacher/StudentEditPage';
import StudentDetailPage from './pages/teacher/StudentDetailPage';
import ImportExcelPage from './pages/teacher/ImportExcelPage';
import ProfilePage from './pages/teacher/ProfilePage';
import ChangePasswordPage from './pages/teacher/ChangePasswordPage';
import ExamListPage from './pages/teacher/ExamListPage';
import ExamFormPage from './pages/teacher/ExamFormPage';
import ExamDetailPage from './pages/teacher/ExamDetailPage';
import ExamResultsPage from './pages/teacher/ExamResultsPage';
import ExamBoardPage from './pages/public/ExamBoardPage';
import ExamIntroPage from './pages/public/ExamIntroPage';
import ExamRoomPage from './pages/public/ExamRoomPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<ExamBoardPage />} />
        <Route path="/exam/:id" element={<ExamIntroPage />} />
      </Route>
      <Route path="/thi/:attemptId" element={<ExamRoomPage />} />

      <Route path="/admin/login" element={<LoginPage role="ADMIN" />} />
      <Route path="/teacher/login" element={<LoginPage role="TEACHER" />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AppLayout role="ADMIN" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="data" element={<AdminDataPage />} />
        <Route path="teachers" element={<TeacherListPage />} />
        <Route path="teachers/new" element={<TeacherCreatePage />} />
        <Route path="teachers/:id" element={<TeacherDetailPage />} />
        <Route path="teachers/:id/edit" element={<TeacherEditPage />} />
      </Route>

      <Route
        path="/teacher"
        element={
          <ProtectedRoute role="TEACHER">
            <AppLayout role="TEACHER" />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboardPage />} />
        <Route path="classes" element={<ClassListPage />} />
        <Route path="classes/new" element={<ClassCreatePage />} />
        <Route path="classes/:id" element={<ClassDetailPage />} />
        <Route path="classes/:id/edit" element={<ClassEditPage />} />
        <Route path="classes/:id/students" element={<StudentListPage />} />
        <Route path="classes/:id/students/new" element={<StudentCreatePage />} />
        <Route path="classes/:id/import" element={<ImportExcelPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="students/:id/edit" element={<StudentEditPage />} />
        <Route path="exams" element={<ExamListPage />} />
        <Route path="exams/new" element={<ExamFormPage mode="create" />} />
        <Route path="exams/:id" element={<ExamDetailPage />} />
        <Route path="exams/:id/edit" element={<ExamFormPage mode="edit" />} />
        <Route path="exams/:id/results" element={<ExamResultsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
