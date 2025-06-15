/**
 * ====================================================================
 *  DRIVE INTEGRATION MODULE - PHIÊN BẢN 6.0 (FINAL - Dùng TokenClient)
 * ====================================================================
 * Đây là phiên bản cuối cùng, sử dụng phương pháp initTokenClient ổn định nhất
 * để giải quyết vấn đề pop-up sau khi reload trang.
 */

// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive';
const GOOGLE_DRIVE_FOLDER_NAME_DEFAULT = 'Dự án LaTeX từ Editor';

const AUTHORIZED_EMAILS = [
    'nguyenvansang@example.com', // Thay bằng email của bạn
    'dongnghiep1@example.com',   // Thay bằng email đồng nghiệp
    'nguyensangnhc@gmail.com'    // Email của bạn đã được thêm
];

let gapiReady = false;
let pickerApiReady = false;
let userProfile = null;
let tokenClient;
let editorInstanceRef; 
let getCurrentFileNameRef;

let selectedDriveFolder = { id: null, name: null };

// --- CÁC HÀM XỬ LÝ GIAO DIỆN (UI) ---

function updateUIOnLogin(profile) {
    userProfile = profile;
    const signInBtnContainer = document.getElementById('google-signin-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const userAvatarImg = document.getElementById('user-avatar');
    const userNameSpan = document.getElementById('user-name');
    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    const changeFolderBtn = document.getElementById('change-drive-folder-btn');

    if (signInBtnContainer) signInBtnContainer.style.display = 'none';
    if (userProfileDiv) userProfileDiv.style.display = 'flex';
    if (userAvatarImg) userAvatarImg.src = profile.picture;
    if (userNameSpan) userNameSpan.textContent = profile.given_name || profile.name;
    
    if (saveToDriveBtn) saveToDriveBtn.disabled = false;
    if (changeFolderBtn) changeFolderBtn.disabled = false;
    
    loadSelectedFolder();
}

function updateUIOnLogout() {
    userProfile = null;
    const signInBtnContainer = document.getElementById('google-signin-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    const changeFolderBtn = document.getElementById('change-drive-folder-btn');

    if (signInBtnContainer) signInBtnContainer.style.display = 'block';
    if (userProfileDiv) userProfileDiv.style.display = 'none';
    
    if (saveToDriveBtn) saveToDriveBtn.disabled = true;
    if (changeFolderBtn) changeFolderBtn.disabled = true;
    
    updateFolderDisplay(null);
}

function updateFolderDisplay(folder) {
    const changeFolderBtn = document.getElementById('change-drive-folder-btn');
    if (!changeFolderBtn) return;
    if (folder && folder.name) {
        changeFolderBtn.title = `Đang lưu vào: ${folder.name}\n(Nhấn để đổi)`;
    } else {
        changeFolderBtn.title = 'Thay đổi thư mục lưu trên Drive';
    }
}

function loadSelectedFolder() {
    const savedFolder = localStorage.getItem('latexEditor_driveFolder');
    if (savedFolder) {
        selectedDriveFolder = JSON.parse(savedFolder);
        updateFolderDisplay(selectedDriveFolder);
    }
}

// --- CÁC HÀM TƯƠNG TÁC VỚI GOOGLE API ---

function handleSignInResponse(response) {
    const profile = parseJwt(response.credential);
    if (!profile || !profile.email) {
        Swal.fire('Lỗi Đăng Nhập', 'Không thể lấy thông tin email.', 'error');
        return;
    }
    const userEmail = profile.email.toLowerCase();
    if (AUTHORIZED_EMAILS.includes(userEmail)) {
        console.log(`Access GRANTED for ${userEmail}.`);
        updateUIOnLogin(profile);
    } else {
        Swal.fire({ icon: 'error', title: 'Truy cập bị từ chối', html: `Tài khoản <strong>${profile.email}</strong> không có quyền truy cập.` });
        handleSignOut();
    }
}

function handleSignOut() {
    if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
    const token = gapi.client.getToken();
    if (token) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            console.log('Access token revoked.');
        });
        gapi.client.setToken(null);
    }
    localStorage.removeItem('latexEditor_driveFolder');
    updateUIOnLogout();
}

