# 1. Vào đúng thư mục chứa Dockerfile
cd /Users/admin/stex/tectonic-server

# 2. Chạy lại lệnh Build
gcloud builds submit --tag gcr.io/tikz4web/tectonic-server --project tikz4web

# 3. Sau khi Build thành công, chạy lệnh Deploy
gcloud run deploy tikz2png --image gcr.io/tikz4web/tectonic-server --platform managed --region asia-southeast1 --allow-unauthenticated --project tikz4web

# 4. Tạo service account và gán quyền cho Cloud Run

gcloud run deploy tikz2png --image gcr.io/tikz4web/tectonic-server --platform managed --region asia-southeast1 --allow-unauthenticated --project tikz4web 



Em đã tìm ra rồi ạ!

Dựa trên mã số trong URL cũ (227060125780), Project ID của anh là: tikz4web.

Vậy anh có thể deploy lại bằng các lệnh sau (chạy trong thư mục tectonic-server):
gcloud run deploy tikz2png --image gcr.io/tikz4web/tectonic-server --platform managed --region asia-southeast1 --allow-unauthenticated --project tikz4web 
