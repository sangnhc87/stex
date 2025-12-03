"use strict";
let availableTemplates = [];
// =====================================================================
// ===        KHỐI MÃ THAY THẾ PdfTeXEngine (TRÁI TIM MỚI)        ===
// =====================================================================

const BACKEND_API_URL = 'https://tikz2png-227060125780.asia-southeast1.run.app';

var exports = {};
var EngineStatus;
(function (EngineStatus) {
    EngineStatus[EngineStatus["Init"] = 1] = "Init";
    EngineStatus[EngineStatus["Ready"] = 2] = "Ready";
    EngineStatus[EngineStatus["Busy"] = 3] = "Busy";
    EngineStatus[EngineStatus["Error"] = 4] = "Error";
})(EngineStatus || (EngineStatus = {}));

class CompileResult {
    constructor() { this.pdf = undefined; this.status = -1; this.log = 'N/A'; this.synctex = undefined; }
}

class PdfTeXEngine {
    constructor() {
        this.latexWorkerStatus = EngineStatus.Init;
        this.sessionId = null;
        this.fileBuffer = {};
        this.mainFile = 'main.tex';
    }

    async loadEngine() {
        this.latexWorkerStatus = EngineStatus.Init;
        console.log("Connecting to backend compiler at:", BACKEND_API_URL);
        try {
            const response = await fetch(`${BACKEND_API_URL}/api/init-session`, { method: 'POST' });
            if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
            const data = await response.json();
            if (data.success && data.session_id) {
                this.sessionId = data.session_id;
                this.latexWorkerStatus = EngineStatus.Ready;
                console.log("Connection successful! Session ID:", this.sessionId);
            } else { throw new Error(data.error || 'Invalid session_id'); }
        } catch (error) {
            this.latexWorkerStatus = EngineStatus.Error;
            console.error("Critical backend connection error:", error);
            if (typeof Swal !== 'undefined') Swal.fire('Lỗi Kết Nối', 'Không thể kết nối đến server biên dịch.', 'error');
            throw error;
        }
    }

    isReady() { return this.latexWorkerStatus === EngineStatus.Ready; }
    checkEngineStatus() { if (!this.isReady()) throw new Error('Engine is not ready.'); }
    writeMemFSFile(filename, data) { this.fileBuffer[filename] = (typeof data === 'string') ? new TextEncoder().encode(data) : data; }
    removeMemFSFile(filename) { delete this.fileBuffer[filename]; }
    setEngineMainFile(filename) { this.mainFile = filename; }
    makeMemFSFolder() { }
    flushCache() { }

    async compileLaTeX() {
        this.checkEngineStatus();
        this.latexWorkerStatus = EngineStatus.Busy;
        const report = new CompileResult();
        try {
            const formData = new FormData();
            formData.append('session_id', this.sessionId);
            let fileCount = 0;
            for (const filename in this.fileBuffer) {
                if (filename !== this.mainFile) {
                    formData.append('image_file', new Blob([this.fileBuffer[filename]]), filename);
                    fileCount++;
                }
            }
            if (fileCount > 0) {
                const uploadRes = await fetch(`${BACKEND_API_URL}/api/upload-image-batch`, { method: 'POST', body: formData });
                if (!uploadRes.ok) throw new Error("Failed to upload supplementary files.");
            }
            const mainContent = new TextDecoder().decode(this.fileBuffer[this.mainFile] || '');
            const compileBody = new URLSearchParams({ latex_code: mainContent, session_id: this.sessionId });
            const compileRes = await fetch(`${BACKEND_API_URL}/api/compile-latex-pdf`, {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: compileBody
            });
            if (compileRes.ok) {
                report.status = 0;
                report.pdf = new Uint8Array(await compileRes.blob().then(b => b.arrayBuffer()));
                report.log = "Compilation successful on server.";
            } else {
                const errData = await compileRes.json();
                report.status = 1;
                report.log = errData.error || "Unknown server error.";
            }
        } catch (error) {
            report.status = 1;
            report.log = `Client-side or network error: ${error.message}`;
        } finally {
            this.latexWorkerStatus = EngineStatus.Ready;
        }
        return report;
    }
}
function numberQuestions(text, selectedEnvs, startNumber) {
    let questionCounters = {};
    selectedEnvs.forEach(env => {
        questionCounters[env] = startNumber;
    });

    const lines = text.split('\n');
    const processedLines = lines.map(line => {
        const beginEnvMatch = line.match(/\\begin\{(\w+)\}/);
        if (beginEnvMatch) {
            const envType = beginEnvMatch[1];
            if (selectedEnvs.includes(envType)) {
                const currentNumber = questionCounters[envType]++;
                return `%%========== Câu ${currentNumber} (${envType}) ==========\n${line}`;
            }
        }
        return line;
    });
    return processedLines.join('\n');
}
function beautifyLatexCode(content) {
    // === DANH SÁCH CÁC MÔI TRƯỜNG LUÔN SÁT LỀ ===
    const topLevelEnvs = ['ex', 'vd', 'bt'];

    const indent = '    '; // 4 dấu cách
    const lines = content.split('\n');
    let beautifiedLines = [];

    // Cờ để biết chúng ta có đang ở bên trong một môi trường "top-level" hay không
    let inTopLevelEnvironment = false;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue; // Bỏ qua dòng trống

        const beginMatch = line.match(/\\begin\{([a-zA-Z*]+)\}/);
        const endMatch = line.match(/\\end\{([a-zA-Z*]+)\}/);

        if (beginMatch) {
            const envName = beginMatch[1];
            // Nếu đây là một môi trường top-level
            if (topLevelEnvs.includes(envName)) {
                beautifiedLines.push(line); // Thêm dòng \begin sát lề
                inTopLevelEnvironment = true;
            } else {
                // Nếu là môi trường khác, thụt lề nếu nó nằm trong môi trường top-level
                beautifiedLines.push((inTopLevelEnvironment ? indent : '') + line);
            }
        } else if (endMatch) {
            const envName = endMatch[1];
            // Nếu đây là môi trường top-level
            if (topLevelEnvs.includes(envName)) {
                beautifiedLines.push(line); // Thêm dòng \end sát lề
                inTopLevelEnvironment = false;
            } else {
                // Nếu là môi trường khác, thụt lề nếu nó nằm trong môi trường top-level
                beautifiedLines.push((inTopLevelEnvironment ? indent : '') + line);
            }
        } else {
            // Nếu là một dòng nội dung bình thường
            if (inTopLevelEnvironment) {
                beautifiedLines.push(indent + line); // Thụt lề nếu ở trong môi trường top-level
            } else {
                beautifiedLines.push(line); // Giữ nguyên nếu ở ngoài
            }
        }
    }
    return beautifiedLines.join('\n');
}
function removeLatexComments(text) {
    return text.split('\n')
        .filter(line => !line.trim().startsWith('%'))
        .join('\n');
}

