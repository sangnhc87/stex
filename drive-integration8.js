/**
 * ====================================================================
 *  DRIVE INTEGRATION MODULE - PHIÊN BẢN 4.1 (Nâng cao)
 * ====================================================================
 * - Quay lại luồng gốc: Lưu vào một thư mục cố định.
 * - Thêm tính năng: Cho phép người dùng đặt tên file trước khi lưu.
 * - Tự động xử lý file trùng lặp bằng cách thêm timestamp.
 * - Tác giả nâng cấp: AI Assistant (dựa trên code của Nguyễn Văn Sang)
 */

// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive.file'; // Chỉ cần quyền drive.file
const GOOGLE_DRIVE_FOLDER_NAME = 'Dự án LaTeX từ Editor';

// QUAN TRỌNG: Cập nhật danh sách email của bạn và đồng nghiệp ở đây!
const AUTHORIZED_EMAILS = [
    'nguyensangnhc@gmail.com',    // Email của bạn
    // 'dongnghiep1@example.com',
    // 'dongnghiep2@example.com'
];

let gapiReady = false;
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
        Swal.fire({ icon: 'error', title: 'Truy cập bị từ chối', html: `Tài khoản <strong>${userProfile.email}</strong> không có quyền truy cập.` });
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

/**
 * NÂNG CẤP: Hỏi người dùng tên file trước khi lưu.
 */
async function handleSaveClick() {
    if (!gapi.client.getToken()) {
        Swal.fire('Chưa đăng nhập', "Bạn cần đăng nhập để lưu file.", 'info');
        return;
    }
    
    const currentFileName = getCurrentFileNameRef() || 'untitled.tex';

    const { value: newFileName } = await Swal.fire({
        title: 'Đặt tên file để lưu',
        input: 'text',
        inputValue: currentFileName,
        showCancelButton: true,
        confirmButtonText: 'Lưu vào Drive',
        cancelButtonText: 'Hủy',
        inputValidator: (value) => {
            if (!value || !value.trim()) {
                return 'Tên file không được để trống!'
            }
        }
    });

    if (newFileName) {
        // Nếu người dùng nhấn "Lưu", gọi hàm upload với tên file mới
        await uploadCurrentFileToDrive(newFileName.trim());
    }
}

// --- CÁC HÀM LÀM VIỆC VỚI GOOGLE DRIVE ---

/**
 * Tìm hoặc tạo thư mục lưu trữ trên Drive.
 * @returns {Promise<string>} ID của thư mục.
 */
async function getOrCreateFolderId() {
    const query = `mimeType='application/vnd.google-apps.folder' and name='${GOOGLE_DRIVE_FOLDER_NAME}' and trashed=false`;
    const searchResponse = await gapi.client.drive.files.list({ q: query, fields: 'files(id)' });

    if (searchResponse.result.files && searchResponse.result.files.length > 0) {
        console.log(`Found folder '${GOOGLE_DRIVE_FOLDER_NAME}' with ID: ${searchResponse.result.files[0].id}`);
        return searchResponse.result.files[0].id;
    } else {
        console.log(`Folder '${GOOGLE_DRIVE_FOLDER_NAME}' not found, creating a new one...`);
        const createResponse = await gapi.client.drive.files.create({
            resource: {
                name: GOOGLE_DRIVE_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            },
            fields: 'id'
        });
        console.log(`Created new folder with ID: ${createResponse.result.id}`);
        return createResponse.result.id;
    }
}

/**
 * NÂNG CẤP: Tải file lên Drive, có xử lý trùng lặp.
 * @param {string} fileName Tên file do người dùng đặt.
 */
async function uploadCurrentFileToDrive(fileName) {
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

        // 1. Lấy ID của thư mục đích
        const folderId = await getOrCreateFolderId();

        // 2. NÂNG CẤP: Kiểm tra xem file có tên tương tự đã tồn tại chưa
        let finalFileName = fileName;
        const checkQuery = `'${folderId}' in parents and name='${fileName}' and trashed=false`;
        const checkResponse = await gapi.client.drive.files.list({ q: checkQuery, fields: 'files(id)' });

        if (checkResponse.result.files && checkResponse.result.files.length > 0) {
            // Nếu file đã tồn tại, thêm timestamp vào tên
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
            const nameWithoutExt = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
            const extension = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
            finalFileName = `${nameWithoutExt}-${timestamp}${extension}`;
            console.log(`File '${fileName}' exists. Renaming to '${finalFileName}' to avoid conflict.`);
            Swal.update({ text: `File đã tồn tại. Đang lưu với tên mới: ${finalFileName}` });
        } else {
             Swal.update({text: `Đang tải tệp ${fileName} vào thư mục '${GOOGLE_DRIVE_FOLDER_NAME}'...`});
        }

        // 3. Chuẩn bị và tải file lên
        const metadata = { name: finalFileName, mimeType: 'text/x-tex', parents: [folderId] };
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
    gapi.load('client', async () => {
        await gapi.client.init({});
        await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        gapiReady = true;
        console.log("GAPI client for Drive V3 is ready.");

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

        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleSignInResponse,
            auto_select: true
        });

        google.accounts.id.renderButton(
            document.getElementById('google-signin-btn'),
            { theme: "outline", size: "large" }
        );

        google.accounts.id.prompt();
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