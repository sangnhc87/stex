/**
 * ====================================================================
 *  DRIVE INTEGRATION MODULE - PHIÊN BẢN 6.0 (FINAL)
 * ====================================================================
 * - Tích hợp Google Picker API để người dùng chọn thư mục lưu file.
 * - Tối ưu hóa luồng tải và khởi tạo API để tăng độ ổn định.
 * - Cải thiện xử lý lỗi và thông báo cho người dùng.
 * - Tác giả nâng cấp: AI Assistant (dựa trên code của Nguyễn Văn Sang)
 */

// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive';

// QUAN TRỌNG: Cập nhật danh sách email của bạn và đồng nghiệp ở đây!
const AUTHORIZED_EMAILS = [
    'nguyensangnhc@gmail.com',    // Email của bạn
    // 'dongnghiep1@example.com',   // Bỏ comment và thay bằng email đồng nghiệp
    // 'dongnghiep2@example.com'
];

let gapiReady = false;
let pickerApiLoaded = false;
let tokenClient;
let editorInstanceRef; 
let getCurrentFileNameRef;

// --- CÁC HÀM XỬ LÝ GIAO DIỆN (UI) ---
function updateUIOnLogin(userProfile) {
    const signInBtnContainer = document.getElementById('google-signin-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const userAvatarImg = document.getElementById('user-avatar');
    const userNameSpan = document.getElementById('user-name');
    const saveToDriveBtn = document.getElementById('save-to-drive-btn');

    if (signInBtnContainer) signInBtnContainer.style.display = 'none';
    if (userProfileDiv) userProfileDiv.style.display = 'flex';
    if (userAvatarImg) userAvatarImg.src = userProfile.picture;
    if (userNameSpan) userNameSpan.textContent = userProfile.given_name || userProfile.name;
    
    if (saveToDriveBtn) {
        saveToDriveBtn.disabled = false;
        saveToDriveBtn.title = "Lưu file .tex lên Google Drive";
    }
}

function updateUIOnLogout() {
    const signInBtnContainer = document.getElementById('google-signin-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const saveToDriveBtn = document.getElementById('save-to-drive-btn');

    if (signInBtnContainer) signInBtnContainer.style.display = 'block';
    if (userProfileDiv) userProfileDiv.style.display = 'none';
    
    if (saveToDriveBtn) {
        saveToDriveBtn.disabled = true;
        saveToDriveBtn.title = "Vui lòng đăng nhập để lưu";
    }
}

// --- CÁC HÀM TƯƠNG TÁC VỚI GOOGLE API ---

function handleSignInResponse(response) {
    const userProfile = parseJwt(response.credential);
    if (!userProfile || !userProfile.email) {
        Swal.fire('Lỗi Đăng Nhập', 'Không thể lấy thông tin email.', 'error');
        return;
    }
    const userEmail = userProfile.email.toLowerCase();
    if (AUTHORIZED_EMAILS.includes(userEmail)) {
        console.log(`Access GRANTED for ${userEmail}.`);
        updateUIOnLogin(userProfile);
        console.log("Silently requesting Drive access token...");
        tokenClient.requestAccessToken({ prompt: '' });
    } else {
        console.warn(`Access DENIED for ${userEmail}.`);
        Swal.fire({ icon: 'error', title: 'Truy cập bị từ chối', html: `Tài khoản <strong>${userProfile.email}</strong> không có quyền sử dụng tính năng này.` });
        handleSignOut();
    }
}

function handleSignOut() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
        const token = gapi.client.getToken();
        if (token) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                console.log('Access token revoked.');
            });
            gapi.client.setToken(null);
        }
    }
    updateUIOnLogout();
}

async function handleSaveClick() {
    // Kiểm tra các điều kiện tiên quyết trước khi mở Picker
    if (!gapi.client.getToken()) {
        Swal.fire('Chưa đăng nhập', "Bạn cần đăng nhập để lưu file vào Google Drive.", 'info');
        return;
    }
    if (!pickerApiLoaded) {
        Swal.fire('Vui lòng đợi', 'API để chọn thư mục chưa sẵn sàng. Vui lòng thử lại sau giây lát.', 'warning');
        return;
    }
    showFolderPicker();
}

