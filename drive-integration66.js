/**
 * ====================================================================
 *  DRIVE INTEGRATION MODULE - PHIÊN BẢN SỬA LỖI GAPI & ORIGIN
 * ====================================================================
 * Phiên bản: 2.1
 * 
 * Thay đổi:
 * - Tách biệt logic tải GSI và GAPI để giải quyết lỗi "gapi is not defined".
 * - GAPI client được tải và khởi tạo bên trong gapi.load callback.
 */

// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive';
const GOOGLE_DRIVE_FOLDER_NAME = 'Dự án LaTeX từ Editor';

let gapiReady = false;
let tokenClient;
let editorInstanceRef; 
let getCurrentFileNameRef;

// --- CÁC HÀM XỬ LÝ GIAO DIỆN (UI) ---
// Giữ nguyên các hàm UI: updateUIOnLogin, updateUIOnLogout

function updateUIOnLogin(userProfile) { /* ... giữ nguyên code cũ ... */ }
function updateUIOnLogout() { /* ... giữ nguyên code cũ ... */ }


// --- CÁC HÀM TƯƠNG TÁC VỚI GOOGLE API ---
// Giữ nguyên các hàm tương tác: handleSignInResponse, handleSignOut, handleCustomSignInClick, handleSaveClick
function handleSignInResponse(response) { /* ... giữ nguyên code cũ ... */ }
function handleSignOut() { /* ... giữ nguyên code cũ ... */ }
function handleCustomSignInClick() { /* ... giữ nguyên code cũ ... */ }
async function handleSaveClick() { /* ... giữ nguyên code cũ ... */ }


// --- CÁC HÀM LÀM VIỆC VỚI GOOGLE DRIVE ---
// Giữ nguyên các hàm Drive: getOrCreateFolderId, uploadCurrentFileToDrive, parseJwt
async function getOrCreateFolderId() { /* ... giữ nguyên code cũ ... */ }
async function uploadCurrentFileToDrive() { /* ... giữ nguyên code cũ ... */ }
function parseJwt(token) { /* ... giữ nguyên code cũ ... */ }


// --- KHỞI TẠO MODULE ---

/**
 * Hàm này được gọi bởi `onload` trên thẻ script của Google trong HTML.
 */
function onGoogleScriptLoad() {
    // 1. Khởi tạo Google Identity Services (GSI) cho việc đăng nhập
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_API_SCOPES,
        callback: '' // Callback sẽ được đặt lại khi cần thiết
    });
    
    // 2. Tải và khởi tạo GAPI client (Drive API)
    // gapi.load sẽ đảm bảo gapi.client có sẵn trước khi thực thi callback
    gapi.load('client', async () => {
        await gapi.client.init({
            // Không cần apiKey và discoveryDocs cho Drive API v3 theo cách này
        });
        await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        gapiReady = true;
        console.log("GAPI client for Drive V3 is ready.");

        // 3. Bây giờ GAPI đã sẵn sàng, ta mới khởi tạo phần đăng nhập UI
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleSignInResponse,
            auto_select: true
        });

        // 4. Hiển thị lời nhắc đăng nhập One-Tap
        google.accounts.id.prompt();
    });
}

/**
 * Hàm này được gọi từ file app.js chính để gán các sự kiện ban đầu.
 */
function initializeDriveIntegration(editor, getCurrentFileName) {
    // Lưu lại tham chiếu đến các đối tượng từ app.js
    editorInstanceRef = editor;
    getCurrentFileNameRef = getCurrentFileName;

    // Gán sự kiện cho các nút trên giao diện
    const customSignInBtn = document.getElementById('custom-google-signin-btn');
    if (customSignInBtn) customSignInBtn.addEventListener('click', handleCustomSignInClick);
    
    const signOutBtn = document.getElementById('google-signout-btn');
    if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);

    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    if (saveToDriveBtn) {
        saveToDriveBtn.addEventListener('click', handleSaveClick);
        saveToDriveBtn.disabled = true;
        saveToDriveBtn.title = "Vui lòng đăng nhập để lưu";
    }

    console.log("Drive Integration Module has been initialized and is waiting for Google scripts to load.");
}

