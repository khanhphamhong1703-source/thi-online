# ViExam — Hệ thống thi trực tuyến

Ứng dụng thi trực tuyến dành cho học sinh, giáo viên và quản trị viên.

- **Trang mặc định `/` là cổng tra cứu ca thi** để học sinh nhập mã ca thi và mã học sinh.
- **Học sinh** xác danh bằng mã học sinh và mã ca thi, làm bài có đồng hồ đếm ngược, lưu tạm và nhận kết quả theo cài đặt của giáo viên.
- **Giáo viên** đăng nhập để quản lý lớp, học sinh, soạn đề trắc nghiệm, cài đặt ca thi, công bố đề và xem kết quả.
- **Admin** quản lý tài khoản giáo viên.

Trang chủ chỉ có lối vào dành cho thi cử, không hiển thị lối vào Giáo viên hoặc Admin. Hai cổng đăng nhập cũng không có liên kết chuyển đổi sang nhau; truy cập trực tiếp bằng URL tương ứng.

## 1. Chức năng

### Học sinh

- Trang chủ chỉ yêu cầu nhập **mã ca thi** và **mã học sinh**; không hiển thị danh sách ca thi.
- Sau khi tra cứu, xem trang xác nhận thông tin ca thi và thông tin học sinh trước khi vào phòng.
- Chỉ bắt đầu tính giờ làm bài khi học sinh bấm **Bắt đầu thi** ở trang xác nhận.
- Xác danh bằng **mã học sinh** và **mã ca thi** 6 ký tự do giáo viên cấp.
- Làm bài trắc nghiệm một đáp án đúng.
- Làm bài trong chế độ toàn màn hình; hệ thống cảnh báo khi thoát toàn màn hình và chỉ tăng số lần thoát khi học sinh chuyển tab hoặc rời cửa sổ trình duyệt.
- Đồng hồ đếm ngược do backend kiểm soát.
- Tự động lưu bài làm.
- Nộp bài thủ công hoặc tự nộp khi hết giờ.
- Xem điểm sau khi nộp nếu giáo viên bật công bố điểm.

Học sinh chưa có tài khoản đăng nhập. Việc xác danh dựa trên mã học sinh thuộc lớp của đề thi và mã ca thi.

### Giáo viên

- Đăng nhập, đổi mật khẩu, xem thông tin cá nhân.
- Quản lý lớp học và học sinh.
- Thêm học sinh thủ công với mã tự sinh dạng `HS0001`, `HS0002`...
- Import/export danh sách học sinh Excel.
- Tạo đề thi trắc nghiệm gồm thông tin ca thi và danh sách câu hỏi.
- Nhập câu hỏi từ file Word `.docx` hoặc văn bản `.txt`, chỉnh sửa trực tiếp và xem trước trước khi thêm.
- Chia câu hỏi thành các phần **I, II, III**, đặt tên riêng cho từng phần và thu gọn phần khi cần.
- Phần I: trắc nghiệm một đáp án A–D.
- Phần II: mỗi câu có 4 ý, học sinh chọn Đúng/Sai từng ý; điểm theo số ý đúng và giáo viên cấu hình được 4 mức điểm.
- Phần III: trả lời ngắn bằng 4 ô ký tự theo quy tắc ô 1 cho `-`/0–9, ô 2–3 cho `,`/0–9, ô 4 cho 0–9.
- Nhập điểm cho từng phần và chia đều điểm đó cho các câu hỏi trong phần.
- Bảng câu hỏi bên cạnh nhóm theo phần, chỉ hiển thị số thứ tự; nhấn số để nhảy nhanh tới câu. Trên mobile, bảng mở dạng drawer từ bên phải.
- Một đề thi có thể giao cho một hoặc nhiều lớp. Có thể lưu đề khi chưa gán lớp và gán sau; cần ít nhất một lớp trước khi công bố.
- Cài đặt ca thi:
  - thời gian mở/đóng;
  - thời lượng làm bài;
  - số lượt làm tối đa (0 = không giới hạn);
  - trộn câu hỏi, trộn đáp án;
  - công bố điểm sau khi nộp.
