/**
 * ====================================================================
 *  DRIVE INTEGRATION MODULE - PHIÊN BẢN 11.2 (FIXED)
 * ====================================================================
 * - Sửa lỗi 'setSelectFolderEnabled is not a function'.
 * - Tải file: Bắt đầu từ chế độ xem thư mục, cho phép duyệt cây thư mục.
 * - Lưu file: Cho phép tạo thư mục mới ngay trong cửa sổ chọn nơi lưu.
 */

// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive';
const AUTHORIZED_EMAILS = ['nguyensangnhc@gmail.com'];

let gapiReady = false;
let pickerApiLoaded = false;
let tokenClient;
let editorInstanceRef;
let getCurrentFileNameRef;
let loadFileContentRef;

// --- CÁC HÀM UI ---
function updateUIOnLogin(userProfile) { document.getElementById('google-signin-btn').style.display = 'none'; const userProfileDiv = document.getElementById('user-profile'); userProfileDiv.style.display = 'flex'; document.getElementById('user-avatar').src = userProfile.picture; document.getElementById('user-name').textContent = userProfile.given_name || userProfile.name; document.getElementById('drive-action-btn').disabled = false; }
function updateUIOnLogout() { document.getElementById('google-signin-btn').style.display = 'block'; document.getElementById('user-profile').style.display = 'none'; document.getElementById('drive-action-btn').disabled = true; }

// --- LOGIC CHÍNH ---
async function handleDriveActionClick() { if (!gapi.client.getToken() || !pickerApiLoaded) return Swal.fire('Vui lòng đợi', 'Chức năng Google Drive chưa sẵn sàng hoặc bạn chưa đăng nhập.', 'warning'); const { value: action } = await Swal.fire({ title: 'Google Drive', icon: 'question', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#4CAF50', confirmButtonText: '<i class="fas fa-cloud-download-alt"></i> Tải file', cancelButtonText: '<i class="fas fa-save"></i> Lưu file' }); if (action) { showFilePicker(); } else if (action === null) { showFolderPicker(); } }

// --- LOGIC LƯU FILE (NÂNG CẤP) ---
function showFolderPicker() {
    const accessToken = gapi.client.getToken().access_token;
    const view = new google.picker.View(google.picker.ViewId.FOLDERS);
    const picker = new google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
        .addView(view)
        .enableFeature(google.picker.Feature.NEW_DOCUMENT)
        .setTitle("Chọn thư mục để lưu")
        .setCallback(savePickerCallback)
        .build();
    picker.setVisible(true);
}

async function savePickerCallback(data) { if (data.action === google.picker.Action.PICKED) { const folderId = data.docs[0].id; const currentFileName = getCurrentFileNameRef() || 'untitled.tex'; const { value: fileName } = await Swal.fire({ title: 'Đặt tên file để lưu', input: 'text', inputValue: currentFileName, showCancelButton: true, confirmButtonText: 'Lưu', inputValidator: v => !v || !v.trim() ? 'Tên file không được để trống!' : null }); if (fileName) await uploadFileToDrive(folderId, fileName.trim()); } }
async function uploadFileToDrive(folderId, fileName) { const fileContent = editorInstanceRef.getValue(); if (!fileContent.trim()) return Swal.fire({ icon: 'warning', title: 'Tệp rỗng' }); Swal.fire({ title: 'Đang xử lý...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); try { const query = `'${folderId}' in parents and name='${fileName}' and trashed=false`; const { result } = await gapi.client.drive.files.list({ q: query, fields: 'files(id)' }); let fileIdToUpdate = null; if (result.files && result.files.length > 0) { fileIdToUpdate = result.files[0].id; const res = await Swal.fire({ title: 'File đã tồn tại', text: `Ghi đè lên file "${fileName}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Ghi đè' }); if (!res.isConfirmed) return Swal.fire('Đã hủy', '', 'info'); } Swal.update({ text: fileIdToUpdate ? `Đang ghi đè file...` : `Đang tạo file mới...` }); const metadata = { name: fileName, mimeType: 'text/x-tex' }; if (!fileIdToUpdate) metadata.parents = [folderId]; const boundary = 'b' + Date.now(); const delimiter = `\r\n--${boundary}\r\n`; const close_delim = `\r\n--${boundary}--`; const path = fileIdToUpdate ? `/upload/drive/v3/files/${fileIdToUpdate}` : '/upload/drive/v3/files'; const method = fileIdToUpdate ? 'PATCH' : 'POST'; const body = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: text/plain; charset=UTF-8\r\n\r\n${fileContent}${close_delim}`; const response = await gapi.client.request({ path, method, params: { uploadType: 'multipart' }, headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` }, body }); Swal.fire({ icon: 'success', title: 'Thành công!', html: `Đã lưu tệp <strong>${response.result.name}</strong>.`, showConfirmButton: false, timer: 3000 }); } catch (err) { Swal.fire('Lưu file thất bại', err.result?.error?.message || err.message, 'error'); } }

