export const ACTIVITY_CATEGORIES = [
  { value: 'AUTH', label: 'Đăng nhập' },
  { value: 'CLASS', label: 'Lớp học' },
  { value: 'STUDENT', label: 'Học sinh' },
  { value: 'EXAM', label: 'Đề thi' },
  { value: 'ACCOUNT', label: 'Tài khoản' },
];

export const TEACHER_ACTIVITY_CATEGORIES = ACTIVITY_CATEGORIES.filter(
  (item) => item.value !== 'AUTH'
);

export const ACTIVITY_ACTIONS = {
  AUTH_LOGIN_SUCCESS: 'Đăng nhập',
  AUTH_LOGIN_FAILED: 'Đăng nhập',
  CLASS_CREATE: 'Tạo lớp học',
  CLASS_UPDATE: 'Cập nhật lớp học',
  CLASS_ARCHIVE: 'Lưu trữ lớp học',
  STUDENT_ADD: 'Thêm học sinh',
  STUDENT_UPDATE: 'Cập nhật học sinh',
  STUDENT_REMOVE: 'Gỡ học sinh khỏi lớp',
  STUDENT_IMPORT: 'Import học sinh',
  STUDENT_EXPORT: 'Xuất danh sách học sinh',
  EXAM_CREATE: 'Tạo đề thi',
  EXAM_UPDATE: 'Cập nhật đề thi',
  EXAM_REGRADE: 'Chấm lại bài làm',
  EXAM_DELETE: 'Xoá đề thi',
  EXAM_EXPORT_RESULTS: 'Xuất bảng điểm',
  PASSWORD_CHANGE: 'Đổi mật khẩu',
  SESSION_DELETE: 'Xoá phiên đăng nhập',
  SESSION_REVOKE_ALL: 'Thu hồi toàn bộ phiên',
};

export const ACTIVITY_STATUS = {
  SUCCESS: { label: 'Thành công', variant: 'active' },
  FAILED: { label: 'Thất bại', variant: 'locked' },
};

export function getActionLabel(action) {
  return ACTIVITY_ACTIONS[action] || action;
}

export function describeActivityData(log) {
  const data = log?.data || {};

  switch (log?.action) {
    case 'CLASS_CREATE':
    case 'CLASS_UPDATE':
    case 'CLASS_ARCHIVE':
      return [
        data.name,
        data.classCode ? `(${data.classCode})` : '',
        Number.isFinite(data.studentCount) ? `${data.studentCount} học sinh` : '',
      ]
        .filter(Boolean)
        .join(' · ');
    case 'STUDENT_ADD':
    case 'STUDENT_UPDATE':
    case 'STUDENT_REMOVE':
      return [data.fullName, data.studentCode ? `(${data.studentCode})` : '', data.className]
        .filter(Boolean)
        .join(' · ');
    case 'STUDENT_IMPORT':
      return [
        data.className,
        `thêm ${data.added ?? 0}`,
        `cập nhật ${data.updated ?? 0}`,
        `bỏ qua ${data.skipped ?? 0}`,
      ]
        .filter(Boolean)
        .join(' · ');
    case 'STUDENT_EXPORT':
      return [data.className, data.classCode ? `(${data.classCode})` : ''].filter(Boolean).join(' · ');
    case 'EXAM_CREATE':
    case 'EXAM_UPDATE':
      return [
        data.title,
        Number.isFinite(data.questionCount) ? `${data.questionCount} câu` : '',
        data.classNames?.length ? data.classNames.join(', ') : '',
      ]
        .filter(Boolean)
        .join(' · ');
    case 'EXAM_REGRADE':
      return [data.title, `chấm lại ${data.attemptCount ?? 0} bài`].filter(Boolean).join(' · ');
    case 'EXAM_DELETE':
      return [
        data.title,
        Number.isFinite(data.questionCount) ? `${data.questionCount} câu` : '',
        Number.isFinite(data.attemptCount) ? `${data.attemptCount} lượt thi` : '',
      ]
        .filter(Boolean)
        .join(' · ');
    case 'EXAM_EXPORT_RESULTS':
      return [data.title, `${data.attemptCount ?? 0} bài`].filter(Boolean).join(' · ');
    case 'PASSWORD_CHANGE':
      return 'Mật khẩu đã được thay đổi';
    case 'SESSION_DELETE':
      return [data.device, data.browser, data.ip].filter(Boolean).join(' · ');
    case 'SESSION_REVOKE_ALL':
      return `${data.activeSessions ?? 0} phiên đang hoạt động`;
    default:
      return '';
  }
}

export const ACTIVITY_DATA_LABELS = {
  name: 'Tên lớp',
  classCode: 'Mã lớp',
  schoolYear: 'Năm học',
  studentCount: 'Số học sinh',
  fullName: 'Họ và tên',
  studentCode: 'Mã học sinh',
  className: 'Lớp',
  added: 'Thêm mới',
  updated: 'Cập nhật',
  skipped: 'Bỏ qua',
  invalid: 'Không hợp lệ',
  title: 'Tên đề',
  subject: 'Môn học',
  durationMinutes: 'Thời lượng (phút)',
  status: 'Trạng thái',
  classNames: 'Lớp được giao',
  questionCount: 'Số câu hỏi',
  attemptCount: 'Số bài làm',
  device: 'Thiết bị',
  browser: 'Trình duyệt',
  ip: 'IP',
  activeSessions: 'Số phiên đang hoạt động',
};

export function formatActivityValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}