- Công bố đề để đưa lên bảng thi.
- Chỉnh sửa đề cả sau khi đã công bố, miễn là không có học sinh đang làm bài; trạng thái đề được giữ nguyên.
- Đóng ca thi.
- Xem lượt làm bài, thời gian nộp, trạng thái và điểm của học sinh; lọc kết quả theo lớp.
- Xem chi tiết từng bài làm: đáp án đã chọn, đáp án đúng và điểm của từng câu.
- Xem thống kê điểm trung bình, cao nhất, thấp nhất và biểu đồ phân bố điểm.
- Xuất bảng điểm của đề thi hoặc lớp đang lọc ra file Excel.
- Chỉ quản lý lớp, học sinh và đề thi thuộc tài khoản của mình.

### Admin

- Đăng nhập bằng tài khoản quản trị.
- Dashboard thống kê giáo viên.
- Tạo, sửa, xem chi tiết giáo viên.
- Khóa/mở khóa tài khoản.
- Đặt lại mật khẩu giáo viên.
- Quản lý dữ liệu toàn hệ thống: xem giáo viên, lớp học, học sinh, đề thi; bao gồm tài khoản bị khóa và lớp đã lưu trữ.
- Khôi phục lớp đã lưu trữ, mở khóa tài khoản và xoá vĩnh viễn dữ liệu có kiểm tra ràng buộc.
- Sao lưu toàn bộ dữ liệu ra JSON và nhập lại theo chế độ hợp nhất hoặc thay thế.

## 2. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 18 + Vite |
| CSS | TailwindCSS |
| Routing | React Router DOM v7 |
| HTTP Client | Axios |
| Form / validation | React Hook Form + Zod |
| Backend | Node.js + ExpressJS |
| Database | MongoDB |
| ORM | Prisma 6 |
| Authentication | JWT trong cookie HttpOnly cho Admin/Giáo viên |
| Phiên làm bài | JWT riêng cho từng lượt thi |
| Password | bcryptjs |
| Excel | ExcelJS |
| Word | Mammoth |
| Icons | Lucide React |

## 3. Cấu trúc chính

```text
thi-online/
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── layouts/          # PublicLayout, AppLayout
│   │   ├── pages/
│   │   │   ├── public/       # Bảng thi, giới thiệu ca thi, phòng thi
│   │   │   ├── admin/
│   │   │   └── teacher/      # Lớp, học sinh, đề thi, kết quả
│   │   ├── utils/
│   │   └── App.jsx
│   └── package.json
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── classes/
│   │   │   ├── students/
│   │   │   └── exams/        # Đề thi, câu hỏi, lượt làm bài
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
├── scripts/                  # Khởi động MongoDB local
├── docker-compose.yml
├── package.json
└── README.md
```

## 4. Yêu cầu môi trường

- Node.js **20.19+** (khuyến nghị Node 22 hoặc 24).
- npm 9+.
- MongoDB 6/7 chạy dạng **replica set một node**, hoặc Docker Desktop.

Prisma dùng transaction khi lưu đề thi và câu hỏi, nên MongoDB cần replica set. Nếu chạy standalone, thao tác ghi có thể báo lỗi `P2031`.

## 5. Cài đặt

### 5.1. Chạy toàn bộ ứng dụng bằng Docker

Cần Docker Desktop đang chạy. Từ thư mục gốc:

```powershell
Copy-Item .env.docker.example .env
powershell -ExecutionPolicy Bypass -File scripts/generate-dev-cert.ps1
```

Mở `.env` và đổi tối thiểu `JWT_SECRET`, `SEED_ADMIN_PASSWORD`. Giữ `COOKIE_SECURE=true` cho HTTPS.

Script tạo chứng chỉ self-signed tại `certs/fullchain.pem` và `certs/privkey.pem`. Khi dùng chứng chỉ thật, thay hai file này bằng chứng chỉ của domain; không cần chạy script.

Sau đó build và chạy cả MongoDB, API và giao diện:

```bash
docker compose up -d --build
```

Kiểm tra:

```bash
docker compose ps
docker compose logs -f server client
```

- Giao diện: **https://localhost:8443**
- API qua nginx: **https://localhost:8443/api**
- Đăng nhập Admin: **https://localhost:8443/admin/login**
- Đăng nhập giáo viên: **https://localhost:8443/teacher/login**

Với chứng chỉ self-signed, trình duyệt sẽ cảnh báo; chọn tiếp tục truy cập. Với chứng chỉ thật, cảnh báo này không xuất hiện.

