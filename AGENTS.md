# ViExam – Ghi chú cho agent

Sản phẩm là hệ thống thi trực tuyến: `/` là cổng tra cứu ca thi cho học sinh; giáo viên quản lý lớp, học sinh, đề thi và kết quả; admin quản lý tài khoản giáo viên và dữ liệu toàn hệ thống.

## Stack
- Client: React 18 + Vite + TailwindCSS, React Router v7, Axios, RHF + Zod.
- Server: Express (CommonJS) + Prisma 6 + MongoDB, JWT cookie HttpOnly, ExcelJS, Mammoth.

## Commands
- `npm run install:all` — cài client + server.
- `npm run db:push` — đồng bộ Prisma schema.
- `npm run seed` — tạo/cập nhật Admin từ `server/.env`.
- `npm run dev` — chạy cả hai qua concurrently.
- `npm run build` — build frontend.

## Conventions
- API prefix `/api`; response danh sách `{ success, data, pagination }`, mutation `{ success, message, data }`.
- Backend theo module `routes -> controller -> service -> prisma`.
- Admin quản lý dữ liệu qua module `admin-data`; khôi phục lớp đã lưu trữ, mở khóa giáo viên và xoá vĩnh viễn có kiểm tra ràng buộc (giáo viên còn lớp/đề, lớp còn đề thi). Dữ liệu con được xoá trong transaction.
- Mọi thao tác lớp/học sinh của teacher phải kiểm tra ownership qua `assertClassOwner` hoặc `assertStudentAccessible`.
- Lớp học xóa mềm bằng `isArchived`; học sinh chỉ gỡ `Enrollment`, không xóa hồ sơ.
- Mã học sinh thêm thủ công do backend tự sinh dạng `HSxxxx`; mã import giữ nguyên và chuẩn hóa uppercase. Mã học sinh không cho phép chỉnh sửa. Username lowercase.
- Đề thi thuộc một giáo viên nhưng có thể chưa gán lớp hoặc giao cho nhiều lớp (`Exam.classIds`, giữ `classId` làm lớp chính để tương thích); mọi API giáo viên phải kiểm tra ownership. Đề chưa gán lớp vẫn lưu được nhưng không được công bố cho đến khi có ít nhất một lớp.
- Câu hỏi thuộc phần `I`, `II` hoặc `III`; tên phần lưu trong `Exam.sectionTitles`. Backend sắp theo phần, khi trộn câu chỉ đảo trong từng phần. Editor có bảng số câu cố định để nhảy tới câu và cho phép thu gọn từng phần.
- Phần I là trắc nghiệm một đáp án; Phần II lưu `Question.statements` gồm 4 ý Đúng/Sai; Phần III lưu `Question.correctText` tối đa 4 ký tự theo quy tắc 4 ô. Điểm Phần II lấy từ `Exam.trueFalseScores` (mặc định `[0.1, 0.25, 0.5, 1]`), không dùng điểm phần để chia đều.
- Điểm phần là công cụ chia đều vào điểm từng câu; không lưu điểm phần riêng. Học sinh chỉ thấy phần có câu hỏi, hiển thị `Phần X - Tên phần` nếu có tên.
- Trạng thái đề: `DRAFT`, `PUBLISHED`, `CLOSED`; chỉ đề nháp được xóa. Đề đã công bố/đóng vẫn được sửa nếu không có lượt `IN_PROGRESS`; cập nhật giữ nguyên trạng thái. Kết quả thi có thống kê điểm, xuất Excel bảng điểm và API chi tiết bài làm.
- Không trả `correctOption` hoặc đáp án đúng qua API công khai trước khi nộp. API chi tiết bài làm chỉ dành cho giáo viên sở hữu đề và trả đáp án đã chọn/đáp án đúng/điểm từng câu.
- Phiên làm bài dùng JWT riêng scope `EXAM_ATTEMPT`, không dùng cookie giáo viên; thời gian, số lượt và điểm phải do backend quyết định.
- `Exam.maxAttempts = 0` là không giới hạn lượt; backend chỉ chặn khi `maxAttempts > 0` và số lượt đã dùng đạt giới hạn.
- Phòng thi bật toàn màn hình khi bắt đầu; thoát toàn màn hình chỉ hiện yêu cầu bật lại, không tăng bộ đếm. Backend lưu `ExamAttempt.exitCount` và chỉ ghi nhận qua `/api/public/attempts/:id/exit` khi tab bị ẩn hoặc cửa sổ trình duyệt mất focus. Trình duyệt không cho phép chặn tuyệt đối thao tác thoát ở cấp hệ điều hành.
- Học sinh xác danh bằng mã học sinh + mã ca thi; chỉ học sinh thuộc lớp của đề mới được bắt đầu.
- Trang chủ chỉ nhập mã ca thi + mã học sinh; sau đó hiển thị trang xác nhận thông tin ca thi/học sinh và chỉ gọi API bắt đầu khi học sinh bấm “Bắt đầu thi”. API tra cứu không trả câu hỏi hoặc đáp án.
- Import câu hỏi hỗ trợ `.docx`/`.txt` qua `/api/exams/import-text`; backend chỉ trích xuất văn bản, parser ở client nhận diện `Phần I` (A–D + đáp án đúng), `Phần II` (4 ý a–d + `Đáp án: Đ, S, Đ, S`) và `Phần III` (`Đáp án:` ngắn); preview và chỉ thêm câu hợp lệ.
- Giữ validation backend bằng Zod và xử lý lỗi tập trung.
- Frontend dùng toast cho kết quả thao tác, loading/empty state cho danh sách, confirm dialog cho hành động nguy hiểm.
