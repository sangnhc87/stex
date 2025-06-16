/**
 * ====================================================================
 *  DRIVE INTEGRATION MODULE - PHIÊN BẢN 7.1 (Footer Buttons)
 * ====================================================================
 * - Hỗ trợ nút Lưu và Tải từ Drive nằm trong footer.
 * - Yêu cầu BẮT BUỘC: Bật Picker API và cấu hình header COOP.
 */

// --- KHAI BÁO BIẾN & CẤU HÌNH TOÀN CỤC ---
const GOOGLE_CLIENT_ID = '445721099356-4l2r9pg4jp1n4rn82jafofjnc74p708e.apps.googleusercontent.com';
const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
const GOOGLE_DRIVE_FOLDER_NAME = 'Dự án LaTeX từ Editor';

const AUTHORIZED_EMAILS = [
    'nguyensangnhc@gmail.com'
];

let gapiReady = false;
let pickerApiLoaded = false;
let tokenClient;
let editorInstanceRef; 
let getCurrentFileNameRef;
let loadFileContentRef; // "Cầu nối" để gọi hàm trong app6.js

// --- CÁC HÀM UI ---
function updateUIOnLogin(userProfile) {
    const signInBtnContainer = document.getElementById('google-signin-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const userAvatarImg = document.getElementById('user-avatar');
    const userNameSpan = document.getElementById('user-name');
    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    const loadFromDriveBtn = document.getElementById('load-from-drive-btn'); // Nút mới

    if (signInBtnContainer) signInBtnContainer.style.display = 'none';
    if (userProfileDiv) userProfileDiv.style.display = 'flex';
    if (userAvatarImg) userAvatarImg.src = userProfile.picture;
    if (userNameSpan) userNameSpan.textContent = userProfile.given_name || userProfile.name;
    
    if (saveToDriveBtn) {
        saveToDriveBtn.disabled = false;
        saveToDriveBtn.title = "Lưu file .tex lên Google Drive";
    }
    if (loadFromDriveBtn) {
        loadFromDriveBtn.disabled = false;
        loadFromDriveBtn.title = "Tải file .tex từ Google Drive";
    }
}

function updateUIOnLogout() {
    const signInBtnContainer = document.getElementById('google-signin-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const saveToDriveBtn = document.getElementById('save-to-drive-btn');
    const loadFromDriveBtn = document.getElementById('load-from-drive-btn'); // Nút mới

    if (signInBtnContainer) signInBtnContainer.style.display = 'block';
    if (userProfileDiv) userProfileDiv.style.display = 'none';
    
    if (saveToDriveBtn) {
        saveToDriveBtn.disabled = true;
        saveToDriveBtn.title = "Vui lòng đăng nhập để lưu";
    }
     if (loadFromDriveBtn) {
        loadFromDriveBtn.disabled = true;
        loadFromDriveBtn.title = "Vui lòng đăng nhập để tải file";
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
function handleSignInResponse(e){const o=parseJwt(e.credential);if(!o||!o.email)return void Swal.fire("Lỗi Đăng Nhập","Không thể lấy thông tin email.","error");const t=o.email.toLowerCase();AUTHORIZED_EMAILS.includes(t)?(console.log(`Access GRANTED for ${t}.`),updateUIOnLogin(o),console.log("Silently requesting Drive access token..."),tokenClient.requestAccessToken({prompt:""})):(console.warn(`Access DENIED for ${t}.`),Swal.fire({icon:"error",title:"Truy cập bị từ chối",html:`Tài khoản <strong>${o.email}</strong> không có quyền truy cập.`}),handleSignOut())}
function handleSignOut(){"undefined"!=typeof google&&google.accounts&&google.accounts.id.disableAutoSelect();const e=gapi.client.getToken();e&&google.accounts.oauth2.revoke(e.access_token,()=>{console.log("Access token revoked.")}),gapi.client.setToken(null),updateUIOnLogout()}
async function handleSaveClick(){if(gapi.client.getToken()){const e=getCurrentFileNameRef()||"untitled.tex",{value:o}=await Swal.fire({title:"Đặt tên file để lưu",input:"text",inputValue:e,showCancelButton:!0,confirmButtonText:"Lưu vào Drive",cancelButtonText:"Hủy",inputValidator:t=>!t||!t.trim()?"Tên file không được để trống!":null});o&&await uploadCurrentFileToDrive(o.trim())}else Swal.fire("Chưa đăng nhập","Bạn cần đăng nhập để lưu file.","info")}
function handleLoadClick(){gapi.client.getToken()?pickerApiLoaded?showFilePicker():Swal.fire("Vui lòng đợi","API để chọn file chưa sẵn sàng.","warning"):Swal.fire("Chưa đăng nhập","Bạn cần đăng nhập để tải file.","info")}
function showFilePicker(){const e=gapi.client.getToken().access_token;if(!e)return Swal.fire("Lỗi","Không tìm thấy token xác thực.","error");const o=new google.picker.View(google.picker.ViewId.DOCS);o.setMimeTypes("text/x-tex,text/plain,application/x-tex");const t=new google.picker.PickerBuilder().enableFeature(google.picker.Feature.NAV_HIDDEN).setAppId(GOOGLE_CLIENT_ID.split("-")[0]).setOAuthToken(e).addView(o).setTitle("Chọn một file .tex để tải").setCallback(filePickerCallback).build();t.setVisible(!0)}
async function filePickerCallback(e){e.action===google.picker.Action.PICKED&&await downloadFileFromDrive(e.docs[0].id,e.docs[0].name)}
async function downloadFileFromDrive(e,o){Swal.fire({title:"Đang tải file...",text:`Đang tải nội dung từ file "${o}"`,allowOutsideClick:!1,didOpen:()=>Swal.showLoading()});try{const t=await gapi.client.drive.files.get({fileId:e,alt:"media"});if(loadFileContentRef)loadFileContentRef(o,t.body);else throw new Error("Không thể tải file vào trình soạn thảo.");Swal.close()}catch(l){console.error("Error downloading file from Drive:",l),Swal.fire("Tải file thất bại",`Chi tiết: ${l.message}`,"error")}}
async function getOrCreateFolderId(){const e=`mimeType='application/vnd.google-apps.folder' and name='${GOOGLE_DRIVE_FOLDER_NAME}' and trashed=false`,o=await gapi.client.drive.files.list({q:e,fields:"files(id)"});if(o.result.files&&o.result.files.length>0)return console.log(`Found folder '${GOOGLE_DRIVE_FOLDER_NAME}' with ID: ${o.result.files[0].id}`),o.result.files[0].id;console.log(`Folder '${GOOGLE_DRIVE_FOLDER_NAME}' not found, creating a new one...`);const t=await gapi.client.drive.files.create({resource:{name:GOOGLE_DRIVE_FOLDER_NAME,mimeType:"application/vnd.google-apps.folder"},fields:"id"});return console.log(`Created new folder with ID: ${t.result.id}`),t.result.id}
async function uploadCurrentFileToDrive(e){const o=editorInstanceRef.getValue();if(o.trim()){Swal.fire({title:"Đang lưu lên Google Drive...",text:`Chuẩn bị tải lên tệp ${e}`,allowOutsideClick:!1,didOpen:()=>Swal.showLoading()});try{if(!gapiReady)throw new Error("GAPI client is not ready yet.");const t=await getOrCreateFolderId();let l=e;const i=`'${t}' in parents and name='${e}' and trashed=false`,n=await gapi.client.drive.files.list({q:i,fields:"files(id)"});if(n.result.files&&n.result.files.length>0){const a=new Date,d=`${a.getFullYear()}${String(a.getMonth()+1).padStart(2,"0")}${String(a.getDate()).padStart(2,"0")}-${String(a.getHours()).padStart(2,"0")}${String(a.getMinutes()).padStart(2,"0")}`,s=e.includes(".")?e.substring(0,e.lastIndexOf(".")):e,r=e.includes(".")?e.substring(e.lastIndexOf(".")):".tex";l=`${s}-${d}${r}`,console.log(`File '${e}' exists. Renaming to '${l}' to avoid conflict.`),Swal.update({text:`File đã tồn tại. Đang lưu với tên mới: ${l}`})}else Swal.update({text:`Đang tải tệp ${e} vào thư mục '${GOOGLE_DRIVE_FOLDER_NAME}'...`});const c={name:l,mimeType:"text/x-tex",parents:[t]},p="-------314159265358979323846",u=`\r\n--${p}\r\n`,m=`\r\n--${p}--`,f=`${u}Content-Type: application/json\r\n\r\n${JSON.stringify(c)}${u}Content-Type: text/plain\r\n\r\n${o}${m}`,g=await gapi.client.request({path:"/upload/drive/v3/files",method:"POST",params:{uploadType:"multipart"},headers:{"Content-Type":`multipart/related; boundary="${p}"`},body:f});Swal.fire({icon:"success",title:"Thành công!",html:`Đã lưu tệp <strong>${g.result.name}</strong>. <br><br> <a href="https://drive.google.com/file/d/${g.result.id}/view" target="_blank" class="swal2-confirm swal2-styled">Mở trên Drive</a>`,showConfirmButton:!1,timer:5e3})}catch(a){console.error("Error uploading file to Drive:",a),Swal.fire("Tải lên thất bại",`Chi tiết: ${a.result?.error?.message||a.message||"Lỗi không xác định."}`,"error")}}else Swal.fire({icon:"warning",title:"Tệp rỗng",text:"Không có nội dung để lưu."})}
function parseJwt(e){try{const o=e.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"),t=decodeURIComponent(atob(o).split("").map(l=>"%"+("00"+l.charCodeAt(0).toString(16)).slice(-2)).join(""));return JSON.parse(t)}catch(o){return console.error("Error decoding JWT:",o),null}}


// --- KHỞI TẠO MODULE ---
// --- KHỞI TẠO MODULE ---
function onGoogleScriptLoad() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        // QUAN TRỌNG: Vẫn giữ callback. Thư viện sẽ tự gọi nó sau khi redirect về.
        callback: handleSignInResponse, 
        ux_mode: 'redirect' // Chuyển sang chế độ redirect
    });

    google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { 
            theme: "outline", 
            size: "large", 
            type: "standard", // type: 'standard' là bắt buộc cho ux_mode: 'redirect'
            text: "signin_with" 
        }
    );

    // QUAN TRỌNG: Không gọi prompt() trong chế độ redirect, 
    // vì hành động này sẽ do người dùng bấm nút.
    // google.accounts.id.prompt(); 

    // QUAN TRỌNG: Xóa hàm không tồn tại đi
    // google.accounts.id.handleRedirectNotification(...);

    gapi.load('client:picker', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({});
    await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
    gapiReady = true;
    pickerApiLoaded = true;
    console.log("GAPI Client and Picker API are ready.");

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_API_SCOPES,
        prompt: '',
        callback: (tokenResponse) => {
            if (tokenResponse.error) console.error("Token Error:", tokenResponse);
            else console.log("Access Token granted/refreshed successfully.");
        },
    });
}

function initializeDriveIntegration(editor, getCurrentFileName, loadFileFunc) {
    editorInstanceRef = editor;
    getCurrentFileNameRef = getCurrentFileName;
    loadFileContentRef = loadFileFunc;

    // Gắn sự kiện cho các nút
    document.getElementById('google-signout-btn')?.addEventListener('click', handleSignOut);
    document.getElementById('save-to-drive-btn')?.addEventListener('click', handleSaveClick);
    document.getElementById('load-from-drive-btn')?.addEventListener('click', handleLoadClick); // Nút mới

    // Vô hiệu hóa các nút lúc đầu
    updateUIOnLogout();

    console.log("Drive Integration Module Initialized.");
}