Container server tự chạy `prisma db push` và seed Admin khi khởi động. Image client là bản build production và nginx proxy `/api` sang service `server`.

Các cổng có thể đổi trong `.env`:

```env
HTTPS_PORT=8443
SERVER_PORT=5050
MONGO_PORT=27017
CLIENT_URL=https://localhost:8443
CERTS_DIR=./certs
```

Nếu dùng cổng 443 tiêu chuẩn, đặt `HTTPS_PORT=443` và `CLIENT_URL=https://localhost`. Nếu truy cập qua LAN hoặc domain, đổi `CLIENT_URL` tương ứng, ví dụ `https://192.168.1.212:8443`; chứng chỉ phải có SAN chứa IP/domain đó.

Dừng ứng dụng:

```bash
docker compose down
```

Lệnh `docker compose down -v` xoá cả volume dữ liệu MongoDB; chỉ dùng khi muốn reset toàn bộ dữ liệu.

#### 5.1.1. Cấu hình production

Dùng `docker-compose.prod.yml` thay cho `docker-compose.yml` khi triển khai thật. File này chỉ public cổng HTTPS; MongoDB và API chỉ truy cập trong Docker network.

```powershell
Copy-Item .env.production.example .env.production
```

Mở `.env.production` và cấu hình:

```env
HTTPS_PORT=443
CLIENT_URL=https://your-domain.com
CERTS_DIR=./certs
JWT_SECRET=<chuỗi-ngẫu-nhiên-tối-thiểu-32-ký-tự>
SEED_ADMIN_PASSWORD=<mật-khẩu-admin-mạnh>
```

Có thể tạo `JWT_SECRET` bằng:

```bash
openssl rand -base64 48
```

Đặt chứng chỉ thật vào `certs/fullchain.pem` và `certs/privkey.pem`, trỏ DNS domain về server, sau đó:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Nếu stack local đang chạy, lệnh trên sẽ tự recreate các container sang cấu hình production.

Kiểm tra:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f server client
```

Các đặc điểm của cấu hình production:

- Chỉ map `${HTTPS_PORT}` ra ngoài; không publish `27017` (MongoDB) và `5050` (API).
- `COOKIE_SECURE=true` và `TRUST_PROXY=1` cố định.
- Bắt buộc có `CLIENT_URL`, `JWT_SECRET` và `SEED_ADMIN_PASSWORD`; thiếu biến nào Compose sẽ dừng.
- `SEED_ADMIN_RESET_PASSWORD=false`: khởi động lại container không ghi đè mật khẩu Admin đã đổi. Lần đầu trên database mới vẫn tạo Admin từ `SEED_ADMIN_PASSWORD`.
- Log Docker được giới hạn `10m` mỗi file, giữ 3 file.

Nếu cần reset khẩn cấp mật khẩu Admin về giá trị trong `.env.production`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -e SEED_ADMIN_RESET_PASSWORD=true server node prisma/seed.js
```

Sao lưu dữ liệu trước khi nâng cấp:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T mongodb mongodump --archive=/tmp/backup.gz --gzip
docker cp thi-online-mongodb:/tmp/backup.gz ./backup.gz
```

Không dùng `docker compose ... down -v` trên môi trường production vì sẽ xóa volume dữ liệu.

#### 5.1.2. Cloudflare Tunnel

Dùng Cloudflare Tunnel khi máy chạy Docker không có IP public, không muốn mở port 80/443 hoặc đang ở sau CGNAT.

1. Trong Cloudflare Zero Trust → Networks → Tunnels, tạo tunnel mới và copy token.
2. Điền token vào `.env.production`:

```env
CLOUDFLARE_TUNNEL_TOKEN=<token-cua-tunnel>
```

3. Chạy ứng dụng kèm profile `tunnel`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  --profile tunnel up -d --build
```

4. Trong cấu hình Public Hostname của tunnel, trỏ domain về service nội bộ:

```text
Subdomain: @
Domain: viexam.io.vn
Service: https://client:443
```

Bật **No TLS Verify** nếu nginx dùng chứng chỉ self-signed. Service `client:443` là tên container và cổng nội bộ trong Docker network, không phải `localhost`.

5. Kiểm tra:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  --profile tunnel ps

docker compose -f docker-compose.prod.yml --env-file .env.production \
  --profile tunnel logs --tail=50 cloudflared