async function handleSaveClick() {
    if (!userProfile) {
        Swal.fire('Chưa đăng nhập', 'Vui lòng đăng nhập trước khi lưu.', 'info');
        return;
    }
    tokenClient.callback = async (resp) => {
        if (resp.error) {
            Swal.fire('Lỗi', `Không thể lấy quyền truy cập Google Drive. Chi tiết: ${resp.error}`, 'error');
            return;
        }
        await uploadCurrentFileToDrive();
    };
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

// --- CÁC HÀM LÀM VIỆC VỚI GOOGLE PICKER ---

function handleChangeFolderClick() {
    if (!pickerApiReady) {
        Swal.fire('Vui lòng đợi', 'Dịch vụ chọn thư mục chưa sẵn sàng.', 'warning');
        return;
    }
    if (!gapi.client.getToken()) {
        Swal.fire({
            title: 'Cần cấp quyền',
            text: 'Bạn cần cấp quyền truy cập Drive trước khi chọn thư mục.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Cấp quyền ngay'
        }).then(result => {
            if (result.isConfirmed) {
                tokenClient.callback = (resp) => {
                    if (!resp.error) createPicker();
                };
                tokenClient.requestAccessToken({ prompt: 'consent' });
            }
        });
    } else {
        createPicker();
    }
}

function createPicker() {
    const token = gapi.client.getToken();
    if (!token) {
        console.error("Không thể mở Picker vì không có token.");
        return;
    }
    const view = new google.picker.View(google.picker.ViewId.FOLDERS)
        .setMimeTypes('application/vnd.google-apps.folder');
    const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
        .setOAuthToken(token.access_token)
        .addView(view)
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
}

function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const folder = data.docs[0];
        selectedDriveFolder = { id: folder.id, name: folder.name };
        localStorage.setItem('latexEditor_driveFolder', JSON.stringify(selectedDriveFolder));
        updateFolderDisplay(selectedDriveFolder);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Sẽ lưu vào: ${folder.name}`, showConfirmButton: false, timer: 2500 });
    }
}

// --- CÁC HÀM LÀM VIỆC VỚI GOOGLE DRIVE ---

async function getTargetFolderId() {
    if (selectedDriveFolder && selectedDriveFolder.id) {
        return selectedDriveFolder.id;
    }
    const searchResponse = await gapi.client.drive.files.list({ q: `mimeType='application/vnd.google-apps.folder' and name='${GOOGLE_DRIVE_FOLDER_NAME_DEFAULT}' and trashed=false`, fields: 'files(id)' });
    if (searchResponse.result.files && searchResponse.result.files.length > 0) {
        return searchResponse.result.files[0].id;
    }
    const createResponse = await gapi.client.drive.files.create({ resource: { name: GOOGLE_DRIVE_FOLDER_NAME_DEFAULT, mimeType: 'application/vnd.google-apps.folder' }, fields: 'id' });
    return createResponse.result.id;
}

async function uploadCurrentFileToDrive() {
    const fileName = getCurrentFileNameRef() || 'untitled.tex';
    const fileContent = editorInstanceRef.getValue();
    if (!fileContent.trim()) {
        Swal.fire({ icon: 'warning', title: 'Tệp rỗng', text: 'Không có nội dung để lưu.' });
        return;
    }
    Swal.fire({ title: 'Đang lưu lên Google Drive...', text: `Đang chuẩn bị tải lên tệp ${fileName}`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        if (!gapiReady) throw new Error("GAPI client is not ready yet.");
        const folderId = await getTargetFolderId();
        const folderName = selectedDriveFolder.name || GOOGLE_DRIVE_FOLDER_NAME_DEFAULT;
        Swal.update({ text: `Đang tải tệp ${fileName} vào thư mục '${folderName}'...` });
        const metadata = { name: fileName, mimeType: 'text/x-tex', parents: [folderId] };
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;
        const multipartRequestBody = `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: text/plain\r\n\r\n${fileContent}${close_delim}`;
        const response = await gapi.client.request({ path: '/upload/drive/v3/files', method: 'POST', params: { uploadType: 'multipart' }, headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` }, body: multipartRequestBody });
        Swal.fire({ icon: 'success', title: 'Thành công!', html: `Đã lưu tệp <strong>${response.result.name}</strong>. <br><br> <a href="https://drive.google.com/file/d/${response.result.id}/view" target="_blank" class="swal2-confirm swal2-styled">Mở trên Drive</a>`, showConfirmButton: false, timer: 5000 });
    } catch (err) {
        console.error("Error uploading file to Drive:", err);
        Swal.fire('Tải lên thất bại', `Chi tiết: ${err.result?.error?.message || err.message || 'Lỗi không xác định.'}`, 'error');
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) { console.error("Error decoding JWT:", e); return null; }
}

// --- KHỞI TẠO MODULE ---

function onGoogleScriptLoad() {
    gapi.load('client:picker', async () => {
        await gapi.client.init({});
        await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        gapiReady = true;
        pickerApiReady = true;
        console.log("GAPI client and Picker API are ready.");

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_API_SCOPES,
            callback: ''
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
    if (saveToDriveBtn) saveToDriveBtn.addEventListener('click', handleSaveClick);
    const changeFolderBtn = document.getElementById('change-drive-folder-btn');
    if (changeFolderBtn) changeFolderBtn.addEventListener('click', handleChangeFolderClick);
    
    if (saveToDriveBtn) saveToDriveBtn.disabled = true;
    if (changeFolderBtn) changeFolderBtn.disabled = true;

    console.log("Drive Integration Module Initialized.");
}