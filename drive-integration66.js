// Biến toàn cục để các hàm khác có thể truy cập
let editorInstance_global;
let getCurrentFileName_global;
let tokenClient;
const CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const DEVELOPER_KEY = 'AIzaSyBIPOIuhMnatqffutzXPHdNk5_6J1gaGjg'; // <<--- NHỚ THAY BẰNG API KEY CỦA BẠN
const SCOPES = 'https://www.googleapis.com/auth/drive';

/**
 * Hàm này được gọi từ app4.js để truyền vào các đối tượng cần thiết
 */
function initializeDriveIntegration(editor, getCurrentFileName) {
    editorInstance_global = editor;
    getCurrentFileName_global = getCurrentFileName;
    console.log("Drive Integration Initialized.");
}

/**
 * HÀM NÀY SẼ ĐƯỢC GOOGLE TỰ ĐỘNG GỌI KHI SCRIPT api.js TẢI XONG
 * Đây là điểm khởi đầu an toàn để sử dụng 'gapi'.
 */
function gapiLoaded() {
    gapi.load('client:picker', initializeGapiClient);
}

/**
 * Hàm này được gọi sau khi 'gapi.client' và 'gapi.picker' đã sẵn sàng.
 */
function initializeGapiClient() {
    gapi.client.init({
        apiKey: DEVELOPER_KEY,
        clientId: CLIENT_ID,
        scope: SCOPES,
    }).then(() => {
        console.log("GAPI client initialized.");
        // Bây giờ GAPI đã sẵn sàng, hãy chuẩn bị cho việc xác thực (GSI)
        initializeGsiClient();
    }).catch(err => {
        console.error("Lỗi khi khởi tạo GAPI client:", err);
    });
}

/**
 * Khởi tạo GSI client để xử lý đăng nhập và token
 */
function initializeGsiClient() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => { // Callback được gọi sau khi có token
            if (tokenResponse && tokenResponse.access_token) {
                createPicker(tokenResponse.access_token);
            }
        },
    });
    console.log("GSI client initialized.");
    
    // Bây giờ mọi thứ đã sẵn sàng, hãy bật nút Lưu
    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    if (saveToDriveBtn) {
        saveToDriveBtn.disabled = false;
        saveToDriveBtn.title = "Lưu file .tex vào một thư mục trên Google Drive...";
        saveToDriveBtn.addEventListener('click', handleAuthClick);
    }
}

/**
 * Hàm xử lý chính khi click vào nút Lưu
 */
function handleAuthClick() {
    if (gapi.client.getToken() === null) {
        // Nếu chưa có token, yêu cầu đăng nhập/cấp quyền
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Nếu đã có token, chỉ cần yêu cầu lại (có thể không hiện popup)
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

// --- CÁC HÀM XỬ LÝ PICKER VÀ UPLOAD GIỮ NGUYÊN ---

function createPicker(accessToken) {
    const view = new google.picker.View(google.picker.ViewId.FOLDERS);
    view.setMimeTypes("application/vnd.google-apps.folder");

    const picker = new google.picker.PickerBuilder()
        .setAppId(CLIENT_ID.split('-')[0])
        .setOAuthToken(accessToken)
        .setDeveloperKey(DEVELOPER_KEY)
        .addView(view)
        .setLocale('vi')
        .setTitle("Chọn một thư mục để lưu file")
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
}

async function pickerCallback(data) {
    if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
        const folderId = data[google.picker.Response.DOCUMENTS][0].id;
        await uploadCurrentFileToDrive(folderId);
    }
}

async function uploadCurrentFileToDrive(folderId) {
    const fileName = getCurrentFileName_global() || 'untitled.tex';
    const fileContent = editorInstance_global.getValue();

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

    const metadata = {
        'name': fileName,
        'mimeType': 'text/x-tex',
        'parents': [folderId]
    };

    const boundary = '-------314159265358979323846';
    const multipartRequestBody =
        `\r\n--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\n` +
        `Content-Type: text/plain\r\n\r\n` +
        fileContent +
        `\r\n--${boundary}--`;

    try {
        const response = await gapi.client.request({
            'path': '/upload/drive/v3/files',
            'method': 'POST',
            'params': { 'uploadType': 'multipart' },
            'headers': {
                'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            'body': multipartRequestBody
        });
        const file = response.result;
        Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            html: `Đã lưu tệp <strong>${file.name}</strong>. <br><br> <a href="https://drive.google.com/file/d/${file.id}/view" target="_blank">Mở file trên Google Drive</a>`,
        });
    } catch (err) {
        Swal.fire('Lỗi', `Không thể tải file lên Drive. Chi tiết: ${err.result?.error?.message || err.message}`, 'error');
    }
}