```

Khi dùng Tunnel, không cần forward port 80/443 trên router. Vẫn nên đóng các port này trên firewall public. `HTTPS_PORT` chỉ là cổng map ra host; nếu 443 đang bận, có thể đổi thành `8443` mà không ảnh hưởng Tunnel vì Tunnel kết nối tới `client:443` bên trong Docker.

Nếu dùng cả `www`, tạo thêm Public Hostname `www.viexam.io.vn` trỏ cùng service, hoặc cấu hình redirect về domain chính.

Mỗi máy chạy một tunnel riêng; không dùng chung token cho nhiều máy nếu không muốn Cloudflare phân tải giữa các máy.

### 5.2. Chỉ khởi động MongoDB bằng Docker

Nếu muốn chạy React/Express bằng `npm` trên máy host và chỉ dùng MongoDB trong Docker:

```bash
docker compose up -d mongodb
```

Healthcheck tự khởi tạo replica set `rs0`. Khi kết nối từ máy host, dùng:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/thi_online?directConnection=true
```

Nếu không có Docker nhưng đã cài MongoDB Community trên Windows, chạy MongoDB local ở cổng 27018:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local-mongo.ps1
```

Sau đó đặt trong `server/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27018/thi_online?replicaSet=rs0
```

### 5.3. Cấu hình biến môi trường

Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

macOS/Linux:

```bash
cp server/.env.example server/.env
```

Kiểm tra `server/.env`:

```env
NODE_ENV=development
PORT=5050
CLIENT_URL=http://localhost:5180
MONGODB_URI=mongodb://127.0.0.1:27017/thi_online?replicaSet=rs0
JWT_SECRET=<chuỗi-ngẫu-nhiên-tối-thiểu-32-ký-tự>
JWT_EXPIRES_IN=7d
COOKIE_NAME=token
COOKIE_SECURE=false
TRUST_PROXY=1

SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=<mật-khẩu-admin>
SEED_ADMIN_FULLNAME=Quản trị viên
SEED_ADMIN_EMAIL=admin@example.com
```

Không commit file `.env`.

### 5.4. Cài dependency, đồng bộ schema và seed Admin

Từ thư mục gốc:

```bash
npm install
npm run install:all
npm run db:push
npm run seed
```

Hoặc thao tác trong `server/`:

```bash
cd server
npm install
npx prisma generate
npm run db:push
npm run seed
```

- `db:push` tạo collection/index cho `users`, `classes`, `students`, `enrollments`, `exams`, `questions`, `exam_attempts`.
- `seed` tạo hoặc cập nhật Admin theo biến `SEED_ADMIN_*`.
- Seed lại sẽ đặt lại mật khẩu Admin theo `SEED_ADMIN_PASSWORD`.

### 5.5. Chạy ứng dụng

```bash
npm run dev
```

Hoặc chạy riêng:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

Địa chỉ:

- Bảng thi công khai: **http://localhost:5180/**
- Đăng nhập giáo viên: **http://localhost:5180/teacher/login**
- Đăng nhập Admin: **http://localhost:5180/admin/login**
- API: **http://localhost:5050/api**
- Health check: **http://localhost:5050/api/health**

Trang chủ `/` không hiển thị nút đăng nhập Giáo viên/Admin. Giáo viên và Admin truy cập trực tiếp hai địa chỉ đăng nhập ở trên.

### 5.6. Tài khoản Admin

```text
Username: admin
Password: Admin@123456
```

Mật khẩu thực tế lấy từ `server/.env` (`SEED_ADMIN_PASSWORD`). Đổi mật khẩu trước khi dùng ngoài môi trường phát triển.

## 6. Luồng thi

1. Admin tạo tài khoản giáo viên.
2. Giáo viên đăng nhập, tạo lớp và thêm học sinh.
3. Giáo viên tạo đề: nhập thông tin, cài đặt ca thi và soạn câu hỏi.
4. Giáo viên bấm **Công bố**.
5. Đề xuất hiện trên bảng thi tại `/`.
6. Giáo viên gửi học sinh **mã học sinh** và **mã ca thi**.
7. Học sinh mở ca thi, nhập hai mã và bắt đầu làm bài.
8. Hệ thống lưu tạm, đếm ngược và tự nộp khi hết giờ.
9. Giáo viên xem kết quả tại trang quản lý đề.
10. Học sinh thấy điểm ngay sau khi nộp nếu `showScore` được bật.

## 7. Thiết kế dữ liệu

```text
User (ADMIN | TEACHER)
  │ 1 - N
  ▼