async function showLatexToolsModal() {
    const editor = ace.edit("editor");
    const originalContent = editor.getValue();

    const { value: formValues } = await Swal.fire({
        title: 'Công cụ xử lý LaTeX',
        html: `
            <div id="latex-tools-form" style="text-align: left; font-size: 1em;">
                <p>Chọn các hành động bạn muốn áp dụng lên toàn bộ tài liệu.</p>
                <hr>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="tool-beautify">
                    <label class="form-check-label" for="tool-beautify">
                        <strong>Làm đẹp Code</strong> (Thụt lề tự động)
                    </label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="tool-remove-comments">
                    <label class="form-check-label" for="tool-remove-comments">
                        <strong>Xóa tất cả Comment</strong> (Các dòng bắt đầu bằng %)
                    </label>
                </div>
                <hr>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="tool-numbering-toggle">
                    <label class="form-check-label" for="tool-numbering-toggle">
                        <strong>Đánh số câu hỏi...</strong>
                    </label>
                </div>
                <div id="numbering-options" style="display: none; padding-left: 25px; margin-top: 10px;">
                    <div class="mb-2">
                        <label for="tool-envs" class="form-label" style="font-size: 0.9em;">Môi trường (cách nhau bởi dấu phẩy):</label>
                        <input type="text" id="tool-envs" class="swal2-input" value="ex,vd,bt" style="width: 90%;">
                    </div>
                    <div>
                        <label for="tool-start-number" class="form-label" style="font-size: 0.9em;">Số bắt đầu:</label>
                        <input type="number" id="tool-start-number" class="swal2-input" value="1" min="1" style="width: 90%;">
                    </div>
                </div>
            </div>
        `,
        confirmButtonText: '<i class="fas fa-check"></i> Thực hiện',
        showCancelButton: true,
        cancelButtonText: 'Hủy',
        focusConfirm: false,
        didOpen: () => {
            const toggle = document.getElementById('tool-numbering-toggle');
            const options = document.getElementById('numbering-options');
            toggle.addEventListener('change', () => {
                options.style.display = toggle.checked ? 'block' : 'none';
            });
        },
        preConfirm: () => {
            return {
                beautify: document.getElementById('tool-beautify').checked,
                removeComments: document.getElementById('tool-remove-comments').checked,
                doNumbering: document.getElementById('tool-numbering-toggle').checked,
                envs: document.getElementById('tool-envs').value.split(',').map(e => e.trim()).filter(e => e),
                startNumber: parseInt(document.getElementById('tool-start-number').value, 10) || 1
            }
        }
    });

    if (formValues) {
        let newContent = originalContent;

        if (formValues.doNumbering && formValues.envs.length > 0) {
            newContent = numberQuestions(newContent, formValues.envs, formValues.startNumber);
        }
        if (formValues.removeComments) {
            newContent = removeLatexComments(newContent);
        }
        if (formValues.beautify) {
            newContent = beautifyLatexCode(newContent);
        }

        editor.setValue(newContent, -1);
        Swal.fire('Hoàn thành!', 'Đã áp dụng các thay đổi vào trình soạn thảo.', 'success');
    }
}
function toggleFoldAllEnvironments(envNames) {
    if (!envNames || envNames.length === 0) return;

    const editor = ace.edit("editor");
    const session = editor.session;
    const document = session.getDocument();
    const lines = document.getAllLines();

    // Tạo một chuỗi regex từ mảng các tên môi trường
    // Ví dụ: ['ex', 'bt'] -> (ex|bt)
    const envPattern = `(${envNames.join('|')})`;
    const beginRegex = new RegExp(`^\\\\begin\\{${envPattern}\\}`);
    const endRegex = new RegExp(`^\\\\end\\{${envPattern}\\}`);

    // Logic kiểm tra để quyết định gập hay mở (không đổi)
    let shouldUnfold = false;
    const allFolds = session.getAllFolds();
    for (const fold of allFolds) {
        const line = session.getLine(fold.start.row);
        if (beginRegex.test(line.trim())) {
            shouldUnfold = true;
            break;
        }
    }

    if (shouldUnfold) {
        // --- LOGIC MỞ HẾT ---
        console.log(`Unfolding all [${envNames.join(', ')}] environments.`);
        // Để chỉ mở các môi trường cụ thể, chúng ta cần lặp và xóa fold
        // Đây là cách làm chính xác hơn là unfold tất cả
        const foldsToRemove = [];
        for (const fold of allFolds) {
            const line = session.getLine(fold.start.row);
            if (beginRegex.test(line.trim())) {
                foldsToRemove.push(fold);
            }
        }
        session.removeFolds(foldsToRemove);

    } else {
        // --- LOGIC GẬP HẾT ---
        console.log(`Folding all [${envNames.join(', ')}] environments.`);
        for (let i = 0; i < lines.length; i++) {
            if (beginRegex.test(lines[i].trim())) {
                let endRow = -1;
                // Cần một stack để xử lý lồng nhau đúng cách
                let depth = 1;
                for (let j = i + 1; j < lines.length; j++) {
                    const currentLine = lines[j].trim();
                    if (beginRegex.test(currentLine)) {
                        depth++;
                    } else if (endRegex.test(currentLine)) {
                        depth--;
                        if (depth === 0) {
                            endRow = j;
                            break;
                        }
                    }
                }

                if (endRow !== -1) {
                    session.addFold("...", new ace.Range(i, lines[i].length, endRow, 0));
                    i = endRow;
                }
            }
        }
    }
}

function changeEditorFontSize(delta) {
    const editor = ace.edit("editor");
    const currentSize = editor.getFontSize();
    const newSize = currentSize + delta;

    // Giới hạn cỡ chữ trong khoảng hợp lý (ví dụ: từ 10px đến 30px)
    if (newSize >= 10 && newSize <= 30) {
        editor.setFontSize(newSize);

        // Cập nhật hiển thị
        const currentFontSizeSpan = document.getElementById('current-font-size');
        if (currentFontSizeSpan) {
            currentFontSizeSpan.textContent = `${newSize}`;
        }

        // Lưu lựa chọn vào localStorage để lần sau mở lại vẫn giữ nguyên
        localStorage.setItem('editorFontSize', newSize);
    }
}

let isMathPreviewInitialized = false; // Cờ để kiểm tra đã khởi tạo hay chưa
function initMathPreview() {
    if (isMathPreviewInitialized) return;

    const editor = ace.edit("editor");
    const tooltip = document.getElementById('math-tooltip');
    let hoverTimeout;

    // Danh sách các cặp dấu và chế độ hiển thị tương ứng
    const delimiters = [
        { start: '\\[', end: '\\\\]', display: true },   // \[ ... \]
        { start: '\\$\\$', end: '\\$\\$', display: true }, // $$ ... $$
        { start: '\\\\\\(', end: '\\\\\\)', display: false },  // \( ... \)
        { start: '\\$', end: '\\$', display: false }    // $ ... $
    ];

    editor.on('mousemove', function (e) {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            const pos = e.getDocumentPosition();
            const line = editor.session.getLine(pos.row);

            let mathContent = null;
            let isDisplayMode = false;

            // Lặp qua từng loại cặp dấu để tìm
            for (const delim of delimiters) {
                // Tạo Regex cho từng cặp dấu
                // Regex này tìm cặp dấu gần nhất bao quanh con trỏ chuột
                const regex = new RegExp(`${delim.start}(.*?)${delim.end}`, 'g');
                let match;

                while ((match = regex.exec(line)) !== null) {
                    const startCol = match.index;
                    const endCol = startCol + match[0].length;

                    // Nếu con trỏ chuột nằm trong cặp dấu này
                    if (pos.column > startCol && pos.column < endCol) {
                        mathContent = match[1]; // Lấy nội dung bên trong
                        isDisplayMode = delim.display;
                        break; // Thoát khỏi vòng lặp while khi đã tìm thấy
                    }
                }

                if (mathContent !== null) {
                    break; // Thoát khỏi vòng lặp for khi đã tìm thấy
                }
            }

            // Phần hiển thị tooltip giữ nguyên như cũ
            if (mathContent !== null) {
                try {
                    tooltip.innerHTML = '';
                    katex.render(mathContent, tooltip, {
                        throwOnError: false,
                        displayMode: isDisplayMode
                    });
                    tooltip.style.left = (e.clientX + 15) + 'px';
                    tooltip.style.top = (e.clientY + 15) + 'px';
                    tooltip.style.display = 'block';
                } catch (err) {
                    tooltip.style.display = 'none';
                }
            } else {
                tooltip.style.display = 'none';
            }
        }, 100);
    });

    editor.container.addEventListener('mouseout', function () {
        tooltip.style.display = 'none';
    });

    isMathPreviewInitialized = true;
    console.log("Math Preview Initialized (Robust Version).");
}
/**
 * Tải file templates.json, phân tích và điền các lựa chọn vào dropdown.
 */
