// drive-integrationV2.js - PHIÊN BẢN CHUẨN (KHÔNG DÙNG ONLOAD)

function initializeDriveIntegration(editorInstance, getCurrentFileName) {
    // --- Cấu hình ---
    const CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';

    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    let tokenClient;
    let gapiInited = false;
    let gsiInited = false;

    if (!saveToDriveBtn) return;

    saveToDriveBtn.disabled = true;
    saveToDriveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    saveToDriveBtn.title = "Đang khởi tạo dịch vụ Google...";
    saveToDriveBtn.addEventListener('click', handleAuthClick);
    
    // --- LUỒNG KHỞI TẠO MỚI ---
    
    // Hàm này sẽ được gọi từ app4.js để bắt đầu mọi thứ
    function startInitialization() {
        // 1. Chờ cho đối tượng 'google' (từ gsi/client) xuất hiện
        waitForGoogleLibrary().then(() => {
            gsiInited = true;
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        gapi.client.setToken(tokenResponse);
                        showPicker();
                    } else {
                        console.error("Không nhận được token hợp lệ.", tokenResponse);
                        Swal.fire('Lỗi xác thực', 'Không thể lấy quyền truy cập từ Google.', 'error');
                    }
                },
            });
            checkIfReadyAndEnableButton();
        });

        // 2. Đồng thời tải GAPI script
        loadGapiScript();
    }

    /**
     * Dùng một vòng lặp để kiểm tra khi nào thư viện GSI của Google được tải xong
     */
    function waitForGoogleLibrary() {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (window.google && window.google.accounts) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100); // Kiểm tra mỗi 100ms
        });
    }

    function loadGapiScript() {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            gapi.load('client:picker', () => {
                gapi.client.init({
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                }).then(() => {
                    gapiInited = true;
                    checkIfReadyAndEnableButton();
                });
            });
        };
        document.head.appendChild(script);
    }
    
    function checkIfReadyAndEnableButton() {
        if (gapiInited && gsiInited) {
            saveToDriveBtn.disabled = false;
            saveToDriveBtn.innerHTML = '<i class="fab fa-google-drive"></i>';
            saveToDriveBtn.title = "Lưu file .tex lên Google Drive";
        }
    }

    function handleAuthClick(event) {
        event.stopPropagation();
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    }
    
    function showPicker() {
        const accessToken = gapi.client.getToken().access_token;
        const view = new google.picker.View(google.picker.ViewId.FOLDERS);
        view.setSelectFolderEnabled(true);
        const picker = new google.picker.PickerBuilder()
            .setAppId(CLIENT_ID.split('-')[0])
            .setOAuthToken(accessToken)
            .addView(view)
            .setTitle("Chọn thư mục để lưu file")
            .setCallback(pickerCallback)
            .build();
        picker.setVisible(true);
    }

    function pickerCallback(data) {
        if (data.action === google.picker.Action.PICKED) {
            const folder = data.docs[0];
            const folderId = folder.id;
            uploadCurrentFileToDrive(folderId);
        }
    }

    async function uploadCurrentFileToDrive(parentFolderId) {
        // (Phần này giữ nguyên, không cần thay đổi)
        const fileName = getCurrentFileName() || 'untitled.tex';
        const fileContent = editorInstance.getValue();
        if (!fileContent.trim()) {
            Swal.fire('Tệp rỗng', 'Không có nội dung để lưu.', 'warning');
            return;
        }
        Swal.fire({
            title: 'Đang lưu lên Google Drive...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        try {
            const searchResponse = await gapi.client.drive.files.list({
                q: `'${parentFolderId}' in parents and name='${fileName}' and trashed=false`,
                fields: 'files(id)'
            });
            const metadata = { 'name': fileName, 'mimeType': 'text/x-tex' };
            let fileId = null;
            if (searchResponse.result.files && searchResponse.result.files.length > 0) {
                fileId = searchResponse.result.files[0].id;
            } else {
                 metadata.parents = [parentFolderId];
            }
            const boundary = '-------314159265358979323846';
            const multipartRequestBody = createMultipartRequestBody(boundary, metadata, fileContent);
            const requestParams = {
                path: fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files',
                method: fileId ? 'PATCH' : 'POST',
                params: { uploadType: 'multipart' },
                headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
                body: multipartRequestBody
            };
            const response = await gapi.client.request(requestParams);
            const file = response.result;
            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                html: `Đã ${fileId ? 'cập nhật' : 'lưu'} tệp <strong>${file.name}</strong>. <br><a href="${file.webViewLink}" target="_blank">Mở trên Google Drive</a>`,
            });
        } catch(err) {
            console.error("Lỗi khi tải file lên Drive:", err);
            Swal.fire('Lỗi', 'Không thể tải file. Chi tiết: ' + (err.result?.error?.message || err.message), 'error');
        }
    }

    function createMultipartRequestBody(boundary, metadata, content) {
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;
        return delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
            content +
            close_delim;
    }
    
    // Bắt đầu toàn bộ quá trình
    startInitialization();
}