Class
  │ 1 - N                   1 - N
  ├──────────────► Enrollment ◄────────────── Student
  │                    │ N - 1                  │
  │ 1 - N              ▼                        │ 1 - N
  └──────────────► Exam                    ExamAttempt
                       │ 1 - N                    │ N - 1
                       ▼                          │
                    Question ◄────────────────────┘
```

### Các model chính

- `User`: Admin và giáo viên; phân biệt bằng `role`.
- `Class`: lớp thuộc một giáo viên; xóa mềm bằng `isArchived`.
- `Student`: mã học sinh duy nhất toàn hệ thống.
- `Enrollment`: quan hệ nhiều-nhiều giữa lớp và học sinh.
- `Exam`: đề/ca thi thuộc một giáo viên, có thể chưa gán lớp hoặc giao cho nhiều lớp; lưu tên tùy chỉnh của ba phần.
- `Question`: câu hỏi theo phần `I` / `II` / `III`; Phần I lưu đáp án A–D, Phần II lưu 4 ý Đúng/Sai, Phần III lưu đáp án ngắn.
- `ExamAttempt`: lượt làm bài của một học sinh, đáp án đã chọn, thời hạn, điểm, trạng thái và số lần thoát phòng thi (`exitCount`).

### Trạng thái

`Exam.status`:

- `DRAFT`: bản nháp, chỉ giáo viên thấy.
- `PUBLISHED`: đã công bố, có thể xuất hiện trên bảng thi.
- `CLOSED`: giáo viên đã đóng.

`Exam.phase` được tính từ thời gian:

- `UPCOMING`: chưa mở.
- `OPEN`: đang mở.
- `ENDED`: đã hết giờ hoặc đã đóng.

`ExamAttempt.status`:

- `IN_PROGRESS`: đang làm.
- `SUBMITTED`: học sinh nộp.
- `AUTO_SUBMITTED`: hệ thống tự nộp khi hết giờ/đóng ca.

### Mã học sinh

- Thêm thủ công: backend tự sinh `HS0001`...`HS9999`.
- Mã không thể chỉnh sửa sau khi tạo.
- Import Excel giữ nguyên mã trong file và chuẩn hóa uppercase.

## 8. API chính

### Auth

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/login` | Đăng nhập Admin/Giáo viên |
| POST | `/api/auth/logout` | Đăng xuất |
| GET | `/api/auth/me` | Người dùng hiện tại |
| PATCH | `/api/auth/password` | Đổi mật khẩu |

