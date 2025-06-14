// === File: drive-integration.js (PHIÊN BẢN NÂNG CẤP LÊN GOOGLE IDENTITY SERVICES) ===

function initializeDriveIntegration(editorInstance, getCurrentFileName) {

    // --- Cấu hình ---
    const CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';

    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    let tokenClient;
    let gapiInited = false;
    let gsiInited = false;

    if (!saveToDriveBtn) {
        console.error("Nút 'save-to-drive-btn' không được tìm thấy.");
        return;
    }
    
    // --- KHỞI ĐỘNG ---
    saveToDriveBtn.disabled = true;
    saveToDriveBtn.title = "Đang khởi tạo dịch vụ Google...";
    saveToDriveBtn.addEventListener('click', handleAuthClick);

    // Tải GAPI (dùng để tương tác với Drive API)
    loadGapiScript();
    
    // Khởi tạo GSI (dùng để xác thực)
    // Script này đã được thêm vào HTML, window.onload sẽ gọi hàm này
    window.googleApiClientReady = () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // Sẽ được xử lý bởi promise
        });
        gsiInited = true;
        checkIfReadyAndEnableButton();
    };


    /**
     * Tải script gapi theo cách thủ công
     */
    function loadGapiScript() {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            gapi.load('client', () => {
                gapi.client.init({}).then(() => {
                    gapiInited = true;
                    checkIfReadyAndEnableButton();
                });
            });
        };
        document.body.appendChild(script);
    }
    
    /**
     * Kiểm tra cả 2 thư viện đã sẵn sàng chưa để bật nút
     */
    function checkIfReadyAndEnableButton() {
        if (gapiInited && gsiInited) {
            console.log("Google API và Identity Services đã sẵn sàng.");
            saveToDriveBtn.disabled = false;
            saveToDriveBtn.title = "Lưu file .tex lên Google Drive";
        }
    }


    /**
     * Hàm xử lý chính khi click vào nút
     */
    async function handleAuthClick(event) {
        event.stopPropagation();
        
        // Yêu cầu token
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }
            // Nếu thành công, tiến hành upload
            await uploadCurrentFileToDrive();
        };

        // Nếu gapi.client.getToken() trả về null, nghĩa là người dùng chưa cấp quyền
        if (gapi.client.getToken() === null) {
            // Yêu cầu token mới. Cửa sổ popup sẽ hiện ra ở đây.
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            // Nếu đã có token, yêu cầu lại để đảm bảo token còn hiệu lực
            tokenClient.requestAccessToken({prompt: ''});
        }
    }


    /**
     * Hàm chính để tạo và tải file lên Google Drive.
     */
    async function uploadCurrentFileToDrive() {
        const fileName = getCurrentFileName() || 'untitled.tex';
        const fileContent = editorInstance.getValue();

        if (!fileContent.trim()) {
            Swal.fire('Tệp rỗng', 'Không có nội dung để lưu.', 'warning');
            return;
        }
        
        Swal.fire({
            title: 'Đang lưu lên Google Drive...',
            text: `Đang tải tệp ${fileName}`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        const metadata = { 'name': fileName, 'mimeType': 'text/x-tex' };
        const multipartRequestBody =
            delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
            delimiter + 'Content-Type: text/plain\r\n\r\n' + fileContent + // Sửa lại mime-type cho nội dung
            close_delim;
        
        try {
            const response = await gapi.client.request({
                'path': '/upload/drive/v3/files',
                'method': 'POST',
                'params': {'uploadType': 'multipart'},
                'headers': {
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"',
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}` // Thêm token vào header
                },
                'body': multipartRequestBody
            });

            const file = response.result;
            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                html: `Đã lưu tệp <strong>${file.name}</strong> lên Google Drive thành công. <br><br> <a href="https://drive.google.com/file/d/${file.id}/view" target="_blank" style="color: #007bff; text-decoration: none;">Mở file trên Google Drive</a>`,
            });
        } catch(err) {
            console.error("Lỗi khi tải file lên Drive:", err);
            Swal.fire('Lỗi', 'Không thể tải file lên Google Drive. Chi tiết: ' + (err.result?.error?.message || err.message), 'error');
        }
    }
}