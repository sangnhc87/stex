
// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive';
const GOOGLE_DRIVE_FOLDER_NAME = 'Dự án LaTeX từ Editor';

// === DANH SÁCH EMAIL ĐƯỢC CẤP PHÉP TRUY CẬP ===
const AUTHORIZED_EMAILS = [
    'nguyensangnhc@gmail.com', // Thay bằng email của bạn
    'dongnghiep1@example.com',   // Thay bằng email đồng nghiệp
    'taikhoanphu@gmail.com'        // Thay bằng email khác
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

/**
 * Xử lý thông tin trả về sau khi đăng nhập, CÓ KIỂM TRA QUYỀN.
 */
function handleSignInResponse(response) {
    const userProfile = parseJwt(response.credential);
    if (!userProfile || !userProfile.email) {
        console.error("Failed to parse JWT or email not found in profile.");
        Swal.fire('Lỗi Đăng Nhập', 'Không thể lấy được thông tin email từ tài khoản của bạn.', 'error');
        return;
    }

    const userEmail = userProfile.email.toLowerCase();
    console.log(`User attempting to sign in: ${userEmail}`);

    if (AUTHORIZED_EMAILS.includes(userEmail)) {
        console.log(`Access GRANTED for ${userEmail}.`);
        updateUIOnLogin(userProfile);
    } else {
        console.warn(`Access DENIED for ${userEmail}. Not in the authorized list.`);
        Swal.fire({ icon: 'error', title: 'Truy cập bị từ chối', html: `Tài khoản email <strong>${userProfile.email}</strong> không có quyền truy cập ứng dụng này.` });
        handleSignOut();
    }
}

function handleSignOut() {
    if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
    if (typeof gapi !== 'undefined' && gapi.client) gapi.client.setToken(null);
    console.log("User signed out.");
    updateUIOnLogout();
}

async function handleSaveClick() {
    if (!gapi.client.getToken()) {
        tokenClient.callback = async (resp) => {
            if (resp.error) {
                Swal.fire('Lỗi', `Không thể lấy quyền truy cập Google Drive. Chi tiết: ${resp.error}`, 'error');
                return;
            }
            await uploadCurrentFileToDrive();
        };
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        await uploadCurrentFileToDrive();
    }
}

// --- CÁC HÀM LÀM VIỆC VỚI GOOGLE DRIVE (Giữ nguyên) ---

async function getOrCreateFolderId() { /* ... */ }
async function uploadCurrentFileToDrive() { /* ... */ }
function parseJwt(token) { /* ... */ }

// --- KHỞI TẠO MODULE ---

function onGoogleScriptLoad() {
    gapi.load('client', async () => {
        await gapi.client.init({});
        await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        gapiReady = true;
        console.log("GAPI client for Drive V3 is ready.");

        tokenClient = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: GOOGLE_API_SCOPES, callback: '' });
        
        // Khởi tạo và render nút đăng nhập mặc định của Google
        google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleSignInResponse });
        google.accounts.id.renderButton(
            document.getElementById('google-signin-btn'),
            { theme: "outline", size: "large", text: "signin_with", shape: "rectangular" } 
        );
        
        google.accounts.id.prompt(); // Vẫn giữ One-Tap prompt
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
    console.log("Drive Integration Module has been initialized.");
}

// === Dán lại các hàm đã bị lược bỏ để code đầy đủ ===
async function getOrCreateFolderId() {const searchResponse = await gapi.client.drive.files.list({ q: `mimeType='application/vnd.google-apps.folder' and name='${GOOGLE_DRIVE_FOLDER_NAME}' and trashed=false`, fields: 'files(id)' }); if (searchResponse.result.files && searchResponse.result.files.length > 0) { return searchResponse.result.files[0].id; } const createResponse = await gapi.client.drive.files.create({ resource: { name: GOOGLE_DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }, fields: 'id' }); return createResponse.result.id; }
async function uploadCurrentFileToDrive() {const fileName = getCurrentFileNameRef() || 'untitled.tex'; const fileContent = editorInstanceRef.getValue(); if (!fileContent.trim()) { Swal.fire({ icon: 'warning', title: 'Tệp rỗng', text: 'Không có nội dung để lưu.' }); return; } Swal.fire({ title: 'Đang lưu lên Google Drive...', text: `Đang chuẩn bị tải lên tệp ${fileName}`, allowOutsideClick: false, didOpen: () => Swal.showLoading() }); try { if (!gapiReady) throw new Error("GAPI client is not ready yet."); const folderId = await getOrCreateFolderId(); Swal.update({ text: `Đang tải tệp ${fileName} vào thư mục '${GOOGLE_DRIVE_FOLDER_NAME}'...` }); const metadata = { name: fileName, mimeType: 'text/x-tex', parents: [folderId] }; const boundary = '-------314159265358979323846'; const delimiter = `\r\n--${boundary}\r\n`; const close_delim = `\r\n--${boundary}--`; const multipartRequestBody = `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: text/plain\r\n\r\n${fileContent}${close_delim}`; const response = await gapi.client.request({ path: '/upload/drive/v3/files', method: 'POST', params: { uploadType: 'multipart' }, headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` }, body: multipartRequestBody }); Swal.fire({ icon: 'success', title: 'Thành công!', html: `Đã lưu tệp <strong>${response.result.name}</strong>. <br><br> <a href="https://drive.google.com/file/d/${response.result.id}/view" target="_blank" class="swal2-confirm swal2-styled">Mở trên Drive</a>`, showConfirmButton: false, timer: 5000 }); } catch (err) { console.error("Error uploading file to Drive:", err); Swal.fire('Tải lên thất bại', `Chi tiết: ${err.result?.error?.message || err.message || 'Lỗi không xác định.'}`, 'error'); }}
function parseJwt(token) { try { const base64Url = token.split('.')[1]; const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')); return JSON.parse(jsonPayload); } catch (e) { console.error("Error decoding JWT:", e); return null; } }