### Admin

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/admin/dashboard` | Thống kê giáo viên |
| GET | `/api/admin/teachers` | Danh sách, tìm kiếm, lọc, phân trang |
| POST | `/api/admin/teachers` | Tạo giáo viên |
| GET | `/api/admin/teachers/:id` | Chi tiết giáo viên |
| PATCH | `/api/admin/teachers/:id` | Cập nhật giáo viên |
| PATCH | `/api/admin/teachers/:id/status` | Khóa/mở khóa |
| POST | `/api/admin/teachers/:id/reset-password` | Đặt lại mật khẩu |
| GET | `/api/admin/data/summary` | Thống kê dữ liệu toàn hệ thống |
| GET | `/api/admin/data/teachers` | Danh sách giáo viên, gồm tài khoản bị khóa |
| GET | `/api/admin/data/classes` | Danh sách lớp, gồm lớp đã lưu trữ |
| GET | `/api/admin/data/students` | Danh sách học sinh toàn hệ thống |
| GET | `/api/admin/data/exams` | Danh sách đề thi toàn hệ thống |
| PATCH | `/api/admin/data/classes/:id/restore` | Khôi phục lớp đã lưu trữ |
| PATCH | `/api/admin/data/classes/:id/archive` | Lưu trữ lớp |
| DELETE | `/api/admin/data/teachers/:id` | Xoá vĩnh viễn giáo viên |
| DELETE | `/api/admin/data/classes/:id` | Xoá vĩnh viễn lớp |
| DELETE | `/api/admin/data/students/:id` | Xoá vĩnh viễn học sinh |
| DELETE | `/api/admin/data/exams/:id` | Xoá vĩnh viễn đề thi |
| GET | `/api/admin/data/backup/export` | Xuất toàn bộ dữ liệu ra file JSON |
| POST | `/api/admin/data/backup/import` | Nhập file JSON, hỗ trợ `merge` hoặc `replace` |

### Giáo viên — lớp, học sinh, đề thi

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/teacher/dashboard` | Dashboard giáo viên |
| GET/POST | `/api/classes` | Danh sách / tạo lớp |
| GET/PATCH/DELETE | `/api/classes/:id` | Chi tiết / sửa / lưu trữ lớp |
| GET | `/api/classes/:classId/students` | Học sinh trong lớp |
| POST | `/api/classes/:classId/students` | Thêm học sinh, tự sinh mã |
| DELETE | `/api/classes/:classId/students/:studentId` | Gỡ khỏi lớp |
| GET/PATCH | `/api/students/:id` | Chi tiết / sửa hồ sơ học sinh |
| POST | `/api/classes/:classId/students/import/preview` | Xem trước import |
| POST | `/api/classes/:classId/students/import/commit` | Xác nhận import |
| GET | `/api/classes/:classId/students/export` | Export Excel |
| POST | `/api/classes/:classId/students/import/error-report` | Báo cáo dòng lỗi |
| GET/POST | `/api/exams` | Danh sách / tạo đề kèm câu hỏi |
| POST | `/api/exams/import-text` | Đọc nội dung từ file `.docx` / `.txt` |
| GET/PATCH/DELETE | `/api/exams/:id` | Chi tiết / sửa / xóa đề nháp |
| POST | `/api/exams/:id/publish` | Công bố đề |
| POST | `/api/exams/:id/close` | Đóng ca thi |
| GET | `/api/exams/:id/attempts?classId=...` | Kết quả làm bài, lọc theo lớp |
| GET | `/api/exams/:id/attempts/:attemptId` | Chi tiết bài làm và đáp án từng câu |
| GET | `/api/exams/:id/results/export?classId=...` | Xuất Excel bảng điểm theo lớp |

Danh sách trả về `{ success, data, pagination }`. Mutation trả về `{ success, message, data }`.
`classId` không bắt buộc và phải là lớp thuộc đề thi.

