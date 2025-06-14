// === File: drive-integration.js (PHIÊN BẢN NÂNG CẤP - LƯU VÀO THƯ MỤC CỤ THỂ) ===

function initializeDriveIntegration(editorInstance, getCurrentFileName) {

    // --- Cấu hình ---
    const CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
    // THAY ĐỔI QUAN TRỌNG: Mở rộng scope để có quyền tìm và tạo thư mục
    const SCOPES = 'https://www.googleapis.com/auth/drive';
    // Tên thư mục bạn muốn tạo trên Google Drive
    const FOLDER_NAME = 'Dự án LaTeX từ Editor';

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

    loadGapiScript();
    
    window.googleApiClientReady = () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', 
        });
        gsiInited = true;
        checkIfReadyAndEnableButton();
    };

    function loadGapiScript() {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            gapi.load('client', () => {
                gapi.client.init({}).then(() => {
                    // Sau khi GAPI init, chúng ta cần load thêm thư viện 'drive'
                    gapi.client.load('drive', 'v3', () => {
                        gapiInited = true;
                        checkIfReadyAndEnableButton();
                    });
                });
            });
        };
        document.body.appendChild(script);
    }
    
    function checkIfReadyAndEnableButton() {
        if (gapiInited && gsiInited) {
            console.log("Google API và Identity Services đã sẵn sàng.");
            saveToDriveBtn.disabled = false;
            saveToDriveBtn.title = "Lưu file .tex lên Google Drive";
        }
    }

    async function handleAuthClick(event) {
        event.stopPropagation();
        
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }
            await uploadCurrentFileToDrive();
        };

        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            tokenClient.requestAccessToken({prompt: ''});
        }
    }

    /**
     * HÀM MỚI: Tìm ID của thư mục theo tên. Nếu không có, tạo thư mục mới và trả về ID.
     * @returns {Promise<string>} ID của thư mục.
     */
    async function getOrCreateFolderId() {
        // 1. Tìm kiếm thư mục
        const searchResponse = await gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
            fields: 'files(id, name)',
        });

        if (searchResponse.result.files.length > 0) {
            const folderId = searchResponse.result.files[0].id;
            console.log(`Tìm thấy thư mục '${FOLDER_NAME}' với ID: ${folderId}`);
            return folderId;
        } else {
            // 2. Nếu không tìm thấy, tạo thư mục mới
            console.log(`Không tìm thấy thư mục '${FOLDER_NAME}'. Đang tạo mới...`);
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    'name': FOLDER_NAME,
                    'mimeType': 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            const folderId = createResponse.result.id;
            console.log(`Đã tạo thư mục '${FOLDER_NAME}' với ID: ${folderId}`);
            return folderId;
        }
    }

    /**
     * HÀM ĐÃ CẬP NHẬT: Tải file lên thư mục cụ thể.
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
            text: `Đang chuẩn bị để tải tệp ${fileName}`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        
        try {
            // Lấy ID của thư mục trước khi tải file lên
            const folderId = await getOrCreateFolderId();

            Swal.update({
                text: `Đang tải tệp ${fileName} vào thư mục '${FOLDER_NAME}'...`
            });
            
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            // THAY ĐỔI QUAN TRỌNG: Thêm 'parents' vào metadata
            const metadata = { 
                'name': fileName, 
                'mimeType': 'text/x-tex',
                'parents': [folderId] // <-- Chỉ định thư mục cha
            };

            const multipartRequestBody =
                delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
                delimiter + 'Content-Type: text/plain\r\n\r\n' + fileContent +
                close_delim;
            
            const response = await gapi.client.request({
                'path': '/upload/drive/v3/files',
                'method': 'POST',
                'params': {'uploadType': 'multipart'},
                'headers': {
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"',
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`
                },
                'body': multipartRequestBody
            });

            const file = response.result;
            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                html: `Đã lưu tệp <strong>${file.name}</strong> vào thư mục <strong>${FOLDER_NAME}</strong> trên Google Drive. <br><br> <a href="https://drive.google.com/file/d/${file.id}/view" target="_blank" style="color: #007bff; text-decoration: none;">Mở file trên Google Drive</a>`,
            });
        } catch(err) {
            console.error("Lỗi khi tải file lên Drive:", err);
            const errorMessage = err.result?.error?.message || err.message || 'Lỗi không xác định.';
            Swal.fire('Lỗi', `Không thể tải file lên Google Drive. Chi tiết: ${errorMessage}`, 'error');
        }
    }
}