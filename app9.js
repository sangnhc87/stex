//<script> 
// Bỏ defer để đảm bảo script này chạy tuần tự

function main() {
    // === LẤY CÁC PHẦN TỬ DOM (ĐÃ CẬP NHẬT) ===
    const editorEl = ace.edit("editor");
    const compileBtn = document.getElementById("compile-btn");
    const consoleOutput = document.getElementById("console");
    const pdfbox = document.getElementById("pdfbox");
    const zipLoaderInput = document.getElementById('zip-loader-input');
    const mainFileSelector = document.getElementById('main-file-selector');
    const templateSelector = document.getElementById('template-selector');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const consoleHeader = document.getElementById("console-header");
    const consoleToggleIcon = document.getElementById("console-toggle-icon");
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const editSuggestionsBtn = document.getElementById('edit-suggestions-btn');
    const openV2Btn = document.getElementById('open-v2-btn'); // Giữ lại
    const showHelpBtn = document.getElementById('show-help-btn');
    const downloadZipBtn = document.getElementById('download-zip-btn'); 
    const fileManagerBtn = document.getElementById('file-manager-btn');
    const zipLoaderBtn = document.getElementById('zip-loader-btn');
    const themeSelector = document.getElementById('theme-selector');
    const authorInfoBtn = document.getElementById('author-info-btn');
    const snippetManagerBtn = document.getElementById('snippet-manager-btn');
    const editSnippetsBtn = document.getElementById('edit-snippets-btn');
    const downloadCurrentTexBtn = document.getElementById('download-current-tex-btn');
    const openGanIdBtn = document.getElementById('open-gan-id-btn'); // Thêm nút gán ID

    // === CÁC BIẾN VÀ HẰNG SỐ (ĐÃ CẬP NHẬT) ===
    const globalEn = new PdfTeXEngine();
    let mainTexFile = 'main.tex';
    let currentOpenFile = 'main.tex';
    let db;
    let customSuggestions = [];
    const DB_NAME = 'LaTeX_Perfect_Final_DB';
    const STORE_NAME = 'StyFilesStore';
    const TEXLIVE_BASE_URL = "https://texlive2.swiftlatex.com/pdftex/";
    const TEXLIVE_VERSION = '26';
    const TEMPLATES = { 
        'DeThi': `\\documentclass[12pt]{article}\n\\usepackage[utf8]{vietnam}\n\\begin{document}\n\nĐây là mẫu đề thi.\n\n\\end{document}`, 
        'VeHinh': `\\documentclass[12pt,tikz]{standalone}\n\\begin{document}\n\\begin{tikzpicture}\n\t% Vẽ hình ở đây\n\\end{tikzpicture}\n\\end{document}`, 
        'Beamer': `\\documentclass{beamer}\n\\usetheme{Madrid}\n\\title{Tiêu đề}\n\\author{Tác giả}\n\\begin{document}\n\\frame{\\titlepage}\n\\begin{frame}{Nội dung}\n\n\\end{frame}\n\\end{document}`, 
        'book': `\\documentclass{book}\n\\usepackage[utf8]{vietnam}\n\\title{Tiêu đề sách}\n\\author{Tác giả}\n\\begin{document}\n\\frontmatter\n\\maketitle\n\\mainmatter\n\\chapter{Chương 1}\n\n\\end{document}` 
    }; 
    const PREPACKAGED_FILES = { /* Có thể để trống hoặc thêm các file mặc định */ };
    const DEFAULT_SNIPPETS_JSON = `[ { "name": "Môi trường cơ bản", "type": "folder", "children": [ { "name": "Itemize", "type": "snippet", "content": "\\\\begin{itemize}\\n\\t\\\\item \\n\\\\end{itemize}" }, { "name": "Enumerate", "type": "snippet", "content": "\\\\begin{enumerate}\\n\\t\\\\item \\n\\\\end{enumerate}" } ] }, { "name": "Toán học", "type": "folder", "children": [ { "name": "Phân số", "type": "snippet", "content": "\\\\dfrac{$1}{$2}" } ] } ]`;

    // === CÁC HÀM CƠ SỞ VÀ NÂNG CAO ===
    function openDb() { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 2); request.onerror = () => reject("Error opening IndexedDB."); request.onsuccess = (event) => { db = event.target.result; resolve(); }; request.onupgradeneeded = (event) => { const db = event.target.result; if (!db.objectStoreNames.contains(STORE_NAME)) { db.createObjectStore(STORE_NAME, { keyPath: 'name' }); } }; }); }
    function saveFileToDb(name, data) { if (!db) return Promise.reject("DB not open"); const transaction = db.transaction([STORE_NAME], 'readwrite'); const store = transaction.objectStore(STORE_NAME); return new Promise((resolve, reject) => { const request = store.put({ name, data }); request.onsuccess = resolve; request.onerror = (e) => reject(`Failed to save ${name}: ${e.target.error}`); }); }
    function getFileFromDb(name) { return new Promise((resolve, reject) => { if (!db) return resolve(null); const transaction = db.transaction([STORE_NAME], 'readonly'); const store = transaction.objectStore(STORE_NAME); const request = store.get(name); request.onsuccess = (event) => resolve(event.target.result ? event.target.result.data : null); request.onerror = (e) => reject(`Failed to get ${name}: ${e.target.error}`); }); }
    function getAllFilesFromDb() { return new Promise((resolve, reject) => { if (!db) return reject("DB not open"); const transaction = db.transaction([STORE_NAME], 'readonly'); const store = transaction.objectStore(STORE_NAME); const request = store.getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
    function deleteFileFromDb(name) { return new Promise((resolve, reject) => { if (!db) return reject("DB not open"); const transaction = db.transaction([STORE_NAME], 'readwrite'); const store = transaction.objectStore(STORE_NAME); const request = store.delete(name); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }
    function initResizer() { const resizer = document.getElementById('resizer'); const editorPane = document.querySelector('.editor-pane'); let isResizing = false; resizer.addEventListener('mousedown', (e) => { e.preventDefault(); isResizing = true; document.body.classList.add('is-resizing'); const onMouseMove = (moveEvent) => { if (!isResizing) return; const containerRect = resizer.parentElement.getBoundingClientRect(); const newEditorWidth = moveEvent.clientX - containerRect.left; if (newEditorWidth > 200 && (containerRect.width - newEditorWidth - resizer.offsetWidth) > 200) { editorPane.style.flexBasis = `${newEditorWidth}px`; } }; const onMouseUp = () => { isResizing = false; document.body.classList.remove('is-resizing'); document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); editorEl.resize(true); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }); }
    
    async function showAuthorInfo() { 
        let qrImageHTML = ''; 
        try { 
            const imageData = await getFileFromDb('QR.png'); 
            if (imageData) { 
                const base64String = btoa(String.fromCharCode.apply(null, imageData)); 
                const imageSrc = `data:image/png;base64,${base64String}`; 
                qrImageHTML = `<div style="text-align: center; margin-top: 15px; margin-bottom: 15px;"><img src="${imageSrc}" alt="Ủng Hộ Ly Cafe" style="width: 150px; height: 150px; border: 2px solid #ddd; border-radius: 8px;"></div>`; 
            } else {
                 qrImageHTML = `<div style="text-align: center; margin-top: 15px; margin-bottom: 15px;"><img src="QR.png" alt="Ủng Hộ Ly Cafe" style="width: 150px; height: 150px; border: 2px solid #ddd; border-radius: 8px;"></div>`;
            }
        } catch (error) { 
            console.error("Không thể tải ảnh QR từ DB:", error); 
            qrImageHTML = `<div style="text-align: center; margin-top: 15px; margin-bottom: 15px;"><img src="QR.png" alt="Ủng Hộ Ly Cafe" style="width: 150px; height: 150px; border: 2px solid #ddd; border-radius: 8px;"></div>`;
        } 
        const authorHTML = `<div style="text-align: left; font-size: 16px; line-height: 1.8;"><p><i class="fas fa-user-tie"></i><strong>Họ và tên:</strong> Nguyễn Văn Sang</p><p><i class="fas fa-briefcase"></i><strong>Chức vụ:</strong> GV THPT Nguyễn Hữu Cảnh, TP.HCM</p><p><i class="fab fa-facebook"></i><strong>Facebook:</strong> <a href="https://www.facebook.com/nguyenvan.sang.92798072/" target="_blank">Liên Hệ Góp Ý Qua Facebook</a></p>${qrImageHTML}<hr><p style="text-align: center; font-style: italic; line-height: 1.5;">Thật vui khi công cụ nhỏ này có thể giúp ích cho công việc của bạn.<br>Mọi sự ghi nhận và ủng hộ đều là niềm vinh hạnh đối với một người giáo viên như tôi.<br><strong>Xin trân trọng cảm ơn!</strong></p></div>`; Swal.fire({ title: '<strong>Thông tin Tác giả</strong>', icon: 'info', html: authorHTML, width: '500px', showCloseButton: true, focusConfirm: false, confirmButtonText: '<i class="fa fa-thumbs-up"></i> Tuyệt vời!', }); 
    }
    
    function initFooterPanel() {
        const footerPanel = document.getElementById('footer-panel');
        const handle = document.getElementById('footer-handle');
        const content = document.getElementById('footer-content');
        const expandBtn = document.getElementById('expand-footer-btn');
        const expandIcon = expandBtn ? expandBtn.querySelector('i') : null;
        if (!footerPanel || !handle || !content || !expandBtn || !expandIcon) return;
        handle.addEventListener('click', (e) => {
            if (e.target.closest('.helper-btn') || e.target.closest('#save-to-drive-btn')) { return; }
            footerPanel.classList.toggle('is-open');
            if (footerPanel.classList.contains('is-open')) {
                expandIcon.classList.remove('fa-chevron-up');
                expandIcon.classList.add('fa-thumbtack');
                expandBtn.title = "Bỏ ghim (để tự động ẩn)";
            } else {
                expandIcon.classList.remove('fa-thumbtack');
                expandIcon.classList.add('fa-chevron-up');
                expandBtn.title = "Ghim lại (để luôn hiển thị)";
            }
        });
        content.addEventListener('click', (e) => {
            const button = e.target.closest('.helper-btn');
            if (!button) return;
            const textToInsert = button.dataset.insert;
            if (textToInsert) {
                editorEl.insert(textToInsert.replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
                editorEl.focus();
            }
        });
    }

    function buildTreeHtml(nodes) { let html = '<ul class="snippet-tree">'; for (const node of nodes) { if (node.type === 'folder') { html += `<li class="snippet-folder"><div class="snippet-folder-header"><i class="fas fa-caret-right folder-toggle"></i><i class="fas fa-folder"></i><span>${node.name}</span></div>${buildTreeHtml(node.children || [])}</li>`; } else if (node.type === 'snippet') { html += `<li class="snippet-item" data-content="${encodeURIComponent(node.content)}"><i class="fas fa-file-alt"></i><span>${node.name}</span></li>`; } } html += '</ul>'; return html; }
    async function showSnippetManager() { let snippetsData; try { let fileData = await getFileFromDb('snippets.json'); if (!fileData) { const textEncoder = new TextEncoder(); fileData = textEncoder.encode(DEFAULT_SNIPPETS_JSON); await saveFileToDb('snippets.json', fileData); } snippetsData = JSON.parse(new TextDecoder().decode(fileData)); } catch (e) { Swal.fire('Lỗi', 'File snippets.json bị lỗi cú pháp. Vui lòng nhấn nút "Sửa Snippet" để sửa lại.', 'error'); console.error("Lỗi parse snippets.json: ", e); return; } const treeHtml = buildTreeHtml(snippetsData); const managerHtml = `<div id="snippet-tree-container">${treeHtml}</div>`; Swal.fire({ title: '<strong>Kho Snippet</strong>', html: managerHtml, width: '600px', showCloseButton: true, showConfirmButton: false, didOpen: () => { const container = document.getElementById('snippet-tree-container'); container.addEventListener('click', (e) => { const folderHeader = e.target.closest('.snippet-folder-header'); const snippetItem = e.target.closest('.snippet-item'); if (folderHeader) { folderHeader.parentElement.classList.toggle('is-open'); } else if (snippetItem) { const content = decodeURIComponent(snippetItem.dataset.content); editorEl.insert(content.replace(/\\n/g, '\n').replace(/\\t/g, '\t')); editorEl.focus(); Swal.close(); } }); } }); }

    async function openFileInEditor(fileName) { if (!fileName) { editorEl.setValue('Không có file để mở. Vui lòng tạo file mới.', -1); currentOpenFile = ''; return; } if (currentOpenFile && editorEl.getValue()) { const currentContent = editorEl.getValue(); const textEncoder = new TextEncoder(); await saveFileToDb(currentOpenFile, textEncoder.encode(currentContent)); globalEn.writeMemFSFile(currentOpenFile, textEncoder.encode(currentContent)); } let fileData = await getFileFromDb(fileName); if (!fileData) { let defaultContent = ''; if (fileName === 'snippets.json') defaultContent = DEFAULT_SNIPPETS_JSON; else if (fileName === 'suggestions.json') defaultContent = '[]'; const textEncoder = new TextEncoder(); fileData = textEncoder.encode(defaultContent); await saveFileToDb(fileName, fileData); } editorEl.setValue(new TextDecoder().decode(fileData), -1); currentOpenFile = fileName; const isMainFile = Array.from(mainFileSelector.options).some(opt => opt.value === fileName); if (isMainFile) mainTexFile = fileName; if (fileName.endsWith('.json')) { editorEl.session.setMode("ace/mode/json"); compileBtn.innerHTML = `<i class="fas fa-save"></i> Save File`; } else { editorEl.session.setMode("ace/mode/latex"); compileBtn.innerHTML = isMainFile ? '<i class="fas fa-play"></i> Compile' : '<i class="fas fa-save"></i> Save File'; } }
    
    async function compile() { 
        if (currentOpenFile.endsWith('.json')) { 
            const currentContent = editorEl.getValue(); 
            try { 
                JSON.parse(currentContent); 
                const textEncoder = new TextEncoder(); 
                await saveFileToDb(currentOpenFile, textEncoder.encode(currentContent)); 
                if (currentOpenFile === 'suggestions.json') await loadCustomSuggestions(); 
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Đã lưu file ${currentOpenFile}!`, showConfirmButton: false, timer: 2000 }); 
            } catch (e) { 
                Swal.fire({ icon: 'error', title: 'Lỗi cú pháp JSON', html: `Vui lòng sửa lỗi trước khi lưu:<br><pre style="text-align:left; background-color:#f3f3f3; padding: 5px;">${e.message}</pre>`, }); 
            } 
            return; 
        } 
        
        if (mainFileSelector.value !== currentOpenFile) { 
            const currentContent = editorEl.getValue(); 
            const textEncoder = new TextEncoder(); 
            await saveFileToDb(currentOpenFile, textEncoder.encode(currentContent)); 
            globalEn.writeMemFSFile(currentOpenFile, textEncoder.encode(currentContent)); 
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Đã lưu file ${currentOpenFile}`, showConfirmButton: false, timer: 2000 }); 
            return; 
        } 
        
        if (!globalEn.isReady()) { console.log("Engine not ready yet"); return; } 
        loadingOverlay.style.display = 'flex'; 
        loadingText.textContent = `Đang biên dịch ${mainTexFile}...`; 
        compileBtn.disabled = true; 
        compileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compiling...'; 
        
        const currentContentData = new TextEncoder().encode(editorEl.getValue()); 
        await saveFileToDb(mainTexFile, currentContentData); 
        globalEn.writeMemFSFile(mainTexFile, currentContentData); 
        globalEn.setEngineMainFile(mainTexFile); 
        
        const r = await globalEn.compileLaTeX(); 
        consoleOutput.innerHTML = r.log || "No log output."; 
        loadingOverlay.style.display = 'none'; 
        compileBtn.disabled = false; 
        compileBtn.innerHTML = '<i class="fas fa-play"></i> Biên Dịch'; 
        
        if (r.status === 0) { 
            const pdfblob = new Blob([r.pdf], { type: 'application/pdf' }); 
            const objectURL = URL.createObjectURL(pdfblob); 
            pdfbox.innerHTML = `<embed src="${objectURL}" width="100%" height="100%" type="application/pdf">`; 
            await parseLogAndCacheDependencies(r.log); 
        } else { 
            pdfbox.innerHTML = `<div style="padding: 20px; color: red;">Biên dịch thất bại. Kiểm tra Console Output.</div>`; 
        } 
    } 
    
    async function init() {
        // Cấu hình Editor và Theme
        const savedTheme = localStorage.getItem('editorTheme') || 'monokai';
        editorEl.setTheme(`ace/theme/${savedTheme}`);
        if (themeSelector) themeSelector.value = savedTheme;
        editorEl.session.setMode("ace/mode/latex");
        editorEl.session.setUseWrapMode(true);
        editorEl.setFontSize(16);
        editorEl.resize(true);
        editorEl.setOptions({ enableBasicAutocompletion: true, enableLiveAutocompletion: true, showFoldWidgets: true });
        editorEl.session.setFoldStyle("markbeginend");
        const langTools = ace.require("ace/ext/language_tools");
        const customCompleter = { getCompletions: (editor, session, pos, prefix, callback) => callback(null, customSuggestions) };
        langTools.addCompleter(customCompleter);

        // Gán tất cả các sự kiện
        zipLoaderBtn.addEventListener('click', () => zipLoaderInput.click());
        zipLoaderInput.addEventListener('change', handleZipLoad);
        fileManagerBtn.addEventListener('click', showFileManager);
        mainFileSelector.addEventListener('change', handleMainFileChange);
        templateSelector.addEventListener('change', handleTemplateChange);
        compileBtn.addEventListener('click', compile);
        consoleHeader.addEventListener('click', toggleConsole);
        clearCacheBtn.addEventListener('click', clearStyCache);
        showHelpBtn.addEventListener('click', showHelpModal);
        downloadZipBtn.addEventListener('click', downloadProjectAsZip);
        if (openV2Btn) openV2Btn.addEventListener('click', () => window.open('indexV4.html', '_blank'));
        if (authorInfoBtn) authorInfoBtn.addEventListener('click', showAuthorInfo);
        if (themeSelector) themeSelector.addEventListener('change', (e) => { const newTheme = e.target.value; editorEl.setTheme(`ace/theme/${newTheme}`); localStorage.setItem('editorTheme', newTheme); });
        if (snippetManagerBtn) snippetManagerBtn.addEventListener('click', showSnippetManager);
        if (editSnippetsBtn) editSnippetsBtn.addEventListener('click', () => openFileInEditor('snippets.json'));
        if (editSuggestionsBtn) editSuggestionsBtn.addEventListener('click', () => openFileInEditor('suggestions.json'));
        if (downloadCurrentTexBtn) downloadCurrentTexBtn.addEventListener('click', () => { const content = editorEl.getValue(); if (!content.trim()) return Swal.fire({icon:'warning', title:'Tệp rỗng', text:'Không có nội dung để tải về!'}); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], {type:'text/plain;charset=utf-8'})); link.download = currentOpenFile || 'current-file.tex'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); });
        if (openGanIdBtn) openGanIdBtn.addEventListener('click', () => {
             if (typeof openAssignIdDialog === 'function') {
                 openAssignIdDialog();
             } else {
                 console.error('Hàm gán ID không tồn tại');
             }
        });

        // Khởi tạo các thành phần giao diện
        initResizer();
        initFooterPanel();
        // === KHAI BÁO HÀM "CẦU NỐI" NGAY TRƯỚC KHI SỬ DỤNG ===
        async function loadFileContentIntoEditor(fileName, content) {
            // Lưu file mới này vào DB
            const textEncoder = new TextEncoder();
            await saveFileToDb(fileName, textEncoder.encode(content));
            globalEn.writeMemFSFile(fileName, textEncoder.encode(content));

            // Mở file đó trong editor
            editorEl.setValue(content, -1);
            currentOpenFile = fileName;
            editorEl.session.setMode("ace/mode/latex");

            // Cập nhật giao diện
            await updateMainFileSelector();
            mainFileSelector.value = fileName;
            mainTexFile = fileName;
            compileBtn.innerHTML = '<i class="fas fa-play"></i> Compile';

            Swal.fire({
                icon: 'success',
                title: 'Đã tải xong!',
                text: `Đã tải và mở file "${fileName}" từ Google Drive.`,
                timer: 2500,
                showConfirmButton: false
            });
        }
        // === KHỞI CHẠY MODULE GOOGLE DRIVE ===
        if (typeof initializeDriveIntegration === 'function') {
    // Truyền cả 3 tham số vào
    initializeDriveIntegration(editorEl, () => currentOpenFile, loadFileContentIntoEditor);
}
        
        // Luồng khởi tạo ứng dụng chính
        try {
            await openDb();
            await preloadPackagedFiles();
            await loadCustomSuggestions();
            await globalEn.loadEngine();
            await loadCacheIntoEngine();
            updateMainFileSelector();
            const firstMainFile = mainFileSelector.value || 'main.tex';
            await openFileInEditor(firstMainFile);
            compileBtn.innerHTML = '<i class="fas fa-play"></i> Compile';
            compileBtn.disabled = false;
            consoleOutput.innerHTML = "Engine loaded. Ready to compile.";
        } catch (err) {
            console.error(err);
            consoleOutput.innerHTML = `Initialization failed: ${err}`;
            compileBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        }
    }
    
    async function updateMainFileSelector() { const allFiles = (await getAllFilesFromDb()).map(f => f.name); const validPrefixes = ['main', 'file', 'de']; mainFileSelector.innerHTML = ''; const filteredTexFiles = allFiles.filter(name => name.endsWith('.tex') && validPrefixes.some(prefix => name.toLowerCase().startsWith(prefix))).sort(); if (filteredTexFiles.length === 0) { const option = document.createElement('option'); option.textContent = 'Không có file chính'; option.disabled = true; mainFileSelector.appendChild(option); return; } filteredTexFiles.forEach(fileName => { const option = document.createElement('option'); option.value = fileName; option.textContent = fileName; mainFileSelector.appendChild(option); }); if (filteredTexFiles.includes(mainTexFile)) { mainFileSelector.value = mainTexFile; } else { mainTexFile = filteredTexFiles[0] || ''; mainFileSelector.value = mainTexFile; } }
    function handleMainFileChange(event) { mainTexFile = event.target.value; openFileInEditor(mainTexFile); }
    async function handleTemplateChange(event) { const templateKey = event.target.value; if (!templateKey) return; const templateContent = TEMPLATES[templateKey]; const newFileName = `main-${templateKey.toLowerCase()}.tex`; const existingFile = await getFileFromDb(newFileName); if (existingFile) { mainTexFile = newFileName; await openFileInEditor(newFileName); updateMainFileSelector(); Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: `Đã mở file có sẵn: ${newFileName}`, showConfirmButton: false, timer: 2500 }); } else { const textEncoder = new TextEncoder(); const templateData = textEncoder.encode(templateContent); await saveFileToDb(newFileName, templateData); globalEn.writeMemFSFile(newFileName, templateData); mainTexFile = newFileName; updateMainFileSelector(); await openFileInEditor(newFileName); Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Đã tạo file mẫu ${newFileName}`, showConfirmButton: false, timer: 2000 }); } ; }
    async function showFileManager() { try { const files = await getAllFilesFromDb(); files.sort((a, b) => a.name.localeCompare(b.name)); const getFileIcon = (fileName) => { if (fileName.endsWith('.tex')) return 'fa-file-code'; if (fileName.endsWith('.sty') || fileName.endsWith('.cls')) return 'fa-file-alt'; if (fileName.endsWith('.json')) return 'fa-file-medical-alt'; if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].some(ext => fileName.endsWith(ext))) return 'fa-file-image'; return 'fa-file'; }; let fileListHtml = files.map(file => `<div class="file-manager-item" data-filename="${file.name}"><div class="file-name"><i class="fas ${getFileIcon(file.name)}"></i><span>${file.name}</span></div><div class="file-actions"><button class="swal2-styled file-open-btn" style="background-color: #007bff;">Mở</button><button class="swal2-styled file-delete-btn" style="background-color: #dc3545;">Xóa</button></div></div>`).join(''); if (files.length === 0) fileListHtml = '<p style="text-align:center; color:#888;">Chưa có file nào trong dự án.</p>'; const managerHTML = `<div class="swal2-content" style="text-align: left;"><div style="display: flex; gap: 10px; margin-bottom: 10px;"><input type="text" id="new-filename-input" class="swal2-input" placeholder="ví dụ: chapter2.tex"><button id="add-new-file-btn" class="swal2-confirm swal2-styled">Thêm file</button></div> <div style="display: flex; gap: 10px; margin-bottom: 20px;"><button id="upload-files-btn-modal" class="swal2-confirm swal2-styled" style="background-color:var(--success-color); width:100%;"><i class="fas fa-upload"></i> Tải lên file lẻ</button></div><div id="file-manager-container">${fileListHtml}</div>`; Swal.fire({ title: '<strong>Quản lý File Dự án</strong>', html: managerHTML, width: '600px', showConfirmButton: false, showCloseButton: true, didOpen: () => { const fileLoaderInput = document.createElement('input'); fileLoaderInput.type = 'file'; fileLoaderInput.multiple = true; fileLoaderInput.style.display = 'none'; document.body.appendChild(fileLoaderInput); document.getElementById('add-new-file-btn').addEventListener('click', handleAddNewFile); document.getElementById('upload-files-btn-modal').addEventListener('click', () => fileLoaderInput.click()); fileLoaderInput.addEventListener('change', (e) => { handleFileLoad(e); Swal.close(); document.body.removeChild(fileLoaderInput); }); document.getElementById('file-manager-container').addEventListener('click', handleFileAction); } }); } catch (error) { Swal.fire('Lỗi', 'Không thể tải danh sách file từ database.', 'error'); console.error(error); } }
    async function handleAddNewFile() { const input = document.getElementById('new-filename-input'); const newFileName = input.value.trim(); if (!newFileName || !newFileName.includes('.')) { Swal.showValidationMessage('Tên file không hợp lệ.'); return; } if (await getFileFromDb(newFileName)) { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'File đã tồn tại!', showConfirmButton: false, timer: 2000 }); return; } await saveFileToDb(newFileName, new Uint8Array()); globalEn.writeMemFSFile(newFileName, new Uint8Array()); Swal.close(); showFileManager(); updateMainFileSelector(); Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Đã thêm file ${newFileName}`, showConfirmButton: false, timer: 2000 }); }
    async function handleFileAction(event) { const target = event.target; const fileItem = target.closest('.file-manager-item'); if (!fileItem) return; const fileName = fileItem.dataset.filename; if (target.classList.contains('file-open-btn')) { await openFileInEditor(fileName); Swal.close(); } else if (target.classList.contains('file-delete-btn')) { Swal.fire({ title: `Xóa file "${fileName}"?`, text: "Hành động này không thể hoàn tác!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Vâng, xóa nó!', cancelButtonText: 'Hủy' }).then(async (result) => { if (result.isConfirmed) { await deleteFileFromDb(fileName); if (typeof globalEn.removeMemFSFile === 'function') { globalEn.removeMemFSFile(fileName); } if (currentOpenFile === fileName) { await openFileInEditor(mainTexFile || 'main.tex'); } Swal.close(); showFileManager(); updateMainFileSelector(); Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã xóa file!', showConfirmButton: false, timer: 2000 }); } }); } }
    async function handleFileLoad(event) { const files = event.target.files; if (!files.length) return; const promises = Array.from(files).map(file => { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = async (e) => { const fileData = new Uint8Array(e.target.result); await saveFileToDb(file.name, fileData); globalEn.writeMemFSFile(file.name, fileData); resolve(); }; reader.onerror = reject; reader.readAsArrayBuffer(file); }); }); await Promise.all(promises); Swal.fire('Thành công', `${files.length} file đã được tải lên và lưu lại.`, 'success'); updateMainFileSelector(); if (typeof showFileManager === 'function') showFileManager(); event.target.value = ''; }
    async function handleZipLoad(event) { const file = event.target.files[0]; if (!file) return; loadingOverlay.style.display = 'flex'; loadingText.textContent = 'Đang giải nén và xử lý file...'; try { const zip = await JSZip.loadAsync(file); const fileEntries = Object.values(zip.files).filter(entry => !entry.dir && !entry.name.startsWith('__MACOSX/') && !entry.name.endsWith('/.DS_Store')); if (fileEntries.length === 0) { loadingOverlay.style.display = 'none'; Swal.fire('Tệp ZIP trống', 'Không tìm thấy tệp hợp lệ nào để import.', 'warning'); return; } let commonPath = ''; const firstPath = fileEntries[0].name; const firstSlashIndex = firstPath.indexOf('/'); if (firstSlashIndex > -1) { const potentialRoot = firstPath.substring(0, firstSlashIndex + 1); if (fileEntries.every(entry => entry.name.startsWith(potentialRoot))) { commonPath = potentialRoot; } } const promises = fileEntries.map(zipEntry => { return zipEntry.async('uint8array').then(async (content) => { const finalFileName = zipEntry.name.substring(commonPath.length); if (finalFileName) { await saveFileToDb(finalFileName, content); globalEn.writeMemFSFile(finalFileName, content); } }); }); await Promise.all(promises); Swal.fire('Thành công!', `${promises.length} file từ ${file.name} đã được giải nén và lưu lại!`, 'success'); updateMainFileSelector(); } catch (error) { console.error("Error processing zip file:", error); Swal.fire('Lỗi', 'Không thể xử lý file zip. Vui lòng kiểm tra file và thử lại.', 'error'); } finally { loadingOverlay.style.display = 'none'; loadingText.textContent = 'Compiling...'; event.target.value = ''; } }
    async function downloadProjectAsZip() { if (!db) { Swal.fire('Lỗi', 'Database không khả dụng.', 'error'); return; } loadingOverlay.style.display = 'flex'; loadingText.textContent = 'Đang nén dự án...'; try { const files = await getAllFilesFromDb(); if (files.length === 0) { Swal.fire('Thông báo', 'Không có file nào để tải về.', 'info'); return; } const zip = new JSZip(); files.forEach(file => zip.file(file.name, file.data)); const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); const date = new Date().toISOString().slice(0, 10); link.download = `latex-project-${date}.zip`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); } catch (error) { console.error("Error creating zip file:", error); Swal.fire('Lỗi', 'Không thể tạo file zip.', 'error'); } finally { loadingOverlay.style.display = 'none'; loadingText.textContent = 'Compiling...'; } }
    function clearStyCache() { if (!db) { Swal.fire('Lỗi', 'Database không khả dụng.', 'error'); return; } Swal.fire({ title: 'Bạn chắc chắn?', html: "Hành động này sẽ <b>xóa tất cả các file đã cache</b> (gói .sty, .cls...).<br>Hành động này không thể hoàn tác và sẽ tải lại trang.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Vâng, xóa hết!', cancelButtonText: 'Hủy' }).then((result) => { if (result.isConfirmed) { db.transaction([STORE_NAME], 'readwrite').objectStore(STORE_NAME).clear().onsuccess = () => Swal.fire('Đã xóa!', 'Cache đã được dọn dẹp. Trang sẽ tải lại.', 'success').then(() => location.reload()); } }); }
    
    function showHelpModal() {
        const helpHTML = `
            <div style="padding: 10px;">
                <h2>Chào mừng đến với Trình soạn thảo LaTeX trên Web!</h2>
                <p>Đây là một môi trường mạnh mẽ để soạn thảo và biên dịch tài liệu LaTeX ngay trên trình duyệt của bạn.</p>
                
                <div style="border: 2px solid var(--primary-color); border-radius: 8px; padding: 15px; margin: 20px 0; background-color: #f8f9fa;">
                    <h3 style="margin-top: 0; color: var(--primary-color);"><i class="fas fa-rocket"></i> Khởi tạo nhanh cho người dùng mới</h3>
                    <p>Để có một môi trường làm việc đầy đủ với các gói lệnh và mẫu phổ biến, bạn hãy làm theo các bước sau:</p>
                    <ol style="padding-left: 20px; font-size: 1.1em;">
                        <li style="margin-bottom: 10px;">
                            Tải về bộ khởi tạo tại đây: 
                            <a href="https://drive.google.com/file/d/1ypQZClo_xQUH5eLOM8hTQdQ1xajpYPen/view?usp=sharing" target="_blank" style="font-weight: bold; text-decoration: none; color: #fff; background-color: var(--success-color); padding: 5px 10px; border-radius: 5px;">
                               <i class="fas fa-cloud-download-alt"></i> Tải Kho Mẫu.zip
                            </a>
                        </li>
                        <li style="margin-bottom: 10px;">
                            Sau khi tải xong, nhấn vào nút <b>Tải lên .zip</b> <i class="fas fa-file-archive"></i> trên thanh công cụ.
                        </li>
                        <li>
                            Chọn file <code>Kho Mẫu.zip</code> bạn vừa tải về để nạp toàn bộ dự án vào trình soạn thảo.
                        </li>
                    </ol>
                </div>

                <h3><i class="fas fa-tools"></i> Các Chức Năng Chính Khác</h3>
                <ul>
                    <li><i class="fas fa-sitemap"></i><b> Quản lý File:</b> Thêm, xóa, mở và tải lên các file lẻ.</li>
                    <li><i class="fas fa-key"></i><b> File chính:</b> Chọn file <code>.tex</code> chính để biên dịch.</li>
                    <li><i class="fas fa-magic"></i><b> Mẫu:</b> Nhanh chóng tạo một file .tex mới từ các mẫu có sẵn.</li>
                    <li><i class="fab fa-google"></i><b> Đăng nhập:</b> Lưu và đồng bộ file với Google Drive (chỉ tài khoản được cấp phép).</li>
                </ul>
            </div>
        `;
        Swal.fire({
            title: '<strong>Hướng Dẫn Sử Dụng</strong>', icon: 'info', html: helpHTML,
            showCloseButton: true, focusConfirm: false, width: '800px',
            confirmButtonText: '<i class="fa fa-thumbs-up"></i> Đã hiểu!',
        });
    }
    
    async function preloadPackagedFiles() { const textEncoder = new TextEncoder(); for (const fileName in PREPACKAGED_FILES) { if (!(await getFileFromDb(fileName))) { await saveFileToDb(fileName, textEncoder.encode(PREPACKAGED_FILES[fileName])); } } }
    async function loadCacheIntoEngine() { const files = await getAllFilesFromDb(); files.forEach(file => globalEn.writeMemFSFile(file.name, file.data)); }
    async function loadCustomSuggestions() { const fileData = await getFileFromDb('suggestions.json'); if (fileData) { try { customSuggestions = JSON.parse(new TextDecoder().decode(fileData)); } catch(e) { console.error('Failed to parse suggestions.json:', e); customSuggestions = []; } } }
    async function parseLogAndCacheDependencies(logContent) { const fileRegex = /\(([^)\s]+\.(?:cls|sty|def|clo|ldf|cfg|tex|bst))\s?/g; let match; const dependencies = new Set(); while ((match = fileRegex.exec(logContent)) !== null) { dependencies.add(match[1].split('/').pop()); } for (const fileName of dependencies) { if (await getFileFromDb(fileName)) continue; try { const response = await fetch(`${TEXLIVE_BASE_URL}${TEXLIVE_VERSION}/${fileName}`); if (response.ok) { const fileData = await response.arrayBuffer(); await saveFileToDb(fileName, new Uint8Array(fileData)); globalEn.writeMemFSFile(fileName, new Uint8Array(fileData)); console.log(`[Cache SAVE] ${fileName}`); } } catch (error) { console.error(`Error fetching ${fileName}:`, error); } } }
    function toggleConsole() { consoleOutput.classList.toggle('collapsed'); consoleToggleIcon.textContent = consoleOutput.classList.contains('collapsed') ? '▼' : '▲'; }
    
    // KHỞI CHẠY ỨNG DỤNG
    init();
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', main); } else { main(); }
//</script>