/**
 * ====================================================================
 *  DRIVE INTEGRATION MODULE - PHIÊN BẢN 4.0 (Chống Reload)
 * ====================================================================
 * Đây là phiên bản tối ưu để giải quyết vấn đề pop-up sau khi reload trang.
 */

// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive';
const GOOGLE_DRIVE_FOLDER_NAME = 'Dự án LaTeX từ Editor';

const AUTHORIZED_EMAILS = [
    'nguyenvansang@example.com', // Thay bằng email của bạn
    'dongnghiep1@example.com',   // Thay bằng email đồng nghiệp
    'nguyensangnhc@gmail.com'    // Email của bạn đã được thêm
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
        
        // *** LOGIC QUAN TRỌNG NHẤT ĐỂ CHỐNG RELOAD ***
        // Ngay sau khi đăng nhập thành công, ta tự động và âm thầm xin quyền truy cập Drive.
        console.log("Silently requesting Drive access token...");
        tokenClient.requestAccessToken({ prompt: '' });
    } else {
        console.warn(`Access DENIED for ${userEmail}.`);
        Swal.fire({ icon: 'error', title: 'Truy cập bị từ chối', html: `Tài khoản <strong>${userProfile.email}</strong> không có quyền truy cập.` });
        handleSignOut();
    }
}

/**
 * Xử lý đăng xuất, thu hồi token.
 */
function handleSignOut() {
    if (typeof google !== 'undefined') {
        google.accounts.id.disableAutoSelect();
    }
    const token = gapi.client.getToken();
    if (token) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            console.log('Access token revoked.');
        });
        gapi.client.setToken(null);
    }
    updateUIOnLogout();
}

/**
 * Hàm được gọi khi nhấn "Lưu vào Drive".
 */
async function handleSaveClick() {
    if (gapi.client.getToken()) {
        await uploadCurrentFileToDrive();
    } else {
        // Trường hợp này rất hiếm, chỉ xảy ra khi việc tự động xin quyền bị lỗi.
        Swal.fire({
            title: 'Cần cấp quyền truy cập',
            text: 'Bạn cần cấp quyền cho ứng dụng để lưu file vào Google Drive. Một cửa sổ sẽ hiện ra.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Cấp quyền'
        }).then((result) => {
            if (result.isConfirmed) {
                // Yêu cầu quyền một cách tường minh, người dùng sẽ thấy pop-up.
                tokenClient.requestAccessToken({ prompt: 'consent' });
            }
        });
    }
}

// --- CÁC HÀM LÀM VIỆC VỚI GOOGLE DRIVE ---
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

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_API_SCOPES,
            prompt: '', 
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    console.error("Token Error:", tokenResponse);
                } else {
                    console.log("Access Token granted/refreshed.");
                    // Nếu callback này được gọi sau một hành động tường minh (như trong handleSaveClick),
                    // chúng ta có thể gọi lại hàm upload ở đây.
                    if (gapi.client.getToken()) {
                        // Kiểm tra xem có cần upload ngay không, ví dụ, đặt một flag.
                        // For now, just log it. The user will click save again.
                    }
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


// === DÁN LẠI CÁC HÀM ĐÃ BỊ LƯỢC BỎ ĐỂ CODE ĐẦY ĐỦ ===
async function getOrCreateFolderId(){const searchResponse=await gapi.client.drive.files.list({q:`mimeType='application/vnd.google-apps.folder' and name='${GOOGLE_DRIVE_FOLDER_NAME}' and trashed=false`,fields:'files(id)'});if(searchResponse.result.files&&searchResponse.result.files.length>0){return searchResponse.result.files[0].id}const createResponse=await gapi.client.drive.files.create({resource:{name:GOOGLE_DRIVE_FOLDER_NAME,mimeType:'application/vnd.google-apps.folder'},fields:'id'});return createResponse.result.id}async function uploadCurrentFileToDrive(){const fileName=getCurrentFileNameRef()||'untitled.tex';const fileContent=editorInstanceRef.getValue();if(!fileContent.trim()){Swal.fire({icon:'warning',title:'Tệp rỗng',text:'Không có nội dung để lưu.'});return}Swal.fire({title:'Đang lưu lên Google Drive...',text:`Đang chuẩn bị tải lên tệp ${fileName}`,allowOutsideClick:false,didOpen:()=>Swal.showLoading()});try{if(!gapiReady)throw new Error("GAPI client is not ready yet.");const folderId=await getOrCreateFolderId();Swal.update({text:`Đang tải tệp ${fileName} vào thư mục '${GOOGLE_DRIVE_FOLDER_NAME}'...`});const metadata={name:fileName,mimeType:'text/x-tex',parents:[folderId]};const boundary='-------314159265358979323846';const delimiter=`\r\n--${boundary}\r\n`;const close_delim=`\r\n--${boundary}--`;const multipartRequestBody=`${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: text/plain\r\n\r\n${fileContent}${close_delim}`;const response=await gapi.client.request({path:'/upload/drive/v3/files',method:'POST',params:{uploadType:'multipart'},headers:{'Content-Type':`multipart/related; boundary="${boundary}"`},body:multipartRequestBody});Swal.fire({icon:'success',title:'Thành công!',html:`Đã lưu tệp <strong>${response.result.name}</strong>. <br><br> <a href="https://drive.google.com/file/d/${response.result.id}/view" target="_blank" class="swal2-confirm swal2-styled">Mở trên Drive</a>`,showConfirmButton:false,timer:5000})}catch(err){console.error("Error uploading file to Drive:",err);Swal.fire('Tải lên thất bại',`Chi tiết: ${err.result?.error?.message||err.message||'Lỗi không xác định.'}`,'error')}}function parseJwt(token){try{const base64Url=token.split('.')[1];const base64=base64Url.replace(/-/g,'+').replace(/_/g,'/');const jsonPayload=decodeURIComponent(atob(base64).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));return JSON.parse(jsonPayload)}catch(e){console.error("Error decoding JWT:",e);return null}}