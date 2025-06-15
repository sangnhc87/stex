/**
 * ====================================================================
 *  DRIVE INTEGRATION MODULE - PHIÊN BẢN 9.0 (FINAL)
 * ====================================================================
 * - Phiên bản hoàn chỉnh và ổn định nhất, gộp chức năng Lưu và Tải.
 * - Lưu file: Cho phép chọn thư mục và hỏi để ghi đè nếu file đã tồn tại.
 * - Tải file: Cho phép chọn file .tex từ toàn bộ Drive.
 * - Yêu cầu cấu hình đầy đủ: Bật API, Scope, Origin và Header COOP.
 */

// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive'; // Quyền truy cập đầy đủ
const AUTHORIZED_EMAILS = ['nguyensangnhc@gmail.com']; // Cập nhật email của bạn ở đây

let gapiReady = false;
let pickerApiLoaded = false;
let tokenClient;
let editorInstanceRef;
let getCurrentFileNameRef;
let loadFileContentRef;

// --- CÁC HÀM XỬ LÝ GIAO DIỆN (UI) ---
function updateUIOnLogin(userProfile) {
    const signInBtnContainer = document.getElementById('google-signin-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const driveActionBtn = document.getElementById('drive-action-btn');

    if (signInBtnContainer) signInBtnContainer.style.display = 'none';
    if (userProfileDiv) {
        userProfileDiv.style.display = 'flex';
        document.getElementById('user-avatar').src = userProfile.picture;
        document.getElementById('user-name').textContent = userProfile.given_name || userProfile.name;
    }
    if (driveActionBtn) {
        driveActionBtn.disabled = false;
        driveActionBtn.title = "Tương tác với Google Drive";
    }
}

function updateUIOnLogout() {
    const signInBtnContainer = document.getElementById('google-signin-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const driveActionBtn = document.getElementById('drive-action-btn');

    if (signInBtnContainer) signInBtnContainer.style.display = 'block';
    if (userProfileDiv) userProfileDiv.style.display = 'none';
    if (driveActionBtn) {
        driveActionBtn.disabled = true;
        driveActionBtn.title = "Vui lòng đăng nhập để sử dụng";
    }
}

// --- LOGIC CHÍNH ---
async function handleDriveActionClick() {
    if (!gapi.client.getToken() || !pickerApiLoaded) {
        return Swal.fire('Vui lòng đợi', 'Chức năng Google Drive chưa sẵn sàng hoặc bạn chưa đăng nhập.', 'warning');
    }

    const { value: action } = await Swal.fire({
        title: 'Google Drive',
        text: 'Bạn muốn làm gì?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#4CAF50',
        confirmButtonText: '<i class="fas fa-cloud-download-alt"></i> Tải file',
        cancelButtonText: '<i class="fas fa-save"></i> Lưu file',
    });
    
    if (action) { // Người dùng chọn "Tải file"
        showFilePicker();
    } else if (action === null) { // Người dùng chọn "Lưu file"
        showFolderPicker();
    }
}

// --- LOGIC LƯU FILE ---
function showFolderPicker() {
    const accessToken = gapi.client.getToken().access_token;
    const view = new google.picker.View(google.picker.ViewId.FOLDERS);
    const picker = new google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
        .addView(view)
        .setTitle("Chọn thư mục để lưu")
        .setCallback(savePickerCallback)
        .build();
    picker.setVisible(true);
}

async function savePickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const folderId = data.docs[0].id;
        const currentFileName = getCurrentFileNameRef() || 'untitled.tex';

        const { value: newFileName } = await Swal.fire({
            title: 'Đặt tên file để lưu',
            input: 'text',
            inputValue: currentFileName,
            showCancelButton: true,
            confirmButtonText: 'Lưu',
            inputValidator: value => !value || !value.trim() ? 'Tên file không được để trống!' : null
        });
        if (newFileName) await uploadFileToDrive(folderId, newFileName.trim());
    }
}