// Dán lại các hàm đã bị lược bỏ ở trên để code đầy đủ
function updateUIOnLogin(userProfile) {const customSignInBtn = document.getElementById('custom-google-signin-btn');const userProfileDiv = document.getElementById('user-profile');const userAvatarImg = document.getElementById('user-avatar');const userNameSpan = document.getElementById('user-name');const saveToDriveBtn = document.getElementById('save-to-drive-btn');if (customSignInBtn) customSignInBtn.style.display = 'none';if (userProfileDiv) userProfileDiv.style.display = 'flex';if (userAvatarImg) userAvatarImg.src = userProfile.picture;if (userNameSpan) userNameSpan.textContent = userProfile.given_name || userProfile.name;if (saveToDriveBtn) {saveToDriveBtn.disabled = false;saveToDriveBtn.title = "Lưu file .tex lên Google Drive";}}
function updateUIOnLogout() {const customSignInBtn = document.getElementById('custom-google-signin-btn');const userProfileDiv = document.getElementById('user-profile');const saveToDriveBtn = document.getElementById('save-to-drive-btn');if (customSignInBtn) customSignInBtn.style.display = 'flex';if (userProfileDiv) userProfileDiv.style.display = 'none';if (saveToDriveBtn) {saveToDriveBtn.disabled = true;saveToDriveBtn.title = "Vui lòng đăng nhập để lưu";}}
function handleSignInResponse(response) {const userProfile = parseJwt(response.credential);if (userProfile) {console.log("Sign-in successful for:", userProfile.name);updateUIOnLogin(userProfile);} else {console.error("Failed to parse JWT from sign-in response.");}}
function handleSignOut() {if (typeof google !== 'undefined') {google.accounts.id.disableAutoSelect();}if (typeof gapi !== 'undefined' && gapi.client) {gapi.client.setToken(null);}console.log("User signed out.");updateUIOnLogout();}
function handleCustomSignInClick() {if (typeof google === 'undefined' || !google.accounts) {Swal.fire('Lỗi', 'Thư viện Google chưa sẵn sàng, vui lòng thử lại sau giây lát.', 'error');return;}google.accounts.id.prompt((notification) => {if (notification.isNotDisplayed() || notification.isSkippedMoment()) {console.warn("Google sign-in pop-up was not displayed.");Swal.fire({icon: 'warning',title: 'Không thể mở cửa sổ đăng nhập',text: 'Vui lòng kiểm tra xem trình duyệt có đang chặn cửa sổ pop-up không và thử lại.',});}});}
async function handleSaveClick() {if (!gapi.client.getToken()) {tokenClient.callback = async (resp) => {if (resp.error) {Swal.fire('Lỗi', `Không thể lấy quyền truy cập Google Drive. Chi tiết: ${resp.error}`, 'error');return;}await uploadCurrentFileToDrive();};tokenClient.requestAccessToken({ prompt: 'consent' });} else {await uploadCurrentFileToDrive();}}
async function getOrCreateFolderId() {const searchResponse = await gapi.client.drive.files.list({q: `mimeType='application/vnd.google-apps.folder' and name='${GOOGLE_DRIVE_FOLDER_NAME}' and trashed=false`,fields: 'files(id)',});if (searchResponse.result.files && searchResponse.result.files.length > 0) {return searchResponse.result.files[0].id;} else {const createResponse = await gapi.client.drive.files.create({resource: { name: GOOGLE_DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },fields: 'id'});return createResponse.result.id;}}
async function uploadCurrentFileToDrive() {const fileName = getCurrentFileNameRef() || 'untitled.tex';const fileContent = editorInstanceRef.getValue();if (!fileContent.trim()) {Swal.fire({ icon: 'warning', title: 'Tệp rỗng', text: 'Không có nội dung để lưu.' });return;}Swal.fire({title: 'Đang lưu lên Google Drive...',text: `Đang chuẩn bị tải lên tệp ${fileName}`,allowOutsideClick: false,didOpen: () => Swal.showLoading()});try {if (!gapiReady) throw new Error("GAPI client is not ready yet.");const folderId = await getOrCreateFolderId();Swal.update({ text: `Đang tải tệp ${fileName} vào thư mục '${GOOGLE_DRIVE_FOLDER_NAME}'...` });const metadata = { name: fileName, mimeType: 'text/x-tex', parents: [folderId] };const boundary = '-------314159265358979323846';const delimiter = `\r\n--${boundary}\r\n`;const close_delim = `\r\n--${boundary}--`;const multipartRequestBody = `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: text/plain\r\n\r\n${fileContent}${close_delim}`;const response = await gapi.client.request({path: '/upload/drive/v3/files', method: 'POST', params: { uploadType: 'multipart' },headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` }, body: multipartRequestBody});const file = response.result;Swal.fire({icon: 'success', title: 'Thành công!',html: `Đã lưu tệp <strong>${file.name}</strong>. <br><br> <a href="https://drive.google.com/file/d/${file.id}/view" target="_blank" class="swal2-confirm swal2-styled">Mở trên Drive</a>`,showConfirmButton: false, timer: 5000});} catch (err) {console.error("Error uploading file to Drive:", err);const errorMessage = err.result?.error?.message || err.message || 'Lỗi không xác định.';Swal.fire('Tải lên thất bại', `Chi tiết: ${errorMessage}`, 'error');}}
function parseJwt(token) {try {const base64Url = token.split('.')[1];const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));return JSON.parse(jsonPayload);} catch (e) {console.error("Error decoding JWT:", e);return null;}}