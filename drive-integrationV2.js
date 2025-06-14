// drive-integrationV2.js - PHIÊN BẢN SỬA LỖI VÀ TỐI ƯU

function initializeDriveIntegration(editorInstance, getCurrentFileName) {
    // --- Cấu hình ---
    // NHỚ THAY BẰNG CLIENT ID CỦA BẠN
    const CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
    // API KEY không thực sự cần thiết cho Picker với OAuth, nhưng để đó cũng không sao
    const API_KEY = 'YOUR_API_KEY_IF_YOU_HAVE_ONE'; 
    const SCOPES = 'https://www.googleapis.com/auth/drive.file'; // Chỉ cần scope này là đủ

    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    let tokenClient;
    let gapiInited = false;
    let gsiInited = false;

    if (!saveToDriveBtn) {
        console.error("Nút 'save-to-drive-btn' không được tìm thấy.");
        return;
    }

    // Vô hiệu hóa nút lúc đầu
    saveToDriveBtn.disabled = true;
    saveToDriveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    saveToDriveBtn.title = "Đang khởi tạo dịch vụ Google...";
    saveToDriveBtn.addEventListener('click', handleAuthClick);
    
    // --- LUỒNG KHỞI TẠO ---

    // 1. Tải GAPI script (dùng cho Picker và Drive API)
    loadGapiScript();

    // 2. Script gsi/client trong HTML sẽ tự động tìm và gọi hàm này khi nó tải xong
    window.googleApiClientReady = () => {
        gsiInited = true;
        // Khởi tạo token client để quản lý việc lấy token
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                // Callback này sẽ được gọi SAU KHI người dùng đăng nhập và cấp quyền
                if (tokenResponse && tokenResponse.access_token) {
                    // Đặt token này cho GAPI client sử dụng trong các request tiếp theo
                    gapi.client.setToken(tokenResponse);
                    // Sau khi có token, hiển thị Picker
                    showPicker();
                } else {
                    console.error("Không nhận được token hợp lệ.", tokenResponse);
                    Swal.fire('Lỗi xác thực', 'Không thể lấy quyền truy cập từ Google. Vui lòng thử lại.', 'error');
                }
            },
        });
        checkIfReadyAndEnableButton();
    };

    /**
     * Tải thư viện gapi.js và khởi tạo các client cần thiết
     */
    function loadGapiScript() {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            // Sau khi gapi.js tải xong, tải các module client và picker
            gapi.load('client:picker', () => {
                // Khởi tạo Drive API client
                gapi.client.init({
                    // apiKey: API_KEY, // không cần khi đã dùng OAuth
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                }).then(() => {
                    gapiInited = true;
                    checkIfReadyAndEnableButton();
                });
            });
        };
        document.head.appendChild(script);
    }

    /**
     * Kiểm tra xem cả GSI và GAPI đã sẵn sàng chưa, nếu rồi thì kích hoạt nút
     */
    function checkIfReadyAndEnableButton() {
        if (gapiInited && gsiInited) {
            saveToDriveBtn.disabled = false;
            saveToDriveBtn.innerHTML = '<i class="fab fa-google-drive"></i>';
            saveToDriveBtn.title = "Lưu file .tex lên Google Drive";
        }
    }

    /**
     * Xử lý khi người dùng nhấn nút lưu
     */
    function handleAuthClick(event) {
        event.stopPropagation(); // Ngăn sự kiện nổi bọt
        
        // Kiểm tra xem đã có token chưa
        if (gapi.client.getToken() === null) {
            // Nếu chưa có, yêu cầu một token mới.
            // Popup đăng nhập sẽ hiện ra, và callback ở initTokenClient sẽ được gọi.
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            // Nếu đã có token, yêu cầu lại không cần prompt để làm mới nếu cần
            // và sau đó hiển thị picker ngay lập tức.
             tokenClient.requestAccessToken({ prompt: '' });
        }
    }
    
    /**
     * Tạo và hiển thị Google Picker
     */
    function showPicker() {
        const accessToken = gapi.client.getToken().access_token;
        const view = new google.picker.View(google.picker.ViewId.FOLDERS);
        view.setSelectFolderEnabled(true);
        
        const picker = new google.picker.PickerBuilder()
            .setAppId(CLIENT_ID.split('-')[0])
            .setOAuthToken(accessToken)
            // .setDeveloperKey(API_KEY) // không cần khi đã dùng OAuth
            .addView(view)
            .setTitle("Chọn thư mục để lưu file")
            .setCallback(pickerCallback)
            .build();
        picker.setVisible(true);
    }

    /**
     * Xử lý kết quả trả về từ Picker
     * @param {object} data 
     */
    function pickerCallback(data) {
        if (data.action === google.picker.Action.PICKED) {
            const folder = data.docs[0];
            const folderId = folder.id;
            uploadCurrentFileToDrive(folderId);
        }
    }

    /**
     * Tải file hiện tại lên thư mục đã chọn trên Google Drive
     * @param {string} parentFolderId
     */
    async function uploadCurrentFileToDrive(parentFolderId) {
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
            // Kiểm tra xem file đã tồn tại chưa
            const searchResponse = await gapi.client.drive.files.list({
                q: `'${parentFolderId}' in parents and name='${fileName}' and trashed=false`,
                fields: 'files(id)'
            });

            const metadata = { 
                'name': fileName, 
                'mimeType': 'text/x-tex',
            };
            
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

    /**
     * Tiện ích tạo body cho request multipart
     */
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
}