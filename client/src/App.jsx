import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingState from './components/LoadingState';
import AppLayout from './layouts/AppLayout';
import PublicLayout from './layouts/PublicLayout';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminDataPage = lazy(() => import('./pages/admin/AdminDataPage'));
const AdminActivityPage = lazy(() => import('./pages/admin/AdminActivityPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const TeacherListPage = lazy(() => import('./pages/admin/TeacherListPage'));
const TeacherCreatePage = lazy(() => import('./pages/admin/TeacherCreatePage'));
const TeacherEditPage = lazy(() => import('./pages/admin/TeacherEditPage'));
const TeacherDetailPage = lazy(() => import('./pages/admin/TeacherDetailPage'));
const TeacherDashboardPage = lazy(() => import('./pages/teacher/TeacherDashboardPage'));
const ClassListPage = lazy(() => import('./pages/teacher/ClassListPage'));
const ClassCreatePage = lazy(() => import('./pages/teacher/ClassCreatePage'));
const ClassEditPage = lazy(() => import('./pages/teacher/ClassEditPage'));
const ClassDetailPage = lazy(() => import('./pages/teacher/ClassDetailPage'));
const StudentListPage = lazy(() => import('./pages/teacher/StudentListPage'));
const StudentCreatePage = lazy(() => import('./pages/teacher/StudentCreatePage'));
const StudentEditPage = lazy(() => import('./pages/teacher/StudentEditPage'));
const StudentDetailPage = lazy(() => import('./pages/teacher/StudentDetailPage'));
const ImportExcelPage = lazy(() => import('./pages/teacher/ImportExcelPage'));
const ProfilePage = lazy(() => import('./pages/teacher/ProfilePage'));
const ChangePasswordPage = lazy(() => import('./pages/teacher/ChangePasswordPage'));
const ExamListPage = lazy(() => import('./pages/teacher/ExamListPage'));
const ExamFormPage = lazy(() => import('./pages/teacher/ExamFormPage'));
const ExamDetailPage = lazy(() => import('./pages/teacher/ExamDetailPage'));
const ExamResultsPage = lazy(() => import('./pages/teacher/ExamResultsPage'));
const ExamPresentPage = lazy(() => import('./pages/teacher/ExamPresentPage'));
const ActivityPage = lazy(() => import('./pages/teacher/ActivityPage'));
const ExamBoardPage = lazy(() => import('./pages/public/ExamBoardPage'));
const ExamIntroPage = lazy(() => import('./pages/public/ExamIntroPage'));
const ExamRoomPage = lazy(() => import('./pages/public/ExamRoomPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <Suspense fallback={<LoadingState fullPage label="Đang tải trang..." />}>
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
        <Route path="data" element={<Navigate to="/admin/data/classes" replace />} />
        <Route path="data/teachers" element={<Navigate to="/admin/teachers" replace />} />
        <Route path="data/activity" element={<Navigate to="/admin/activity" replace />} />
        <Route path="data/:section" element={<AdminDataPage />} />
        <Route path="activity" element={<AdminActivityPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
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
        <Route path="activity" element={<ActivityPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />
        </Route>

        <Route
          path="/teacher/present/:id"
          element={
            <ProtectedRoute role="TEACHER">
              <ExamPresentPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