### Công khai cho học sinh

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/public/exams` | Bảng thi đã công bố |
| GET | `/api/public/exams/:id` | Thông tin ca thi, không lộ câu hỏi |
| POST | `/api/public/exams/lookup` | Tra cứu ca thi và học sinh theo hai mã |
| POST | `/api/public/exams/:id/start` | Xác danh và bắt đầu/resume lượt thi |
| GET | `/api/public/attempts/:id` | Lấy trạng thái/phòng thi/kết quả |
| PATCH | `/api/public/attempts/:id/answers` | Lưu tạm đáp án |
| POST | `/api/public/attempts/:id/submit` | Nộp bài và chấm điểm |

Các API `/api/public/attempts/*` dùng `Authorization: Bearer <attemptToken>`. Token được cấp khi bắt đầu thi, lưu trong `sessionStorage`, không dùng cookie giáo viên.

## 9. Cài đặt ca thi

- `durationMinutes`: 1–300 phút.
- `openAt`, `closeAt`: thời gian mở/đóng; backend từ chối nếu đóng trước mở.
- `maxAttempts`: 0–100; `0` nghĩa là không giới hạn lượt làm.
- `trueFalseScores`: mảng 4 điểm cho 1, 2, 3, 4 ý đúng của Phần II; mặc định `[0.1, 0.25, 0.5, 1]`.
- `shuffleQuestions`: đảo thứ tự câu hỏi cho từng lượt.
- `shuffleOptions`: đảo thứ tự đáp án; đáp án đúng được ánh xạ theo chỉ số gốc.
- `showScore`: quyết định học sinh có thấy điểm sau khi nộp.
- `accessCode`: 6 ký tự, tự sinh duy nhất, chỉ hiển thị cho giáo viên.

Thời gian làm bài:

```text
expiresAt = min(now + duration, exam.closeAt)
```

Khi hết thời gian hoặc ca bị đóng, backend tự chấm và chuyển lượt làm sang `AUTO_SUBMITTED`.

## 10. Chấm điểm và bảo mật

- Đáp án đúng không bao giờ được trả về cho học sinh trước khi nộp.
- Điểm được tính ở backend; client không thể gửi điểm.
- Mỗi câu trả lời được kiểm tra thuộc đề thi và đúng kiểu câu hỏi.
- Phần I chấm theo đáp án duy nhất; Phần II chấm theo số ý đúng và thang `trueFalseScores`; Phần III chấm khớp chính xác đáp án ngắn.
- Lượt làm có thể resume khi còn hạn; hết hạn sẽ tự nộp.
- Giới hạn số lượt làm bài.
- Giáo viên chỉ truy cập đề/lớp/học sinh thuộc quyền sở hữu.
- Mật khẩu băm bằng bcrypt.
- JWT Admin/Giáo viên nằm trong cookie `HttpOnly`, `SameSite=Lax`; bật `Secure` khi production.
- Kiểm tra `Origin`/`Sec-Fetch-Site` cho request ghi dữ liệu.
- Rate limit đăng nhập và bắt đầu thi.
- File Excel giới hạn 5MB, tối đa 2.000 dòng, kiểm tra magic bytes và nội dung.
- Không hardcode secret; cấu hình qua `.env`.

Khi triển khai production:

1. Dùng HTTPS và `NODE_ENV=production`.
2. Đổi `JWT_SECRET`, mật khẩu seed và thông tin MongoDB.
3. Cấu hình reverse proxy phù hợp nếu cần rate limit theo IP thật.
4. Backup MongoDB định kỳ.

## 11. Nhập câu hỏi từ Word/Text

Trong tab **Câu hỏi**, giáo viên bấm **Nhập Word/Text** để mở workspace hai cột:

- Bên trái: chọn/kéo thả file `.docx`, `.txt` hoặc dán trực tiếp văn bản; có thể sửa nội dung.
- Bên phải: xem trước câu hỏi đã nhận diện, đáp án đúng và danh sách lỗi.

Giới hạn file: **5MB**, nội dung tối đa 200.000 ký tự.

Định dạng khuyến nghị:

```text
Phần I: Trắc nghiệm
Câu 1: Nội dung câu hỏi?
A. Đáp án A
B. Đáp án B
C. Đáp án C
D. Đáp án D
Đáp án đúng: A
Điểm: 1

Phần II: Đúng/Sai
Câu 2: Nội dung câu hỏi?
a) Ý 1
b) Ý 2
c) Ý 3
d) Ý 4
Đáp án: Đ, S, Đ, S
Điểm: 1

Phần III: Trả lời ngắn
Câu 3: Nội dung câu hỏi?
Đáp án: 1,5
Điểm: 1
```

Quy tắc:

- Có thể dùng dòng `Phần I`, `Phần II`, `Phần III` để gán câu hỏi vào từng phần. Mặc định là Phần I.
- Tên sau dấu hai chấm trong tiêu đề phần được nhập vào tên phần (ví dụ `Phần I: Trắc nghiệm`).
- Hỗ trợ tiêu đề `Câu N:`, `N.` hoặc `Question N`.
- Phần I: mỗi câu có đủ 4 đáp án A, B, C, D; đáp án đúng dùng `Đáp án đúng: A/B/C/D`.
- Phần II: mỗi câu có 4 ý `a)`–`d)` và dòng `Đáp án: Đ, S, Đ, S` (chấp nhận `Đúng/Sai`, `D/S`).
- Phần III: dùng dòng `Đáp án: 1,5` hoặc `-2,4`; đáp án phải theo quy tắc 4 ô.
- Điểm không bắt buộc, mặc định là 1.
- Câu lỗi được đánh dấu đỏ và không được thêm vào đề.
- Có thể thêm các câu hợp lệ vào sau hoặc thay thế toàn bộ câu hỏi hiện có.

## 12. Import/Export Excel học sinh

File `.xlsx`, tối đa 5MB, tối đa 2.000 dòng dữ liệu.

| Mã học sinh | Họ và tên | Ngày sinh | SĐT | Email |
|---|---|---|---|---|
| HS001 | Nguyễn Văn An | 15/03/2008 | 0912345678 | an@gmail.com |
| HS002 | Trần Thị Bình | 20/07/2008 | | |
| HS003 | Lê Văn Cường | 10/11/2008 | 0987654321 | |

Quy tắc:

- Mã trong file được giữ nguyên, không sinh tự động.
- Bắt buộc: mã học sinh, họ tên, ngày sinh.
- Ngày sinh hỗ trợ `dd/mm/yyyy`, `dd-mm-yyyy`, `yyyy-mm-dd` hoặc ô ngày Excel.
- SĐT: 10–11 số, bắt đầu bằng `0` hoặc `+84`.
- Email phải đúng định dạng nếu có.
- Mã trùng trong file → lỗi các dòng trùng.
- Mã đã tồn tại ngoài lớp → dùng hồ sơ hiện có.
- Mã đã thuộc lớp → bỏ qua.
- Backend kiểm tra lại file khi xác nhận; có báo cáo lỗi Excel.

## 13. Kiểm thử thủ công

### Admin

1. Đăng nhập sai/đúng.
2. Tạo giáo viên, thử username trùng.
3. Khóa tài khoản, thử đăng nhập giáo viên.
4. Mở khóa, đặt lại mật khẩu.

### Giáo viên và lớp học

1. Đăng nhập giáo viên.
2. Tạo lớp, tạo trùng mã lớp.
3. Thêm học sinh không nhập mã → nhận `HSxxxx`.
4. Sửa học sinh, mã không đổi.
5. Import/export Excel.
6. Giáo viên B không truy cập lớp/đề của giáo viên A.

### Đề thi

1. Tạo đề có ít nhất 2 câu, 4 đáp án mỗi câu.
2. Nhập tên riêng cho Phần I/II/III; thu gọn rồi mở rộng lại từng phần.
3. Nhập điểm phần và dùng “Chia đều” để phân bổ điểm cho các câu trong phần.
4. Chuyển câu giữa các phần bằng dropdown; nhấn số trong bảng câu hỏi để mở đúng phần và di chuyển tới câu.
5. Chọn nhiều lớp cho đề thi; học sinh thuộc bất kỳ lớp nào đã chọn đều có thể vào thi.
6. Nhập câu hỏi từ file `.docx` và `.txt`; sửa văn bản ở editor và kiểm tra preview.
7. Thử câu thiếu đáp án/đáp án đúng → câu đó bị đánh dấu lỗi và không import.
8. Cài đặt thời gian, số lượt, trộn câu/đáp án; xác nhận trộn câu giữ nguyên thứ tự phần.
9. Công bố đề.
10. Đề xuất hiện trên bảng thi `/`.
11. Đề nháp không xuất hiện công khai.
12. Không sửa được đề đã công bố.
13. Đóng ca thi.

### Học sinh

1. Nhập sai mã ca thi → bị từ chối.
2. Nhập mã học sinh ngoài lớp → bị từ chối.
3. Bắt đầu thi, tải lại trang → tiếp tục lượt đang làm.
4. Chọn đáp án, chờ lưu tạm.
5. Nộp bài → điểm đúng theo đáp án.
6. Làm quá số lượt → bị chặn.
7. Đóng ca thi hoặc hết giờ → lượt làm tự nộp.
8. `showScore=false` → học sinh không thấy điểm.

### Responsive

Kiểm tra bảng thi, phòng thi, form soạn đề và bảng kết quả trên mobile/tablet.

## 14. Giới hạn hiện tại

- Học sinh chưa có tài khoản đăng nhập; xác danh bằng mã học sinh + mã ca thi.
- Chưa hỗ trợ tự luận dài hoặc chấm điểm thủ công từng câu.
- Không có ngân hàng câu hỏi riêng ngoài đề thi.
- Không có tự luận, chấm điểm thủ công.
- Không có chống gian lận nâng cao, giám sát webcam hay khóa trình duyệt.
- Không có biểu đồ thống kê chuyên sâu.
- Đề đã công bố không thể chỉnh sửa; cần tạo đề mới nếu muốn thay đổi.
- Không có chức năng mở lại lớp đã lưu trữ trên giao diện.
- Không có nhân bản đề hoặc nhiều mã đề trong cùng ca thi.

## 15. Scripts

Từ root:

```bash
npm run dev        # chạy song song server + client
npm run db:push    # đồng bộ schema Prisma
npm run seed       # tạo/cập nhật Admin
npm run build      # build frontend
```

Từ `server/`:

```bash
npm run dev
npm start
npm run prisma:generate
npm run db:push
npm run seed
```