function showFolderPicker() {
    const accessToken = gapi.client.getToken().access_token;
    if (!accessToken) {
        Swal.fire('Lỗi', 'Không tìm thấy token xác thực. Vui lòng thử đăng nhập lại.', 'error');
        return;
    }

    const appId = GOOGLE_CLIENT_ID.split('-')[0];
    const view = new google.picker.View(google.picker.ViewId.FOLDERS);
    view.setMimeTypes("application/vnd.google-apps.folder");

    const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setAppId(appId)
        .setOAuthToken(accessToken)
        .addView(view)
        .setTitle("Chọn thư mục để lưu file")
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
}

async function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const folder = data.docs[0];
        const folderId = folder.id;
        console.log(`User selected folder ID: ${folderId}`);
        await uploadCurrentFileToDrive(folderId);
    } else if (data.action === google.picker.Action.CANCEL) {
        console.log("User cancelled the folder selection.");
    }
}

// --- CÁC HÀM LÀM VIỆC VỚI GOOGLE DRIVE ---

async function uploadCurrentFileToDrive(folderId) {
    const fileName = getCurrentFileNameRef() || 'untitled.tex';
    const fileContent = editorInstanceRef.getValue();

    if (!fileContent.trim()) {
        Swal.fire({ icon: 'warning', title: 'Tệp rỗng', text: 'Không có nội dung để lưu.' });
        return;
    }

    Swal.fire({
        title: 'Đang lưu lên Google Drive...',
        text: `Chuẩn bị tải lên tệp ${fileName}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        if (!gapiReady) {
            throw new Error("GAPI client is not ready.");
        }
        Swal.update({ text: `Đang tải tệp ${fileName} lên thư mục đã chọn...` });

        const metadata = { name: fileName, mimeType: 'text/x-tex', parents: [folderId] };
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;
        const multipartRequestBody = `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: text/plain\r\n\r\n${fileContent}${close_delim}`;
        
        const response = await gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
            body: multipartRequestBody
        });
        
        Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            html: `Đã lưu tệp <strong>${response.result.name}</strong>. <br><br> <a href="https://drive.google.com/file/d/${response.result.id}/view" target="_blank" class="swal2-confirm swal2-styled">Mở trên Drive</a>`,
            showConfirmButton: false,
            timer: 5000
        });

    } catch (err) {
        console.error("Error uploading file to Drive:", err);
        const errorMessage = err.result?.error?.message || err.message || 'Lỗi không xác định.';
        Swal.fire('Tải lên thất bại', `Chi tiết: ${errorMessage}`, 'error');
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT:", e);
        return null;
    }
}

// --- KHỞI TẠO MODULE ---

function onGoogleScriptLoad() {
    // 1. Khởi tạo GSI (Đăng nhập) trước tiên
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleSignInResponse,
        auto_select: true
    });
    google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: "outline", size: "large", text: "signin_with", shape: "rectangular" }
    );
    google.accounts.id.prompt();

    // 2. Tải GAPI (Drive, Picker)
    gapi.load('client:picker', initializeGapiClient);
}

async function initializeGapiClient() {
    // 3. Khởi tạo GAPI client
    await gapi.client.init({}).then(() => {
        gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        gapiReady = true;
        pickerApiLoaded = true; // GAPI và Picker được tải cùng lúc
        console.log("GAPI Client and Picker API are ready.");
    });
    
    // 4. Khởi tạo Token Client (để lấy access token ngầm)
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_API_SCOPES,
        prompt: '',
        callback: (tokenResponse) => {
            if (tokenResponse.error) {
                console.error("Token Error:", tokenResponse);
            } else {
                console.log("Access Token granted/refreshed successfully.");
            }
        },
    });
}

function initializeDriveIntegration(editor, getCurrentFileName) {
    editorInstanceRef = editor;
    getCurrentFileNameRef = getCurrentFileName;
    const signOutBtn = document.getElementById('google-signout-btn');
    if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);
    
    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    if (saveToDriveBtn) {
        saveToDriveBtn.addEventListener('click', handleSaveClick);
        saveToDriveBtn.disabled = true;
        saveToDriveBtn.title = "Vui lòng đăng nhập để lưu";
    }
    console.log("Drive Integration Module Initialized.");
}