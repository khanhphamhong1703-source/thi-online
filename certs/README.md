# Chứng chỉ TLS

Đặt hai file sau vào thư mục này trước khi chạy Docker Compose:

- `fullchain.pem`: chứng chỉ công khai, gồm cả chuỗi trung gian nếu có.
- `privkey.pem`: khóa riêng tư tương ứng.

Với môi trường local, có thể tạo chứng chỉ self-signed bằng:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-dev-cert.ps1
```

Sau đó mở `https://localhost:8443` và chấp nhận cảnh báo chứng chỉ self-signed của trình duyệt.

Với chứng chỉ thật (Let's Encrypt, Cloudflare hoặc chứng chỉ của tổ chức), chỉ cần thay hai file trên rồi chạy lại client:

```bash
docker compose up -d --build client
```
