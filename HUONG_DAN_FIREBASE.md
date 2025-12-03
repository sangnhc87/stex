Em HƯỚNG DẪN CẤU HÌNH FIREBASE (TIẾNG VIỆT)

Hệ thống đã được lập trình sẵn tính năng Đăng nhập Google, Duyệt thành viên (Admin), và Lưu trữ đám mây.
Tuy nhiên, để nó hoạt động, bạn cần kết nối nó với tài khoản Google Firebase của chính bạn.

Hãy làm theo các bước sau:

## BƯỚC 1: Tạo dự án Firebase
1. Truy cập: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Nhấn **"Create a project"** (hoặc "Add project").
3. Đặt tên dự án (ví dụ: `Stex-Editor`) -> Nhấn Continue -> Tắt Google Analytics (không cần thiết) -> Nhấn **Create project**.

## BƯỚC 2: Bật tính năng Đăng nhập (Authentication)
1. Trong menu bên trái, chọn **Build** -> **Authentication**.
2. Nhấn **Get started**.
3. Chọn tab **Sign-in method**.
4. Chọn **Google**.
5. Bật công tắc **Enable**.
6. Chọn email hỗ trợ (email của bạn).
7. Nhấn **Save**.

## BƯỚC 3: Tạo Cơ sở dữ liệu (Firestore Database)
1. Trong menu bên trái, chọn **Build** -> **Firestore Database**.
2. Nhấn **Create database**.
3. Chọn Location (vị trí server), nên chọn `asia-southeast1` (Singapore) cho nhanh.
4. Nhấn **Next**.
5. Chọn **Start in test mode** (để dễ dàng test ban đầu) -> Nhấn **Create**.

## BƯỚC 4: Lấy mã cấu hình (Config)
1. Nhấn vào biểu tượng **Bánh răng (Settings)** bên cạnh "Project Overview" ở menu trái -> Chọn **Project settings**.
2. Kéo xuống phần **Your apps**.
3. Nhấn vào biểu tượng **Web** (hình dấu `</>`).
4. Đặt tên App (ví dụ: `Web Editor`) -> Nhấn **Register app**.
5. Bạn sẽ thấy đoạn mã `const firebaseConfig = { ... };`.
6. **COPY** toàn bộ đoạn mã trong dấu ngoặc nhọn `{ ... }`.

## BƯỚC 5: Dán vào code
1. Mở file `firebase-config.js` trong thư mục code của bạn.
2. Dán đè đoạn config bạn vừa copy vào chỗ `const firebaseConfig = { ... }`.
3. Lưu file lại.

---

## CÁCH SỬ DỤNG TÍNH NĂNG ADMIN & QUẢN LÝ HẠN DÙNG

Mặc định, ai đăng nhập vào cũng sẽ ở trạng thái **"Chờ duyệt"** (Pending) và không thể sửa code.
Để duyệt người dùng, bạn cần có ít nhất 1 tài khoản Admin.

**Bước 1: Tạo Admin đầu tiên (Là bạn)**
1. Mở web lên, đăng nhập bằng Gmail của bạn. (Nó sẽ báo "Chờ duyệt").
2. Quay lại trang **Firebase Console** -> **Build** -> **Firestore Database**.
3. Vào collection `users`.
4. Tìm dòng chứa email của bạn.
5. Sửa trường `role` từ `'user'` thành `'admin'`.
6. Sửa trường `status` từ `'pending'` thành `'approved'`.
7. Quay lại web và tải lại trang (F5).

**Bước 2: Sử dụng Dashboard**
Sau khi là Admin, bạn sẽ thấy nút **Admin Dashboard** (biểu tượng cái khiên màu đỏ) trên thanh công cụ.
Bấm vào đó để:
- **Duyệt người mới**: Đổi trạng thái từ `Pending` sang `Approved`.
- **Khóa người dùng**: Đổi sang `Blocked`.
- **Cấp quyền Admin**: Đổi Role sang `Admin`.
- **Gia hạn sử dụng**: Chọn ngày ở cột "Hết hạn". Nếu quá ngày này, người dùng sẽ bị khóa.

## KHẮC PHỤC LỖI THƯỜNG GẶP

### Lỗi: "This domain is not authorized for OAuth operations..."
Đây là lỗi do tên miền trang web chưa được khai báo với Firebase.
**Cách sửa:**
1. Vào [Firebase Console](https://console.firebase.google.com/).
2. Chọn dự án của bạn -> **Authentication** -> **Settings**.
3. Chọn tab **Authorized domains**.
4. Nhấn **Add domain**.
5. Nhập tên miền trang web của bạn vào (ví dụ: `localhost` nếu chạy trên máy, hoặc `stex.pages.dev` nếu đã deploy).
6. Nhấn **Add**.

### Lỗi: "Missing or insufficient permissions"
Đây là lỗi do bạn chưa mở quyền ghi vào Database.
**Cách sửa:**
1. Vào [Firebase Console](https://console.firebase.google.com/).
2. Chọn dự án -> **Firestore Database**.
3. Chọn tab **Rules**. 
4. Sửa đoạn code trong đó thành:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
5. Bấm **Publish**.



