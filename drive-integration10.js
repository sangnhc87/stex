
// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive'; // Quyền truy cập đầy đủ
const AUTHORIZED_EMAILS = ['nguyensangnhc@gmail.com'];

let gapiReady = false;
let pickerApiLoaded = false;
let tokenClient;
let editorInstanceRef;
let getCurrentFileNameRef;
let loadFileContentRef;

// --- CÁC HÀM UI ---
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
    if (driveActionBtn) driveActionBtn.disabled = false;
}

function updateUIOnLogout() {
    const signInBtnContainer = document.getElementById('google-signin-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const driveActionBtn = document.getElementById('drive-action-btn');

    if (signInBtnContainer) signInBtnContainer.style.display = 'block';
    if (userProfileDiv) userProfileDiv.style.display = 'none';
    if (driveActionBtn) driveActionBtn.disabled = true;
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
        confirmButtonText: '<i class="fas fa-save"></i> Lưu file',
        cancelButtonText: '<i class="fas fa-cloud-download-alt"></i> Tải file',
        reverseButtons: true
    });

    if (action) { // Người dùng chọn "Lưu file"
        showFolderPicker();
    } else if (action === null) {
        // Swal.DismissReason.cancel (hơi ngược, nhưng đó là cách nó hoạt động khi reverseButtons)
        showFilePicker();
    }
}

// --- LOGIC LƯU FILE ---
function showFolderPicker() {
    const accessToken = gapi.client.getToken().access_token;
    const view = new google.picker.View(google.picker.ViewId.FOLDERS);
    view.setMimeTypes("application/vnd.google-apps.folder");

    const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
        .setOAuthToken(accessToken)
        .addView(view)
        .setTitle("Chọn thư mục để lưu file")
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

        if (newFileName) {
            await uploadFileToDrive(folderId, newFileName.trim());
        }
    }
}

async function uploadFileToDrive(folderId, fileName) {
    const fileContent = editorInstanceRef.getValue();
    if (!fileContent.trim()) return Swal.fire({ icon: 'warning', title: 'Tệp rỗng', text: 'Không có nội dung để lưu.' });

    Swal.fire({ title: 'Đang lưu...', text: `Đang chuẩn bị tải lên tệp ${fileName}`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const metadata = { name: fileName, mimeType: 'text/x-tex', parents: [folderId] };
        const existingFile = await gapi.client.drive.files.list({ q: `'${folderId}' in parents and name='${fileName}' and trashed=false`, fields: 'files(id)' });
        
        let fileIdToUpdate = null;
        if (existingFile.result.files && existingFile.result.files.length > 0) {
            const result = await Swal.fire({
                title: 'File đã tồn tại', text: `File "${fileName}" đã có trong thư mục này.`,
                icon: 'warning', showCancelButton: true,
                confirmButtonText: 'Ghi đè',
                cancelButtonText: 'Hủy'
            });
            if (!result.isConfirmed) return Swal.close();
            fileIdToUpdate = existingFile.result.files[0].id;
        }

        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;
        
        const path = fileIdToUpdate ? `/upload/drive/v3/files/${fileIdToUpdate}` : '/upload/drive/v3/files';
        const method = fileIdToUpdate ? 'PATCH' : 'POST';
        const metadataPart = fileIdToUpdate ? '' : JSON.stringify(metadata); // Không cần metadata khi PATCH

        const multipartRequestBody = `${delimiter}Content-Type: application/json\r\n\r\n${metadataPart}${delimiter}Content-Type: text/plain\r\n\r\n${fileContent}${close_delim}`;

        const response = await gapi.client.request({
            path: path, method: method, params: { uploadType: 'multipart' },
            headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` }, body: multipartRequestBody
        });

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
        .setAppId(GOOGLE_CLIENT_ID.split('-')[0]).setOAuthToken(accessToken).addView(view)
        .setTitle("Chọn một file .tex để tải").setCallback(loadFilePickerCallback).build();
    picker.setVisible(true);
}

async function loadFilePickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const file = data.docs[0];
        Swal.fire({ title: 'Đang tải file...', text: `Đang tải nội dung từ file "${file.name}"`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const response = await gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
            if (loadFileContentRef) {
                loadFileContentRef(file.name, response.body);
            } else {
                throw new Error("Không thể tải file vào trình soạn thảo.");
            }
            Swal.close();
        } catch (err) {
            Swal.fire('Tải file thất bại', `Chi tiết: ${err.message}`, 'error');
        }
    }
}

// --- KHỞI TẠO VÀ CÁC HÀM KHÁC ---
function parseJwt(e){try{const o=e.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"),t=decodeURIComponent(atob(o).split("").map(l=>"%"+("00"+l.charCodeAt(0).toString(16)).slice(-2)).join(""));return JSON.parse(t)}catch(o){return console.error("Error decoding JWT:",o),null}}
function handleSignInResponse(e){const o=parseJwt(e.credential);if(!o||!o.email)return void Swal.fire("Lỗi Đăng Nhập","Không thể lấy thông tin email.","error");const t=o.email.toLowerCase();AUTHORIZED_EMAILS.includes(t)?(updateUIOnLogin(o),tokenClient.requestAccessToken({prompt:""})):(Swal.fire({icon:"error",title:"Truy cập bị từ chối",html:`Tài khoản <strong>${o.email}</strong> không có quyền truy cập.`}),handleSignOut())}
function handleSignOut(){"undefined"!=typeof google&&google.accounts&&google.accounts.id.disableAutoSelect();const e=gapi.client.getToken();e&&google.accounts.oauth2.revoke(e.access_token,()=>{console.log("Access token revoked.")}),gapi.client.setToken(null),updateUIOnLogout()}
function onGoogleScriptLoad(){google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:handleSignInResponse,auto_select:!0}),google.accounts.id.renderButton(document.getElementById("google-signin-btn"),{theme:"outline",size:"large"}),google.accounts.id.prompt(),gapi.load("client:picker",initializeGapiClient)}
async function initializeGapiClient(){await gapi.client.init({}),await gapi.client.load("https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"),gapiReady=!0,pickerApiLoaded=!0,console.log("GAPI Client and Picker API are ready."),tokenClient=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:GOOGLE_API_SCOPES,prompt:"",callback:e=>{e.error?console.error("Token Error:",e):console.log("Access Token granted/refreshed successfully.")}})}
function initializeDriveIntegration(e,o,t){editorInstanceRef=e,getCurrentFileNameRef=o,loadFileContentRef=t;const l=document.getElementById("drive-action-btn");l&&l.addEventListener("click",handleDriveActionClick),document.getElementById("google-signout-btn")?.addEventListener("click",handleSignOut),updateUIOnLogout(),console.log("Drive Integration Module Initialized.")}