async function uploadFileToDrive(folderId, fileName) {
    const fileContent = editorInstanceRef.getValue();
    if (!fileContent.trim()) return Swal.fire({ icon: 'warning', title: 'Tệp rỗng', text: 'Không có nội dung để lưu.' });

    Swal.fire({ title: 'Đang xử lý...', text: `Kiểm tra file trên Drive...`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const query = `'${folderId}' in parents and name='${fileName}' and trashed=false`;
        const existingFileResponse = await gapi.client.drive.files.list({ q: query, fields: 'files(id)' });
        
        let fileIdToUpdate = null;
        if (existingFileResponse.result.files && existingFileResponse.result.files.length > 0) {
            fileIdToUpdate = existingFileResponse.result.files[0].id;
            const result = await Swal.fire({
                title: 'File đã tồn tại', text: `File "${fileName}" đã có. Bạn có muốn ghi đè lên nó không?`,
                icon: 'warning', showCancelButton: true, confirmButtonText: 'Ghi đè', cancelButtonText: 'Hủy'
            });
            if (!result.isConfirmed) {
                Swal.fire('Đã hủy', 'Hành động lưu file đã bị hủy.', 'info');
                return;
            }
        }
        
        Swal.update({ title: 'Đang lưu...', text: fileIdToUpdate ? `Đang ghi đè file ${fileName}...` : `Đang tạo file mới ${fileName}...`});

        const metadata = { name: fileName, mimeType: 'text/x-tex', parents: fileIdToUpdate ? undefined : [folderId] };
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;
        
        const path = fileIdToUpdate ? `/upload/drive/v3/files/${fileIdToUpdate}?uploadType=multipart` : '/upload/drive/v3/files?uploadType=multipart';
        const method = fileIdToUpdate ? 'PATCH' : 'POST';
        
        const multipartRequestBody = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: text/plain; charset=UTF-8\r\n\r\n${fileContent}${close_delim}`;
        
        const response = await gapi.client.request({ path, method, body: multipartRequestBody, headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` } });

        Swal.fire({ icon: 'success', title: 'Thành công!', html: `Đã lưu tệp <strong>${response.result.name}</strong>. <br><br> <a href="https://drive.google.com/file/d/${response.result.id}/view" target="_blank" class="swal2-confirm swal2-styled">Mở trên Drive</a>`, showConfirmButton: false, timer: 5000 });
    } catch (err) {
        Swal.fire('Lưu file thất bại', `Chi tiết: ${err.result?.error?.message || err.message}`, 'error');
    }
}

// --- LOGIC TẢI FILE ---
function showFilePicker() {
    const accessToken = gapi.client.getToken().access_token;
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("text/x-tex,text/plain,application/x-tex");
    const picker = new google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
        .addView(view)
        .setTitle("Chọn một file .tex để tải")
        .setCallback(loadFilePickerCallback)
        .build();
    picker.setVisible(true);
}

async function loadFilePickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const file = data.docs[0];
        Swal.fire({ title: 'Đang tải file...', text: `Đang tải nội dung từ file "${file.name}"`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const response = await gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
            if (loadFileContentRef) loadFileContentRef(file.name, response.body);
            else throw new Error("Không thể tải file vào trình soạn thảo.");
            Swal.close();
        } catch (err) {
            Swal.fire('Tải file thất bại', `Chi tiết: ${err.message}`, 'error');
        }
    }
}

// --- KHỞI TẠO VÀ CÁC HÀM HELPER ---
function parseJwt(e){try{const t=e.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"),n=decodeURIComponent(atob(t).split("").map(o=>"%"+("00"+o.charCodeAt(0).toString(16)).slice(-2)).join(""));return JSON.parse(n)}catch(t){return console.error("Error decoding JWT:",t),null}}
function handleSignInResponse(e){const t=parseJwt(e.credential);if(!t||!t.email)return void Swal.fire("Lỗi Đăng Nhập","Không thể lấy thông tin email.","error");const n=t.email.toLowerCase();AUTHORIZED_EMAILS.includes(n)?(updateUIOnLogin(t),tokenClient.requestAccessToken({prompt:""})):(Swal.fire({icon:"error",title:"Truy cập bị từ chối",html:`Tài khoản <strong>${t.email}</strong> không có quyền truy cập.`}),handleSignOut())}
function handleSignOut(){"undefined"!=typeof google&&google.accounts&&google.accounts.id.disableAutoSelect();const e=gapi.client.getToken();e&&google.accounts.oauth2.revoke(e.access_token,()=>console.log("Access token revoked.")),gapi.client.setToken(null),updateUIOnLogout()}
function onGoogleScriptLoad(){google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:handleSignInResponse,auto_select:!0}),google.accounts.id.renderButton(document.getElementById("google-signin-btn"),{theme:"outline",size:"large"}),google.accounts.id.prompt(),gapi.load("client:picker",initializeGapiClient)}
async function initializeGapiClient(){await gapi.client.init({}),await gapi.client.load("https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"),gapiReady=!0,pickerApiLoaded=!0,console.log("GAPI Client and Picker API are ready."),tokenClient=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:GOOGLE_API_SCOPES,prompt:"",callback:e=>{e.error?console.error("Token Error:",e):console.log("Access Token granted/refreshed successfully.")}})}
function initializeDriveIntegration(e,t,n){editorInstanceRef=e,getCurrentFileNameRef=t,loadFileContentRef=n;const o=document.getElementById("drive-action-btn");o&&o.addEventListener("click",handleDriveActionClick),document.getElementById("google-signout-btn")?.addEventListener("click",handleSignOut),updateUIOnLogout(),console.log("Drive Integration Module Initialized.")}