async function initializeTemplatesFromJSON() {
    const templateSelector = document.getElementById('template-selector');
    if (!templateSelector) return;

    try {
        // Tải file chỉ mục JSON từ thư mục gốc
        const response = await fetch('templates.json');
        if (!response.ok) throw new Error('Không thể tải templates.json');

        const templatesConfig = await response.json();

        // Lưu trữ cấu hình để tra cứu sau này
        availableTemplates = templatesConfig;

        // Điền các lựa chọn vào dropdown
        templateSelector.innerHTML = '<option value="">-- Chọn main --</option>';
        availableTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id; // Dùng id làm value
            option.textContent = template.name; // Dùng name để hiển thị
            templateSelector.appendChild(option);
        });

    } catch (error) {
        console.error("Lỗi khi khởi tạo mẫu:", error);
        templateSelector.disabled = true;
        templateSelector.innerHTML = '<option value="">Lỗi tải mẫu</option>';
    }
}
function main() {
    // === LẤY CÁC PHẦN TỬ DOM ===
    const editorEl = ace.edit("editor");
    const compileBtn = document.getElementById("compile-btn");
    const consoleOutput = document.getElementById("console");
    const pdfbox = document.getElementById("pdfbox");
    const zipLoaderInput = document.getElementById('zip-loader-input');
    const templateSelector = document.getElementById('template-selector');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    // Các element khác bạn có thể lấy ở đây

    // === CÁC BIẾN VÀ HẰNG SỐ ===
    const globalEn = new PdfTeXEngine();
    let mainTexFile = 'main.tex';
    let currentOpenFile = 'main.tex';
    let db;
    let customSuggestions = [];
    const DB_NAME = 'LaTeX_IDE_DB_v3'; // Đổi tên để có cache sạch
    const STORE_NAME = 'ProjectFiles';
    const TEMPLATESG = {
        'DeThi': `\\documentclass[12pt]{article}\n\\usepackage[utf8]{vietnam}\n\\usepackage{polyglossia}\n\\begin{document}\n\nĐây là mẫu đề thi.\n\n\\end{document}`,
        'VeHinh': `\\documentclass[12pt,tikz]{standalone}\n\\usepackage{polyglossia}\n\\begin{document}\n\\begin{tikzpicture}\n\t% Vẽ hình ở đây\n\\end{tikzpicture}\n\\end{document}`,
        'Beamer': `\\documentclass{beamer}\n\\usepackage{polyglossia}\n\\usetheme{Madrid}\n\\title{Tiêu đề}\n\\author{Tác giả}\n\\begin{document}\n\\frame{\\titlepage}\n\\begin{frame}{Nội dung}\n\n\\end{frame}\n\\end{document}`,
        'book': `\\documentclass{book}\n\\usepackage[utf8]{vietnam}\n\\usepackage{polyglossia}\n\\title{Tiêu đề sách}\n\\author{Tác giả}\n\\begin{document}\n\\frontmatter\n\\maketitle\n\\mainmatter\n\\chapter{Chương 1}\n\n\\end{document}`
    };
    const PREPACKAGED_FILES = {};
    const DEFAULT_SNIPPETS_JSON = `[ { "name": "Môi trường cơ bản", "type": "folder", "children": [ { "name": "Itemize", "type": "snippet", "content": "\\\\begin{itemize}\\n\\t\\\\item \\n\\\\end{itemize}" }, { "name": "Enumerate", "type": "snippet", "content": "\\\\begin{enumerate}\\n\\t\\\\item \\n\\\\end{enumerate}" } ] }, { "name": "Toán học", "type": "folder", "children": [ { "name": "Phân số", "type": "snippet", "content": "\\\\dfrac{$1}{$2}" } ] } ]`;

    // === CÁC HÀM CƠ SỞ (GIỮ NGUYÊN) ===
    function openDb() { return new Promise((resolve, reject) => { const req = indexedDB.open(DB_NAME, 2); req.onerror = () => reject("DB Error"); req.onsuccess = e => { db = e.target.result; resolve(); }; req.onupgradeneeded = e => { if (!e.target.result.objectStoreNames.contains(STORE_NAME)) e.target.result.createObjectStore(STORE_NAME, { keyPath: 'name' }); }; }); }
    function saveFileToDb(name, data) { if (!db) return Promise.reject("DB not open"); const tx = db.transaction([STORE_NAME], 'readwrite'); return new Promise((resolve, reject) => { const req = tx.objectStore(STORE_NAME).put({ name, data }); req.onsuccess = resolve; req.onerror = e => reject(e.target.error); }); }
    function getFileFromDb(name) { return new Promise(resolve => { if (!db) return resolve(null); db.transaction([STORE_NAME]).objectStore(STORE_NAME).get(name).onsuccess = e => resolve(e.target.result ? e.target.result.data : null); }); }
    function getAllFilesFromDb() { return new Promise(resolve => { if (!db) return resolve([]); db.transaction([STORE_NAME]).objectStore(STORE_NAME).getAll().onsuccess = e => resolve(e.target.result); }); }
    function deleteFileFromDb(name) { return new Promise(resolve => { if (!db) return resolve(); db.transaction([STORE_NAME], 'readwrite').objectStore(STORE_NAME).delete(name).onsuccess = resolve; }); }
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

    /**
 * Mở một file trong trình soạn thảo Ace, lưu file cũ, và cập nhật giao diện.
 * PHIÊN BẢN NÂNG CẤP: Đã loại bỏ sự phụ thuộc vào element 'main-file-selector'.
 * @param {string} fileName - Tên của file cần mở.
 */
    async function openFileInEditor(fileName) {
        if (!fileName) {
            editorEl.setValue('Lỗi: Không có tên file để mở.', -1);
            currentOpenFile = '';
            return;
        }

        // 1. Lưu nội dung của file đang mở hiện tại (nếu có) trước khi chuyển file
        if (currentOpenFile && editorEl.getValue()) {
            const currentContent = editorEl.getValue();
            const textEncoder = new TextEncoder();
            await saveFileToDb(currentOpenFile, textEncoder.encode(currentContent));
            globalEn.writeMemFSFile(currentOpenFile, textEncoder.encode(currentContent));
        }

        // 2. Tải nội dung của file mới từ IndexedDB
        let fileData = await getFileFromDb(fileName);
        if (!fileData) {
            // Nếu file không có trong DB (ví dụ: file mới vừa được tạo), tạo nội dung mặc định
            let defaultContent = '';
            if (fileName === 'snippets.json') {
                defaultContent = DEFAULT_SNIPPETS_JSON;
            } else if (fileName === 'suggestions.json') {
                defaultContent = '[]';
            }

            const textEncoder = new TextEncoder();
            fileData = textEncoder.encode(defaultContent);
            // Lưu file mới này vào DB để lần sau có thể mở
            await saveFileToDb(fileName, fileData);
        }

        // 3. Hiển thị nội dung trong editor và cập nhật trạng thái
        editorEl.setValue(new TextDecoder().decode(fileData), -1);
        currentOpenFile = fileName; // Cập nhật file đang mở hiện tại

        // === PHẦN SỬA LỖI QUAN TRỌNG NHẤT ===
        // Bỏ qua việc dùng 'mainFileSelector' và so sánh trực tiếp với biến toàn cục 'mainTexFile'

        // 4. Cập nhật chế độ của editor và giao diện nút bấm
        if (fileName.endsWith('.json')) {
            editorEl.session.setMode("ace/mode/json");
            // File JSON chỉ có thể Lưu, không thể Biên dịch
            compileBtn.innerHTML = `<i class="fas fa-save"></i> Lưu File`;
        } else {
            editorEl.session.setMode("ace/mode/latex");
            // Nếu file đang mở là file chính thì hiện nút "Compile", ngược lại hiện nút "Save".
            if (fileName === mainTexFile) {
                compileBtn.innerHTML = '<i class="fas fa-play"></i> Biên dịch';
            } else {
                compileBtn.innerHTML = '<i class="fas fa-save"></i> Lưu File';
            }
        }
    }

    // === HÀM COMPILE() ĐÃ ĐƯỢC NÂNG CẤP ===
    async function compile() {
        if (!globalEn.isReady()) {
            Swal.fire('Chưa sẵn sàng', 'Đang kết nối đến server biên dịch...', 'info');
            return;
        }

        // Lưu file JSON và các file .tex không phải file chính
        if (currentOpenFile.endsWith('.json') || mainTexFile !== currentOpenFile) {
            const content = new TextEncoder().encode(editorEl.getValue());
            await saveFileToDb(currentOpenFile, content);
            globalEn.writeMemFSFile(currentOpenFile, content);
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Đã lưu: ${currentOpenFile}`, showConfirmButton: false, timer: 1500 });
            if (currentOpenFile.endsWith('.json')) {
                if (currentOpenFile === 'suggestions.json') await loadCustomSuggestions();
                return;
            }
        }

        // Chỉ biên dịch file chính
        if (mainTexFile !== currentOpenFile) return;

        loadingOverlay.style.display = 'flex';
        loadingText.textContent = `Đang biên dịch ${mainTexFile}...`;
        compileBtn.disabled = true;
        compileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compiling...';

        try {
            globalEn.writeMemFSFile(mainTexFile, editorEl.getValue());
            globalEn.setEngineMainFile(mainTexFile);

            const r = await globalEn.compileLaTeX();

            consoleOutput.innerHTML = r.log.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
            if (r.status === 0 && r.pdf) {
                // === PDF Download Handler ===
                const pdfBlob = new Blob([r.pdf], { type: 'application/pdf' });
                const pdfUrl = URL.createObjectURL(pdfBlob);
                const downloadBtn = document.getElementById('download-pdf-btn');

                if (downloadBtn) {
                    downloadBtn.disabled = false;
                    downloadBtn.onclick = () => {
                        const link = document.createElement('a');
                        link.href = pdfUrl;
                        link.download = 'output.pdf';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    };
                }

                // === PDF.js Rendering ===
                const pdfData = r.pdf;
                const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                const pdf = await loadingTask.promise;

                pdfbox.innerHTML = ''; // Clear previous content

                // Check which view to use
                if (window.location.pathname.includes('index_11.html')) {
                    // === CLASSIC VIEW (Simple Scroll) ===
                    const container = document.createElement('div');
                    container.classList.add('pdf-view-classic');
                    container.style.overflow = 'auto';
                    container.style.height = '100%';
                    pdfbox.appendChild(container);

                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const scale = 1.5;
                        const viewport = page.getViewport({ scale });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');

                        // High DPI Support
                        const outputScale = window.devicePixelRatio || 1;
                        canvas.width = Math.floor(viewport.width * outputScale);
                        canvas.height = Math.floor(viewport.height * outputScale);
                        canvas.style.width = Math.floor(viewport.width) + "px";
                        canvas.style.height = Math.floor(viewport.height) + "px";

                        canvas.style.display = 'block';
                        canvas.style.marginBottom = '10px';
                        canvas.style.border = '1px solid #ccc';
                        container.appendChild(canvas);

                        const transform = outputScale !== 1
                            ? [outputScale, 0, 0, outputScale, 0, 0]
                            : null;

                        await page.render({ canvasContext: context, viewport: viewport, transform: transform }).promise;
                    }

                } else {
                    // === RICH MODERN VIEW (Toolbar + Sidebar + Zoom) ===
                    // 1. Build UI Structure
                    const appDiv = document.createElement('div');
                    appDiv.className = 'pdf-viewer-app';

                    // Toolbar
                    const toolbar = document.createElement('div');
                    toolbar.className = 'pdf-toolbar';
                    toolbar.innerHTML = `
                        <button id="pdf-toggle-sidebar" title="Toggle Sidebar"><i class="fas fa-bars"></i></button>
                        <div class="pdf-search-box">
                            <i class="fas fa-search pdf-search-icon"></i>
                            <input type="text" id="pdf-search-input" class="pdf-search-input" placeholder="Tìm kiếm...">
                        </div>
                        <div class="spacer"></div>
                        <button id="pdf-zoom-out" title="Zoom Out"><i class="fas fa-minus"></i></button>
                        <span id="pdf-scale-display" style="font-size: 13px; min-width: 50px; text-align: center;">100%</span>
                        <button id="pdf-zoom-in" title="Zoom In"><i class="fas fa-plus"></i></button>
                    `;
                    appDiv.appendChild(toolbar);

                    // Body
                    const body = document.createElement('div');
                    body.className = 'pdf-body';

                    // Sidebar
                    const sidebar = document.createElement('div');
                    sidebar.className = 'pdf-sidebar';
                    sidebar.innerHTML = `
                        <div class="pdf-sidebar-header">Table of Contents</div>
                        <div class="pdf-sidebar-content" id="pdf-outline-container"></div>
                    `;
                    body.appendChild(sidebar);

                    // Main View
                    const mainView = document.createElement('div');
                    mainView.className = 'pdf-main-view';
                    body.appendChild(mainView);

                    appDiv.appendChild(body);
                    pdfbox.appendChild(appDiv);

                    // 2. State & Logic
                    let currentScale = 1.2; // Increased default scale

                    const renderPages = async () => {
                        mainView.innerHTML = ''; // Clear pages
                        document.getElementById('pdf-scale-display').textContent = `${Math.round(currentScale * 100)}%`;

                        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                            const page = await pdf.getPage(pageNum);
                            const viewport = page.getViewport({ scale: currentScale });

                            const pageContainer = document.createElement('div');
                            pageContainer.className = 'pdf-page-container';
                            pageContainer.style.width = `${viewport.width}px`;
                            pageContainer.style.height = `${viewport.height}px`;
                            pageContainer.dataset.pageNumber = pageNum; // For linking

                            const canvas = document.createElement('canvas');
                            canvas.className = 'pdf-page-canvas';

                            // High DPI Support
                            const outputScale = window.devicePixelRatio || 1;
                            canvas.width = Math.floor(viewport.width * outputScale);
                            canvas.height = Math.floor(viewport.height * outputScale);
                            canvas.style.width = Math.floor(viewport.width) + "px";
                            canvas.style.height = Math.floor(viewport.height) + "px";

                            pageContainer.appendChild(canvas);
                            mainView.appendChild(pageContainer);

                            const transform = outputScale !== 1
                                ? [outputScale, 0, 0, outputScale, 0, 0]
                                : null;

                            // Render Canvas
                            const renderContext = {
                                canvasContext: canvas.getContext('2d'),
                                viewport: viewport,
                                transform: transform
                            };
                            await page.render(renderContext).promise;

                            // --- Render Text Layer (For Selection & Search) ---
                            const textLayerDiv = document.createElement('div');
                            textLayerDiv.className = 'textLayer';
                            textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
                            textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;
                            pageContainer.appendChild(textLayerDiv);

                            const textContent = await page.getTextContent();
                            pdfjsLib.renderTextLayer({
                                textContent: textContent,
                                container: textLayerDiv,
                                viewport: viewport,
                                textDivs: []
                            });
                        }
                    };

                    // Initial Render
                    await renderPages();

                    // 3. Event Handlers
                    // Zoom
                    document.getElementById('pdf-zoom-in').onclick = () => {
                        currentScale += 0.25;
                        renderPages();
                    };
                    document.getElementById('pdf-zoom-out').onclick = () => {
                        if (currentScale > 0.5) {
                            currentScale -= 0.25;
                            renderPages();
                        }
                    };

                    // Sidebar Toggle
                    document.getElementById('pdf-toggle-sidebar').onclick = () => {
                        sidebar.classList.toggle('collapsed');
                    };

                    // Search Functionality (Simple Browser Find)
                    const searchInput = document.getElementById('pdf-search-input');
                    searchInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const query = searchInput.value;
                            if (query) {
                                // Use browser's native find
                                window.find(query, false, false, true, false, true, false);
                            }
                        }
                    });

                    // 4. Load Outline (Table of Contents)
                    const outline = await pdf.getOutline();
                    const outlineContainer = document.getElementById('pdf-outline-container');

                    if (outline && outline.length > 0) {
                        const renderOutlineItem = (items, container) => {
                            items.forEach(item => {
                                const div = document.createElement('div');
                                div.className = 'pdf-outline-item';
                                div.textContent = item.title;
                                div.title = item.title;

                                // Click to jump
                                div.onclick = async () => {
                                    if (item.dest) {
                                        const dest = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest;
                                        if (dest) {
                                            const pageRef = dest[0];
                                            const pageIndex = await pdf.getPageIndex(pageRef);
                                            const pageNum = pageIndex + 1;
                                            // Scroll to page
                                            const targetPage = mainView.querySelector(`[data-page-number="${pageNum}"]`);
                                            if (targetPage) targetPage.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }
                                };
                                container.appendChild(div);

                                if (item.items && item.items.length > 0) {
                                    const childrenDiv = document.createElement('div');
                                    childrenDiv.className = 'pdf-outline-children';
                                    renderOutlineItem(item.items, childrenDiv);
                                    container.appendChild(childrenDiv);
                                }
                            });
                        };
                        renderOutlineItem(outline, outlineContainer);
                    } else {
                        outlineContainer.innerHTML = '<div style="padding:10px; color:#777; font-style:italic;">No Table of Contents</div>';
                    }
                }

            } else {
                pdfbox.innerHTML = `<div class="error-display">Biên dịch thất bại.</div>`;
            }
        } catch (error) {
            pdfbox.innerHTML = `<div class="error-display">Lỗi client: ${error.message}</div>`;
        } finally {
            loadingOverlay.style.display = 'none';
            compileBtn.disabled = false;
            compileBtn.innerHTML = '<i class="fas fa-play"></i> Biên dịch';
        }
    }

    async function init() {

        // --- BƯỚC 1: Cấu hình Editor và Theme ---
        const savedTheme = localStorage.getItem('editorTheme') || 'monokai';
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) themeSelector.value = savedTheme;
        editorEl.setTheme(`ace/theme/${savedTheme}`);
        editorEl.session.setMode("ace/mode/latex");

        const savedFontSize = parseInt(localStorage.getItem('editorFontSize')) || 16;
        const currentFontSizeSpan = document.getElementById('current-font-size');
        editorEl.setFontSize(savedFontSize);
        if (currentFontSizeSpan) currentFontSizeSpan.textContent = `${savedFontSize}`;

        editorEl.setOptions({ enableBasicAutocompletion: true, enableLiveAutocompletion: true, showFoldWidgets: true });
        editorEl.session.setFoldStyle("markbeginend");
        const langTools = ace.require("ace/ext/language_tools");
        const customCompleter = { getCompletions: (editor, session, pos, prefix, callback) => callback(null, customSuggestions) };
        langTools.addCompleter(customCompleter);

        // --- BƯỚC 2: Gán sự kiện cho tất cả các nút trên giao diện ---
        // (Đã loại bỏ các listener cho các nút Google Drive và mainFileSelector)
        const zipLoaderInput = document.getElementById('zip-loader-input');
        const templateSelector = document.getElementById('template-selector');

        document.getElementById('compile-btn')?.addEventListener('click', compile);
        document.getElementById('zip-loader-btn')?.addEventListener('click', () => zipLoaderInput?.click());
        zipLoaderInput?.addEventListener('change', handleZipLoad);
        document.getElementById('file-manager-btn')?.addEventListener('click', showFileManager);
        templateSelector?.addEventListener('change', handleTemplateChange);
        document.getElementById('main-file-selector')?.addEventListener('change', handleMainFileChange); // Added listener
        document.getElementById('console-header')?.addEventListener('click', toggleConsole);
        document.getElementById('clear-cache-btn')?.addEventListener('click', clearStyCache);
        document.getElementById('show-help-btn')?.addEventListener('click', showHelpModal);
        document.getElementById('download-zip-btn')?.addEventListener('click', downloadProjectAsZip);
        document.getElementById('open-v2-btn')?.addEventListener('click', () => window.open('index_11.html', '_blank'));
        document.getElementById('author-info-btn')?.addEventListener('click', showAuthorInfo);
        themeSelector?.addEventListener('change', (e) => { const theme = e.target.value; editorEl.setTheme(`ace/theme/${theme}`); localStorage.setItem('editorTheme', theme); });
        document.getElementById('snippet-manager-btn')?.addEventListener('click', showSnippetManager);
        document.getElementById('edit-snippets-btn')?.addEventListener('click', () => openFileInEditor('snippets.json'));
        document.getElementById('edit-suggestions-btn')?.addEventListener('click', () => openFileInEditor('suggestions.json'));
        document.getElementById('download-current-tex-btn')?.addEventListener('click', () => {
            const content = editorEl.getValue();
            if (!content.trim()) return Swal.fire({ icon: 'warning', title: 'Tệp rỗng' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
            link.download = currentOpenFile || 'current-file.tex';
            link.click();
            URL.revokeObjectURL(link.href);
        });
        document.getElementById('open-gan-id-btn')?.addEventListener('click', () => { if (typeof openAssignIdDialog === 'function') openAssignIdDialog(); });
        document.getElementById('generate-qr-btn')?.addEventListener('click', () => QrAnswerExtractor.showModal());
        document.getElementById('latex-tools-btn')?.addEventListener('click', showLatexToolsModal);
        document.getElementById('fold-problems-btn')?.addEventListener('click', () => toggleFoldAllEnvironments(['ex', 'vd', 'bt']));
        document.getElementById('fold-structure-btn')?.addEventListener('click', () => toggleFoldAllEnvironments(['section', 'subsection']));
        document.getElementById('decrease-font-size-btn')?.addEventListener('click', () => changeEditorFontSize(-1));
        document.getElementById('increase-font-size-btn')?.addEventListener('click', () => changeEditorFontSize(1));

        // --- BƯỚC 3: Khởi tạo các thành phần giao diện khác ---
        initResizer();
        initFooterPanel();
        initMathPreview();
        await initializeTemplatesFromJSON();

        // --- FIREBASE AUTH SETUP ---
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const adminBtn = document.getElementById('admin-btn');

        loginBtn?.addEventListener('click', handleLogin);
        logoutBtn?.addEventListener('click', handleLogout);
        adminBtn?.addEventListener('click', async () => {
            const user = firebase.auth().currentUser;
            if (!user) return;

            // Check role again just to be sure
            const doc = await firestoreDb.collection('users').doc(user.uid).get();
            const userData = doc.data();

            if (userData && userData.role === 'admin') {
                showAdminDashboard();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Không có quyền Admin',
                    html: `
                        <p>Email <b>${user.email}</b> chưa được cấp quyền Admin.</p>
                        <p>Vui lòng vào Firebase Console -> Firestore -> users -> tìm email này -> sửa <b>role</b> thành <b>'admin'</b>.</p>
                    `
                });
            }
        });

        // Monitor Auth State
        if (typeof firebase === 'undefined') {
            console.error("Firebase SDK not loaded.");
            Swal.fire('Lỗi hệ thống', 'Không thể kết nối đến máy chủ xác thực (Firebase SDK missing). Vui lòng kiểm tra kết nối mạng hoặc tải lại trang.', 'error');
        } else {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    loginBtn.style.display = 'none';
                    logoutBtn.style.display = 'inline-block';
                    // ALWAYS show Admin button if logged in, so user knows it exists.
                    // We check permission on click.
                    adminBtn.style.display = 'inline-block';

                    console.log("User logged in:", user.email);

                    // Check Firestore for user status
                    const userRef = firestoreDb.collection('users').doc(user.uid);
                    const doc = await userRef.get();

                    if (!doc.exists) {
                        // NEW USER
                        // Check if there are ANY admins yet
                        const adminQuery = await firestoreDb.collection('users').where('role', '==', 'admin').get();
                        const isFirstUser = adminQuery.empty;

                        await userRef.set({
                            email: user.email,
                            status: isFirstUser ? 'approved' : 'pending',
                            role: isFirstUser ? 'admin' : 'user',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });

                        if (isFirstUser) {
                            Swal.fire('Xin chào Admin!', 'Bạn là người dùng đầu tiên, hệ thống đã tự động cấp quyền Admin cho bạn.', 'success');
                            unlockEditor();
                            adminBtn.style.display = 'inline-block';
                        } else {
                            Swal.fire('Đăng ký thành công', 'Tài khoản của bạn đang chờ duyệt.', 'info');
                            lockEditor();
                        }
                    } else {
                        // EXISTING USER
                        const userData = doc.data();

                        // BOOTSTRAP: If I am pending, but there are NO admins (maybe I was created before logic change), promote me.
                        if (userData.role !== 'admin') {
                            const adminQuery = await firestoreDb.collection('users').where('role', '==', 'admin').get();
                            if (adminQuery.empty) {
                                await userRef.update({ role: 'admin', status: 'approved' });
                                Swal.fire('Xin chào Admin!', 'Hệ thống chưa có Admin nào. Bạn đã được tự động thăng cấp.', 'success');
                                unlockEditor();
                                adminBtn.style.display = 'inline-block';
                                return; // Stop further checks
                            }
                        }

                        // CHECK 1: STATUS
                        if (userData.status !== 'approved') {
                            Swal.fire('Chờ duyệt', 'Tài khoản của bạn chưa được admin duyệt.', 'warning');
                            lockEditor();
                            return;
                        }

                        // CHECK 2: EXPIRATION
                        if (userData.expiryDate) {
                            const today = new Date();
                            const expiry = new Date(userData.expiryDate);
                            if (today > expiry) {
                                Swal.fire('Hết hạn', `Tài khoản của bạn đã hết hạn vào ngày ${userData.expiryDate}. Vui lòng liên hệ Admin.`, 'error');
                                lockEditor();
                                return;
                            }
                        }

                        // ALL CHECKS PASSED
                        unlockEditor();
                        if (userData.role === 'admin') {
                            adminBtn.style.display = 'inline-block';
                        }
                    }
                } else {
                    loginBtn.style.display = 'inline-block';
                    logoutBtn.style.display = 'none';
                    adminBtn.style.display = 'none';
                    // Optional: Lock editor if login is required
                    // lockEditor(); 
                }
            });
        }

        // Global state for admin dashboard
        window.adminState = {
            users: [],
            filteredUsers: [],
            currentPage: 1,
            itemsPerPage: 10,
            sortField: 'createdAt',
            sortOrder: 'desc'
        };

        async function showAdminDashboard() {
            try {
                const snapshot = await firestoreDb.collection('users').orderBy('createdAt', 'desc').get();
                window.adminState.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                window.adminState.filteredUsers = [...window.adminState.users];

                // Calculate Stats
                const totalUsers = window.adminState.users.length;
                const activeUsers = window.adminState.users.filter(u => u.status === 'approved').length;
                const pendingUsers = window.adminState.users.filter(u => u.status === 'pending').length;

                let html = `
                    <div class="admin-container">
                        <div class="admin-header">
                            <div class="admin-stats">
                                <div class="stat-card">
                                    <div class="stat-label">Tổng Users</div>
                                    <div class="stat-value">${totalUsers}</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-label">Đang hoạt động</div>
                                    <div class="stat-value" style="color: #2ecc71;">${activeUsers}</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-label">Chờ duyệt</div>
                                    <div class="stat-value" style="color: #f39c12;">${pendingUsers}</div>
                                </div>
                            </div>
                        </div>

                        <div class="admin-toolbar">
                            <div class="search-box">
                                <i class="fas fa-search search-icon"></i>
                                <input type="text" id="adminSearch" class="search-input" placeholder="Tìm kiếm email..." oninput="filterAdminUsers()">
                            </div>
                            <select id="filterStatus" class="filter-select" onchange="filterAdminUsers()">
                                <option value="all">Tất cả trạng thái</option>
                                <option value="pending">⏳ Chờ duyệt</option>
                                <option value="approved">✅ Đã duyệt</option>
                                <option value="blocked">⛔ Đã chặn</option>
                            </select>
                            <select id="filterRole" class="filter-select" onchange="filterAdminUsers()">
                                <option value="all">Tất cả vai trò</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        
                        <div id="adminTableContainer" class="admin-table-wrapper">
                            <!-- Table will be rendered here -->
                        </div>
                    </div>
                `;

                // --- HELPER FUNCTIONS (Moved to top for scope availability) ---

                // 1. Render Logic (with Pagination)
                window.renderAdminTable = () => {
                    try {
                        const container = document.getElementById('adminTableContainer');
                        if (!container) {
                            console.warn("Container not found, retrying...");
                            setTimeout(window.renderAdminTable, 100);
                            return;
                        }

                        const { filteredUsers, currentPage, itemsPerPage, sortField, sortOrder } = window.adminState;

                        if (!filteredUsers || filteredUsers.length === 0) {
                            container.innerHTML = '<div style="padding: 40px; text-align: center; color: #7f8c8d; font-size: 1.1em;">Không tìm thấy kết quả nào.</div>';
                            return;
                        }

                        // Pagination Slice
                        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
                        const start = (currentPage - 1) * itemsPerPage;
                        const end = start + itemsPerPage;
                        const pageUsers = filteredUsers.slice(start, end);

                        // Sort Icon Helper
                        const getSortIcon = (field) => {
                            if (sortField !== field) return '<i class="fas fa-sort" style="opacity: 0.3;"></i>';
                            return sortOrder === 'asc' ? '<i class="fas fa-sort-up"></i>' : '<i class="fas fa-sort-down"></i>';
                        };

                        // Helper: Generate consistent color from string
                        const stringToColor = (str) => {
                            let hash = 0;
                            for (let i = 0; i < str.length; i++) {
                                hash = str.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
                            return '#' + "00000".substring(0, 6 - c.length) + c;
                        };

                        let tableHtml = `
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th onclick="sortAdminUsers('email')">User ${getSortIcon('email')}</th>
                                        <th onclick="sortAdminUsers('status')">Trạng thái ${getSortIcon('status')}</th>
                                        <th onclick="sortAdminUsers('role')">Vai trò ${getSortIcon('role')}</th>
                                        <th onclick="sortAdminUsers('expiryDate')">Hết hạn ${getSortIcon('expiryDate')}</th>
                                        <th>Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody>
                        `;

                        pageUsers.forEach(u => {
                            const uid = u.id;
                            const isSelf = (uid === firebase.auth().currentUser.uid);
                            const statusClass = `status-${u.status}`;
                            const roleClass = `role-${u.role}`;

                            // Avatar Generation
                            const initial = u.email ? u.email.charAt(0).toUpperCase() : '?';
                            const avatarColor = u.email ? stringToColor(u.email) : '#ccc';

                            tableHtml += `
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar" style="background-color: ${avatarColor}">${initial}</div>
                                            <div class="user-info">
                                                <div class="user-email">${u.email}</div>
                                                <div class="user-id">ID: ${uid.substr(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <select class="action-select ${statusClass}" onchange="updateUser('${uid}', 'status', this.value)" ${isSelf ? 'disabled' : ''}>
                                            <option value="pending" ${u.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                                            <option value="approved" ${u.status === 'approved' ? 'selected' : ''}>✅ Approved</option>
                                            <option value="blocked" ${u.status === 'blocked' ? 'selected' : ''}>⛔ Blocked</option>
                                        </select>
                                    </td>
                                    <td>
                                        <select class="action-select ${roleClass}" onchange="updateUser('${uid}', 'role', this.value)" ${isSelf ? 'disabled' : ''}>
                                            <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input type="date" class="date-input" value="${u.expiryDate || ''}" onchange="updateUser('${uid}', 'expiryDate', this.value)" ${isSelf ? 'disabled' : ''}>
                                    </td>
                                    <td>
                                        ${isSelf ? '<span class="role-badge role-admin">BẠN</span>' : ''}
                                    </td>
                                </tr>
                            `;
                        });

                        tableHtml += `</tbody></table>`;

                        // Pagination Controls
                        if (totalPages > 1) {
                            tableHtml += `
                                <div class="pagination-controls">
                                    <span class="page-info">Trang ${currentPage} / ${totalPages} (${filteredUsers.length} users)</span>
                                    <button class="page-btn" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
                                    <button class="page-btn" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
                                </div>
                            `;
                        }

                        container.innerHTML = tableHtml;
                    } catch (e) {
                        console.error("Render Error:", e);
                        const container = document.getElementById('adminTableContainer');
                        if (container) container.innerHTML = `<div style="color:red; padding: 20px;">Lỗi hiển thị: ${e.message}</div>`;
                    }
                };

                // 2. Sort Logic
                window.sortAdminUsers = (field = window.adminState.sortField) => {
                    if (field === window.adminState.sortField) {
                        // Toggle order if clicking same field
                        window.adminState.sortOrder = window.adminState.sortOrder === 'asc' ? 'desc' : 'asc';
                    } else {
                        // New field, default to asc
                        window.adminState.sortField = field;
                        window.adminState.sortOrder = 'asc';
                    }

                    const { sortField, sortOrder } = window.adminState;

                    window.adminState.filteredUsers.sort((a, b) => {
                        let valA = a[sortField] || '';
                        let valB = b[sortField] || '';

                        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                        return 0;
                    });

                    renderAdminTable();
                };

                // 3. Filter Logic
                window.filterAdminUsers = () => {
                    const searchEl = document.getElementById('adminSearch');
                    const statusEl = document.getElementById('filterStatus');
                    const roleEl = document.getElementById('filterRole');

                    // Safety check: if elements are missing (modal closed), stop.
                    if (!searchEl || !statusEl || !roleEl) return;

                    const searchText = searchEl.value.toLowerCase();
                    const statusFilter = statusEl.value;
                    const roleFilter = roleEl.value;

                    window.adminState.filteredUsers = window.adminState.users.filter(u => {
                        const matchesSearch = u.email.toLowerCase().includes(searchText);
                        const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
                        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
                        return matchesSearch && matchesStatus && matchesRole;
                    });

                    // Reset to page 1 on filter change
                    window.adminState.currentPage = 1;
                    sortAdminUsers(); // Sort and Render
                };

                // 4. Pagination Helper
                window.changePage = (delta) => {
                    const newPage = window.adminState.currentPage + delta;
                    const totalPages = Math.ceil(window.adminState.filteredUsers.length / window.adminState.itemsPerPage);
                    if (newPage >= 1 && newPage <= totalPages) {
                        window.adminState.currentPage = newPage;
                        renderAdminTable();
                    }
                };

                // 5. Update Helper
                window.updateUser = async (uid, field, value) => {
                    try {
                        // Capture current filter state BEFORE any modal changes
                        const currentSearch = document.getElementById('adminSearch') ? document.getElementById('adminSearch').value : '';
                        const currentStatus = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : 'all';
                        const currentRole = document.getElementById('filterRole') ? document.getElementById('filterRole').value : 'all';

                        // If approving, ask for expiration date if not set
                        if (field === 'status' && value === 'approved') {
                            const currentDoc = await firestoreDb.collection('users').doc(uid).get();
                            const currentData = currentDoc.data();
                            if (!currentData.expiryDate) {
                                // This Swal will CLOSE the dashboard. We must re-open it later.
                                const { value: date } = await Swal.fire({
                                    title: 'Đặt ngày hết hạn',
                                    input: 'date',
                                    label: 'Người dùng này sẽ được dùng đến ngày nào?',
                                    showCancelButton: true
                                });

                                if (date) {
                                    await firestoreDb.collection('users').doc(uid).update({ expiryDate: date });
                                    // Update local data
                                    const userIndex = window.adminState.users.findIndex(u => u.id === uid);
                                    if (userIndex !== -1) window.adminState.users[userIndex].expiryDate = date;
                                }

                                // Since dashboard was closed, we must re-open it
                                await showAdminDashboard();

                                // Restore filter state
                                setTimeout(() => {
                                    if (document.getElementById('adminSearch')) document.getElementById('adminSearch').value = currentSearch;
                                    if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = currentStatus;
                                    if (document.getElementById('filterRole')) document.getElementById('filterRole').value = currentRole;
                                    filterAdminUsers(); // Re-apply filters
                                }, 100);

                                // Continue to update status
                            }
                        }

                        await firestoreDb.collection('users').doc(uid).update({ [field]: value });

                        // Update local data
                        const userIndex = window.adminState.users.findIndex(u => u.id === uid);
                        if (userIndex !== -1) window.adminState.users[userIndex][field] = value;

                        const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                        toast.fire({ icon: 'success', title: 'Đã cập nhật' });

                        // Re-filter to update view (only if dashboard is still open)
                        if (document.getElementById('adminTableContainer')) {
                            filterAdminUsers();
                        }
                    } catch (e) {
                        console.error(e);
                        Swal.fire('Lỗi', e.message, 'error');
                    }
                };

                await Swal.fire({
                    title: 'Admin Dashboard',
                    html: html,
                    width: '90%',
                    maxWidth: '1200px',
                    showConfirmButton: false,
                    showCloseButton: true,
                    didOpen: () => {
                        filterAdminUsers(); // Initial filter & render
                    }
                });

            } catch (e) {
                console.error(e);
                Swal.fire('Lỗi tải dữ liệu', e.message, 'error');
            }
        }

        async function handleLogin() {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await firebase.auth().signInWithPopup(provider);
            } catch (error) {
                console.error("Login failed:", error);
                Swal.fire('Lỗi đăng nhập', error.message, 'error');
            }
        }

        async function handleLogout() {
            try {
                await firebase.auth().signOut();
                Swal.fire('Đã đăng xuất', '', 'success');
            } catch (error) {
                console.error("Logout failed:", error);
            }
        }

        function lockEditor() {
            editorEl.setReadOnly(true);
            document.getElementById('compile-btn').disabled = true;
            document.querySelector('.editor-pane').style.opacity = '0.5';
        }

        function unlockEditor() {
            editorEl.setReadOnly(false);
            document.getElementById('compile-btn').disabled = false;
            document.querySelector('.editor-pane').style.opacity = '1';
        }

        // --- BƯỚC 4: Luồng khởi tạo chính của ứng dụng ---
        try {
            await openDb();
            await loadCustomSuggestions();

            // Kết nối đến server backend
            await globalEn.loadEngine();

            // Load các file đã lưu từ DB vào bộ đệm của engine
            const files = await getAllFilesFromDb();
            if (files.length === 0) {
                // Nếu là lần đầu chạy, tạo file main.tex mẫu
                const defaultContent = `\\documentclass{article}\n\\usepackage{graphicx}\n\\usepackage{polyglossia}\n\\begin{document}\n\nHello from Server-Side Compiler!\n\n\\end{document}`;
                const fileData = new TextEncoder().encode(defaultContent);
                await saveFileToDb('main.tex', fileData);
                files.push({ name: 'main.tex', data: fileData });
            }
            files.forEach(file => globalEn.writeMemFSFile(file.name, file.data));

            // Tự động quyết định file chính để mở (không cần selector)
            const texFiles = files.filter(f => f.name.endsWith('.tex')).map(f => f.name);
            mainTexFile = texFiles.find(name => name === 'main.tex') || texFiles[0] || 'main.tex';

            // Cập nhật lại dropdown file chính (nếu nó tồn tại trên UI)
            await updateMainFileSelector();

            // Mở file chính trong editor
            await openFileInEditor(mainTexFile);

            // Báo hiệu sẵn sàng
            compileBtn.innerHTML = '<i class="fas fa-play"></i> Biên dịch';
            compileBtn.disabled = false;
            consoleOutput.innerHTML = "Kết nối server thành công. Sẵn sàng!";

        } catch (err) {
            console.error("Lỗi trong quá trình khởi tạo:", err);
            consoleOutput.innerHTML = `Khởi tạo thất bại: ${err.message || err}`;
            compileBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Lỗi Backend';
        }
    }

    async function updateMainFileSelector() {
        const mainFileSelector = document.getElementById('main-file-selector');
        // --- BƯỚC KIỂM TRA QUAN TRỌNG ---
        if (!mainFileSelector) {
            console.log("Không tìm thấy element 'main-file-selector'. Bỏ qua việc cập nhật UI.");
            return; // Thoát khỏi hàm nếu không tìm thấy element
        }

        // Đoạn code còn lại chỉ chạy nếu element tồn tại
        const allFiles = (await getAllFilesFromDb()).map(f => f.name);
        const validPrefixes = ['main', 'file', 'de', 'khaibao'];
        mainFileSelector.innerHTML = '';
        const filteredTexFiles = allFiles.filter(name => name.endsWith('.tex') && validPrefixes.some(prefix => name.toLowerCase().startsWith(prefix))).sort();

        if (filteredTexFiles.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Không có file chính';
            option.disabled = true;
            mainFileSelector.appendChild(option);
            return;
        }

        filteredTexFiles.forEach(fileName => {
            const option = document.createElement('option');
            option.value = fileName;
            option.textContent = fileName;
            mainFileSelector.appendChild(option);
        });

        if (filteredTexFiles.includes(mainTexFile)) {
            mainFileSelector.value = mainTexFile;
        } else {
            mainTexFile = filteredTexFiles[0] || '';
            mainFileSelector.value = mainTexFile;
        }
    }
    function handleMainFileChange(event) { mainTexFile = event.target.value; openFileInEditor(mainTexFile); }
    async function handleTemplateChangegg(event) { const templateKey = event.target.value; if (!templateKey) return; const templateContent = TEMPLATES[templateKey]; const newFileName = `main-${templateKey.toLowerCase()}.tex`; const existingFile = await getFileFromDb(newFileName); if (existingFile) { mainTexFile = newFileName; await openFileInEditor(newFileName); updateMainFileSelector(); Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: `Đã mở file có sẵn: ${newFileName}`, showConfirmButton: false, timer: 2500 }); } else { const textEncoder = new TextEncoder(); const templateData = textEncoder.encode(templateContent); await saveFileToDb(newFileName, templateData); globalEn.writeMemFSFile(newFileName, templateData); mainTexFile = newFileName; updateMainFileSelector(); await openFileInEditor(newFileName); Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Đã tạo file mẫu ${newFileName}`, showConfirmButton: false, timer: 2000 }); }; }
    async function handleTemplateChange(event) {
        const templateId = event.target.value;
        if (!templateId) return;

        try {
            // 1. Tìm thông tin mẫu dựa trên ID đã chọn
            const selectedTemplate = availableTemplates.find(t => t.id === templateId);
            if (!selectedTemplate) throw new Error(`Không tìm thấy mẫu với ID: ${templateId}`);

            // 2. Tải nội dung của file .tex tương ứng
            const templateFileName = selectedTemplate.file;
            const response = await fetch(templateFileName);
            if (!response.ok) throw new Error(`Không thể tải file mẫu: ${templateFileName}`);
            const templateContent = await response.text();

            // 3. Logic tạo file mới cho người dùng (giữ nguyên như cũ)
            const newFileName = `main-${templateId.toLowerCase()}.tex`;
            const existingFile = await getFileFromDb(newFileName);

            if (existingFile) {
                mainTexFile = newFileName;
                await openFileInEditor(newFileName);
                await updateMainFileSelector();
                Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: `Đã mở file có sẵn: ${newFileName}`, showConfirmButton: false, timer: 2500 });
            } else {
                const textEncoder = new TextEncoder();
                const templateData = textEncoder.encode(templateContent);
                await saveFileToDb(newFileName, templateData);
                globalEn.writeMemFSFile(newFileName, templateData);
                mainTexFile = newFileName;
                await openFileInEditor(newFileName);
                await updateMainFileSelector();
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Đã tạo file mẫu ${newFileName}`, showConfirmButton: false, timer: 2000 });
            }

        } catch (error) {
            console.error("Lỗi khi xử lý mẫu:", error);
            Swal.fire('Lỗi', `Không thể tải nội dung file mẫu. Chi tiết: ${error.message}`, 'error');
        } finally {
            // Reset lại selector để người dùng có thể chọn lại
            event.target.value = '';
        }
    }
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
    async function loadCustomSuggestions() { const fileData = await getFileFromDb('suggestions.json'); if (fileData) { try { customSuggestions = JSON.parse(new TextDecoder().decode(fileData)); } catch (e) { console.error('Failed to parse suggestions.json:', e); customSuggestions = []; } } }
    async function parseLogAndCacheDependencies(logContent) { const fileRegex = /\(([^)\s]+\.(?:cls|sty|def|clo|ldf|cfg|tex|bst))\s?/g; let match; const dependencies = new Set(); while ((match = fileRegex.exec(logContent)) !== null) { dependencies.add(match[1].split('/').pop()); } for (const fileName of dependencies) { if (await getFileFromDb(fileName)) continue; try { const response = await fetch(`${TEXLIVE_BASE_URL}${TEXLIVE_VERSION}/${fileName}`); if (response.ok) { const fileData = await response.arrayBuffer(); await saveFileToDb(fileName, new Uint8Array(fileData)); globalEn.writeMemFSFile(fileName, new Uint8Array(fileData)); console.log(`[Cache SAVE] ${fileName}`); } } catch (error) { console.error(`Error fetching ${fileName}:`, error); } } }
    function toggleConsole() { consoleOutput.classList.toggle('collapsed'); consoleToggleIcon.textContent = consoleOutput.classList.contains('collapsed') ? '▼' : '▲'; }


    // KHỞI CHẠY ỨNG DỤNG
    init();
}

// ĐIỂM BẮT ĐẦU CỦA TOÀN BỘ SCRIPT
main();