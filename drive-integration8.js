/**
 * ====================================================================
 *  DRIVE INTEGRATION MODULE - PHIÊN BẢN 5.0 (Hỗ trợ Chọn Thư Mục)
 * ====================================================================
 * - Tích hợp Google Picker API để người dùng có thể chọn thư mục lưu file.
 * - Giữ nguyên cơ chế chống pop-up cấp quyền khi tải lại trang.
 * - Tác giả nâng cấp: AI Assistant (dựa trên code của Nguyễn Văn Sang)
 */

// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive';

// QUAN TRỌNG: Hãy cập nhật danh sách email của bạn và đồng nghiệp ở đây!
const AUTHORIZED_EMAILS = [
    'nguyensangnhc@gmail.com',    // Email của bạn
    'dongnghiep1@example.com',   // Email đồng nghiệp 1
    'dongnghiep2@example.com'    // Email đồng nghiệp 2
];

let gapiReady = false;
let pickerApiLoaded = false; // Biến cờ để kiểm tra Picker API đã sẵn sàng chưa
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

/**
 * Xử lý thông tin trả về sau khi đăng nhập thành công.
 */
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
        
        // Tự động và âm thầm xin quyền truy cập Drive để tránh pop-up khi reload.
        console.log("Silently requesting Drive access token...");
        tokenClient.requestAccessToken({ prompt: '' });
    } else {
        console.warn(`Access DENIED for ${userEmail}.`);
        Swal.fire({ icon: 'error', title: 'Truy cập bị từ chối', html: `Tài khoản <strong>${userProfile.email}</strong> không có quyền sử dụng tính năng này.` });
        handleSignOut();
    }
}

/**
 * Xử lý đăng xuất, thu hồi token.
 */
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

/**
 * Hàm được gọi khi nhấn "Lưu vào Drive".
 * Sẽ hiển thị cửa sổ chọn thư mục thay vì lưu ngay.
 */
async function handleSaveClick() {
    if (!gapi.client.getToken()) {
        Swal.fire({
            title: 'Chưa đăng nhập',
            text: "Bạn cần đăng nhập để có thể lưu file vào Google Drive.",
            icon: 'info'
        });
        return;
    }

    if (pickerApiLoaded) {
        showFolderPicker();
    } else {
        Swal.fire('Vui lòng đợi', 'API để chọn thư mục đang được tải, vui lòng thử lại sau giây lát.', 'warning');
    }
}

/**
 * Hiển thị cửa sổ chọn thư mục của Google (Google Picker).
 */
function showFolderPicker() {
    const accessToken = gapi.client.getToken().access_token;
    const appId = GOOGLE_CLIENT_ID.split('-')[0]; // App ID là phần số ở đầu của Client ID

    const view = new google.picker.View(google.picker.ViewId.FOLDERS);
    view.setMimeTypes("application/vnd.google-apps.folder"); // Chỉ cho phép chọn thư mục
    view.setSelectFolderEnabled(true); // Đảm bảo nút "Select" hiện ra cho thư mục

    const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setAppId(appId)
        .setOAuthToken(accessToken)
        .addView(view)
        .setTitle("Chọn thư mục để lưu file LaTeX")
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
}

/**
 * Hàm được gọi sau khi người dùng chọn một thư mục trong Picker.
 * @param {object} data Dữ liệu trả về từ Picker API.
 */
async function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const folder = data.docs[0];
        const folderId = folder.id;
        const folderName = folder.name;
        
        console.log(`User selected folder: '${folderName}' (ID: ${folderId})`);

        // Sau khi có folderId, gọi hàm upload với ID của thư mục đó
        await uploadCurrentFileToDrive(folderId);
    } else if (data.action === google.picker.Action.CANCEL) {
        console.log("User cancelled the folder selection.");
    }
}


// --- CÁC HÀM LÀM VIỆC VỚI GOOGLE DRIVE ---

/**
 * Tải file hiện tại lên một thư mục cụ thể trên Google Drive.
 * @param {string} folderId ID của thư mục cha để tải file lên.
 */
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
            throw new Error("GAPI client is not ready yet.");
        }

        Swal.update({ text: `Đang tải tệp ${fileName} lên thư mục đã chọn...` });

        const metadata = {
            name: fileName,
            mimeType: 'text/x-tex',
            parents: [folderId] // <-- Sử dụng ID thư mục người dùng đã chọn
        };

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

/**
 * Giải mã một JWT token để lấy thông tin user profile.
 * @param {string} token 
 * @returns {object|null}
 */
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

/**
 * Hàm được gọi khi các script của Google đã tải xong.
 */
function onGoogleScriptLoad() {
    // Tải cả client (cho Drive API) và picker (cho cửa sổ chọn file/folder)
    gapi.load('client:picker', async () => {
        // Khởi tạo client
        await gapi.client.init({});
        await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        gapiReady = true;
        
        // Đánh dấu Picker API đã sẵn sàng
        pickerApiLoaded = true;
        console.log("GAPI client and Picker API are ready.");

        // Khởi tạo Token Client để quản lý access token
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_API_SCOPES,
            prompt: '', // Để trống để không hiện pop-up khi có thể lấy token ngầm
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    console.error("Token Error:", tokenResponse);
                } else {
                    console.log("Access Token granted/refreshed successfully.");
                }
            },
        });

        // Khởi tạo Google Identity Services (GSI) cho nút đăng nhập
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleSignInResponse,
            auto_select: true // Tự động chọn tài khoản nếu người dùng đã đăng nhập trước đó
        });

        // Vẽ nút đăng nhập của Google
        google.accounts.id.renderButton(
            document.getElementById('google-signin-btn'),
            { theme: "outline", size: "large", text: "signin_with", shape: "rectangular" }
        );

        // Hiển thị pop-up đăng nhập nếu cần
        google.accounts.id.prompt();
    });
}

/**
 * Hàm khởi tạo chính của module, được gọi từ app6.js
 * @param {object} editor - Thể hiện của Ace Editor.
 * @param {function} getCurrentFileName - Hàm trả về tên file đang mở.
 */
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