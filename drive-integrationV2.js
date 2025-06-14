// === File: drive-integration.js (PHIÊN BẢN HOÀN CHỈNH VỚI GOOGLE PICKER) ===

function initializeDriveIntegration(editorInstance, getCurrentFileName) {

    // --- Cấu hình ---
    // NHỚ THAY BẰNG CLIENT ID CỦA BẠN
    const CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com'; 
    const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';

    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    let tokenClient;
    let gapiInited = false;
    let gsiInited = false;
    let pickerApiLoaded = false;
    let oauthToken; // Biến để lưu token truy cập

    if (!saveToDriveBtn) {
        console.error("Nút 'save-to-drive-btn' không được tìm thấy.");
        return;
    }
    
    saveToDriveBtn.disabled = true;
    saveToDriveBtn.title = "Đang khởi tạo dịch vụ Google...";
    saveToDriveBtn.addEventListener('click', handleAuthClick);

    // Tải GAPI (dùng để tương tác với Drive API và Picker API)
    loadGapiScript();
    
    // Khởi tạo GSI (dùng để xác thực)
    // Script gsi/client trong HTML sẽ gọi hàm này khi nó sẵn sàng
    window.googleApiClientReady = () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                // Xử lý khi nhận được token
                if (tokenResponse.error) {
                    throw tokenResponse;
                }
                oauthToken = tokenResponse;
                showPicker(); // Sau khi có token, hiển thị Picker
            },
        });
        gsiInited = true;
        checkIfReadyAndEnableButton();
    };

    function loadGapiScript() {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            gapi.load('client:picker', () => { // Tải cả 'client' và 'picker'
                gapi.client.init({}).then(() => {
                    gapiInited = true;
                    pickerApiLoaded = true;
                    checkIfReadyAndEnableButton();
                });
            });
        };
        document.body.appendChild(script);
    }
    
    function checkIfReadyAndEnableButton() {
        if (gapiInited && gsiInited && pickerApiLoaded) {
            saveToDriveBtn.disabled = false;
            saveToDriveBtn.title = "Lưu file .tex lên Google Drive";
        }
    }

    function handleAuthClick(event) {
        event.stopPropagation();
        
        if (oauthToken) {
            showPicker();
        } else {
            // Yêu cầu token mới. Cửa sổ popup sẽ hiện ra.
            // Callback ở trên sẽ tự động gọi showPicker() sau khi có token.
            tokenClient.requestAccessToken({prompt: 'consent'});
        }
    }
    
    function showPicker() {
        const view = new google.picker.View(google.picker.ViewId.FOLDERS)
            .setMimeTypes("application/vnd.google-apps.folder");
        
        const picker = new google.picker.PickerBuilder()
            .enableFeature(google.picker.Feature.NAV_HIDDEN)
            .setAppId(CLIENT_ID.split('-')[0])
            .setOAuthToken(oauthToken.access_token)
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
        const fileName = getCurrentFileName() || 'untitled.tex';
        const fileContent = editorInstance.getValue();

        if (!fileContent.trim()) {
            Swal.fire('Tệp rỗng', 'Không có nội dung để lưu.', 'warning');
            return;
        }
        
        Swal.fire({
            title: 'Đang lưu lên Google Drive...',
            text: `Đang tải tệp ${fileName} vào thư mục đã chọn.`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        
        const metadata = { 
            'name': fileName, 
            'mimeType': 'text/x-tex',
            'parents': [parentFolderId]
        };

        const multipartRequestBody =
            delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
            delimiter + 'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + fileContent +
            close_delim;
        
        try {
            const response = await gapi.client.request({
                'path': '/upload/drive/v3/files',
                'method': 'POST',
                'params': {'uploadType': 'multipart'},
                'headers': {
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"',
                    'Authorization': `Bearer ${oauthToken.access_token}`
                },
                'body': multipartRequestBody
            });

            const file = response.result;
            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                html: `Đã lưu tệp <strong>${file.name}</strong> lên Google Drive. <br><br> <a href="https://drive.google.com/file/d/${file.id}/view" target="_blank" style="color: #007bff; text-decoration: none;">Mở file trên Google Drive</a>`,
            });
        } catch(err) {
            console.error("Lỗi khi tải file lên Drive:", err);
            Swal.fire('Lỗi', 'Không thể tải file lên Google Drive. Chi tiết: ' + (err.result?.error?.message || err.message), 'error');
        }
    }
}