// --- LOGIC TẢI FILE (ĐÃ SỬA LỖI) ---
function showFilePicker() {
    const accessToken = gapi.client.getToken().access_token;
    const folderView = new google.picker.View(google.picker.ViewId.FOLDERS);
    const docsView = new google.picker.View(google.picker.ViewId.DOCS);
    docsView.setMimeTypes("text/x-tex,text/plain,application/x-tex,application/vnd.google-apps.folder");

    const picker = new google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
        .addView(folderView)
        .addView(docsView)
        .setTitle("Chọn một file .tex để tải")
        .setCallback(loadFilePickerCallback)
        .build();
    picker.setVisible(true);
}

async function loadFilePickerCallback(data) { if (data.action === google.picker.Action.PICKED) { const file = data.docs[0]; if (file.mimeType === 'application/vnd.google-apps.folder') return Swal.fire('Lựa chọn không hợp lệ', 'Vui lòng chọn một file .tex, không phải thư mục.', 'warning'); Swal.fire({ title: 'Đang tải file...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); try { const response = await gapi.client.drive.files.get({ fileId: file.id, alt: 'media' }); if (loadFileContentRef) loadFileContentRef(file.name, response.body); else throw new Error("Lỗi kết nối với trình soạn thảo."); Swal.close(); } catch (err) { Swal.fire('Tải file thất bại', err.message, 'error'); } } }

// --- KHỞI TẠO VÀ CÁC HÀM HELPER ---
function parseJwt(e){try{const t=e.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"),n=decodeURIComponent(atob(t).split("").map(o=>"%"+("00"+o.charCodeAt(0).toString(16)).slice(-2)).join(""));return JSON.parse(n)}catch(t){return console.error("Error decoding JWT:",t),null}}
function handleSignInResponse(e){const t=parseJwt(e.credential);if(!t||!t.email)return void Swal.fire("Lỗi Đăng Nhập","Không thể lấy thông tin email.","error");const n=t.email.toLowerCase();AUTHORIZED_EMAILS.includes(n)?(updateUIOnLogin(t),tokenClient.requestAccessToken({prompt:""})):(Swal.fire({icon:"error",title:"Truy cập bị từ chối",html:`Tài khoản <strong>${t.email}</strong> không có quyền truy cập.`}),handleSignOut())}
function handleSignOut(){"undefined"!=typeof google&&google.accounts&&google.accounts.id.disableAutoSelect();const e=gapi.client.getToken();e&&google.accounts.oauth2.revoke(e.access_token,()=>console.log("Access token revoked.")),gapi.client.setToken(null),updateUIOnLogout()}
function onGoogleScriptLoad(){google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:handleSignInResponse,auto_select:!0}),google.accounts.id.renderButton(document.getElementById("google-signin-btn"),{theme:"outline",size:"large"}),google.accounts.id.prompt(),gapi.load("client:picker",initializeGapiClient)}
async function initializeGapiClient(){await gapi.client.init({}),await gapi.client.load("https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"),gapiReady=!0,pickerApiLoaded=!0,console.log("GAPI Client and Picker API are ready."),tokenClient=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:GOOGLE_API_SCOPES,prompt:"",callback:e=>{e.error?console.error("Token Error:",e):console.log("Access Token granted/refreshed successfully.")}})}
function initializeDriveIntegration(e,t,n){editorInstanceRef=e,getCurrentFileNameRef=t,loadFileContentRef=n;const o=document.getElementById("drive-action-btn");o&&o.addEventListener("click",handleDriveActionClick),document.getElementById("google-signout-btn")?.addEventListener("click",handleSignOut),updateUIOnLogout(),console.log("Drive Integration Module Initialized.")}