// =====================================================================
// ===        KHỐI MÃ THAY THẾ PdfTeXEngine (TRÁI TIM MỚI)        ===
// =====================================================================

"use strict";

// --- CẤU HÌNH QUAN TRỌNG ---
const BACKEND_API_URL = 'https://tikz-server-797442200106.asia-southeast1.run.app';

// --- ĐỊNH NGHĨA CÁC LỚP GIẢ LẬP ĐỂ TƯƠNG THÍCH ---
var exports = {};
var EngineStatus;
(function (EngineStatus) {
    EngineStatus[EngineStatus["Init"] = 1] = "Init";
    EngineStatus[EngineStatus["Ready"] = 2] = "Ready";
    EngineStatus[EngineStatus["Busy"] = 3] = "Busy";
    EngineStatus[EngineStatus["Error"] = 4] = "Error";
})(EngineStatus || (EngineStatus = {}));

class CompileResult {
    constructor() {
        this.pdf = undefined;
        this.status = -254;
        this.log = 'No log';
        this.synctex = undefined; // Giữ lại để tương thích
    }
}

// === LỚP PdfTeXEngine "GIẢ" - GỌI API ĐẾN BACKEND ===
class PdfTeXEngine {
    constructor() {
        this.latexWorkerStatus = EngineStatus.Init;
        this.sessionId = null;
        this.fileBuffer = {}; // Bộ đệm để lưu trữ các file trên client trước khi gửi
        this.mainFile = 'main.tex'; // Lưu lại tên file chính
    }

    // 1. Khởi tạo: Thay vì tải worker, ta lấy session ID từ backend
    async loadEngine() {
        this.latexWorkerStatus = EngineStatus.Init;
        console.log("Đang kết nối đến server biên dịch tại:", BACKEND_API_URL);
        try {
            const response = await fetch(`${BACKEND_API_URL}/api/init-session`, { method: 'POST' });
            if (!response.ok) throw new Error(`Server response: ${response.statusText}`);
            
            const data = await response.json();
            if (data.success && data.session_id) {
                this.sessionId = data.session_id;
                this.latexWorkerStatus = EngineStatus.Ready;
                console.log("Kết nối thành công! Session ID:", this.sessionId);
            } else {
                throw new Error(data.error || 'Không nhận được session_id hợp lệ.');
            }
        } catch (error) {
            this.latexWorkerStatus = EngineStatus.Error;
            console.error("Lỗi nghiêm trọng khi kết nối backend:", error);
            // Hiển thị lỗi cho người dùng bằng SweetAlert2
            if (typeof Swal !== 'undefined') {
                Swal.fire('Lỗi Kết Nối', 'Không thể kết nối đến server biên dịch. Vui lòng kiểm tra lại địa chỉ backend và cài đặt CORS.', 'error');
            }
            throw error; // Ném lỗi để luồng init() biết và dừng lại
        }
    }

    isReady() {
        return this.latexWorkerStatus === EngineStatus.Ready;
    }
    
    checkEngineStatus() {
        if (!this.isReady()) {
            throw new Error('Engine chưa sẵn sàng hoặc đang bận.');
        }
    }

    // 2. Các hàm quản lý file: Lưu vào bộ đệm `fileBuffer` trên client
    writeMemFSFile(filename, srccode) {
        // srccode có thể là string hoặc Uint8Array, chuyển về Uint8Array
        const data = (typeof srccode === 'string') ? new TextEncoder().encode(srccode) : srccode;
        this.fileBuffer[filename] = data;
    }

    removeMemFSFile(filename) {
        delete this.fileBuffer[filename];
    }
    
    setEngineMainFile(filename) {
        this.mainFile = filename;
    }
    
    // Các hàm này không còn cần thiết nhưng để lại để tránh lỗi nếu có chỗ gọi đến
    makeMemFSFolder(folder) { /* không làm gì */ }
    flushCache() { /* không làm gì */ }

    // 3. Hàm biên dịch chính: "Trái tim" của sự thay đổi
    async compileLaTeX() {
        this.checkEngineStatus();
        this.latexWorkerStatus = EngineStatus.Busy;
        const startTime = performance.now();
        
        const niceReport = new CompileResult();

        try {
            // --- Giai đoạn 1: Tải tất cả các file phụ (ảnh, sty,...) trong bộ đệm lên server ---
            const formData = new FormData();
            formData.append('session_id', this.sessionId);
            
            let fileCount = 0;
            for (const filename in this.fileBuffer) {
                // Chỉ tải lên những file không phải là file chính
                if (filename !== this.mainFile) {
                    const fileBlob = new Blob([this.fileBuffer[filename]]);
                    formData.append('image_file', fileBlob, filename); // API backend sẽ nhận và lưu
                    fileCount++;
                }
            }
            
            // Chỉ gọi API upload nếu có file phụ
            if (fileCount > 0) {
                 const uploadResponse = await fetch(`${BACKEND_API_URL}/api/upload-image-batch`, { // Cần có API này ở backend
                    method: 'POST',
                    body: formData
                });
                if (!uploadResponse.ok) {
                    throw new Error("Lỗi khi tải các file phụ lên server.");
                }
            }

            // --- Giai đoạn 2: Gửi yêu cầu biên dịch với code của file chính ---
            const mainFileContent = new TextDecoder().decode(this.fileBuffer[this.mainFile]);
            
            const compileBody = new URLSearchParams();
            compileBody.append('latex_code', mainFileContent);
            compileBody.append('session_id', this.sessionId);

            const compileResponse = await fetch(`${BACKEND_API_URL}/api/compile-latex-pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: compileBody
            });

            // --- Giai đoạn 3: Xử lý kết quả trả về ---
            if (compileResponse.ok) {
                const pdfBlob = await compileResponse.blob();
                niceReport.status = 0; // 0 = Thành công
                niceReport.pdf = new Uint8Array(await pdfBlob.arrayBuffer());
                niceReport.log = "Biên dịch thành công trên server.\n";
            } else {
                const errorData = await compileResponse.json();
                niceReport.status = 1; // 1 = Thất bại
                niceReport.log = errorData.error || "Lỗi không xác định từ server.";
            }
            
            return niceReport;

        } catch (error) {
            console.error("Lỗi trong quá trình compileLaTeX:", error);
            niceReport.status = 1;
            niceReport.log = `Lỗi phía client hoặc lỗi mạng: ${error.message}`;
            return niceReport;
        } finally {
            this.latexWorkerStatus = EngineStatus.Ready;
            console.log(`Toàn bộ quá trình biên dịch và nhận kết quả mất ${(performance.now() - startTime).toFixed(0)}ms`);
        }
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
// File: app11.js

/**
 * Hàm làm đẹp code LaTeX phiên bản mới.
 * Các môi trường trong `topLevelEnvs` sẽ luôn nằm sát lề.
 * Nội dung bên trong sẽ được thụt lề 1 cấp.
 * @param {string} content - Nội dung code đầu vào.
 * @returns {string} - Nội dung code đã được làm đẹp.
 */
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

/**
 * Hàm xóa tất cả các dòng comment bắt đầu bằng % hoặc %%.
 * @param {string} text - Nội dung code đầu vào.
 * @returns {string} - Nội dung code đã được xóa comment.
 */
function removeLatexComments(text) {
    return text.split('\n')
               .filter(line => !line.trim().startsWith('%'))
               .join('\n');
}

/**
 * Hàm hiển thị hộp thoại công cụ và xử lý các hành động.
 */
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
/**
 * Hàm gập hoặc mở tất cả các môi trường có tên cho trước trong tài liệu.
 * @param {string} envName - Tên của môi trường cần gập/mở (ví dụ: 'ex', 'bt').
 */

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
// File: app11.js

/**
 * Thay đổi cỡ chữ của trình soạn thảo.
 * @param {number} delta - Lượng thay đổi (ví dụ: 1 để tăng, -1 để giảm).
 */
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
// Bỏ defer để đảm bảo script này chạy tuần tự
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

    editor.on('mousemove', function(e) {
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

    editor.container.addEventListener('mouseout', function() {
        tooltip.style.display = 'none';
    });

    isMathPreviewInitialized = true;
    console.log("Math Preview Initialized (Robust Version).");
}


// === HÀM main() CHÍNH CỦA BẠN (Sửa đổi hàm compile và init) ===
function main() {
    const editorEl = ace.edit("editor");
    const compileBtn = document.getElementById("compile-btn");
    const consoleOutput = document.getElementById("console");
    const pdfbox = document.getElementById("pdfbox");
    const zipLoaderInput = document.getElementById('zip-loader-input');
    const mainFileSelector = document.getElementById('main-file-selector');
    const templateSelector = document.getElementById('template-selector');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    // ... (giữ nguyên tất cả các biến DOM khác của bạn)

    // === CÁC BIẾN VÀ HẰNG SỐ (ĐÃ CẬP NHẬT) ===
    const globalEn = new PdfTeXEngine(); // <--- SỬ DỤNG ENGINE GIẢ LẬP MỚI
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
        if (!globalEn.isReady()) {
            Swal.fire('Chưa sẵn sàng', 'Kết nối đến server biên dịch chưa hoàn tất, vui lòng thử lại sau giây lát.', 'warning');
            return;
        }
    
        // Xử lý lưu file JSON (logic này không đổi)
        if (currentOpenFile.endsWith('.json')) {
            // ... (giữ nguyên logic save file JSON của bạn)
            return;
        }
        
        // Xử lý lưu các file .tex không phải file chính (logic này không đổi)
        if (mainFileSelector.value !== currentOpenFile) {
            // ... (giữ nguyên logic save file .tex phụ của bạn)
            return;
        }

        // --- Bắt đầu quá trình biên dịch ---
        loadingOverlay.style.display = 'flex';
        loadingText.textContent = `Đang biên dịch ${mainTexFile}...`;
        compileBtn.disabled = true;
        compileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compiling...';
    
        try {
            // 1. Lưu nội dung file hiện tại vào bộ đệm của engine mới
            const currentContentData = new TextEncoder().encode(editorEl.getValue());
            await saveFileToDb(mainTexFile, currentContentData); // Vẫn lưu vào DB để giữ lại
            globalEn.writeMemFSFile(mainTexFile, currentContentData);
    
            // 2. Đặt file chính cho engine biết
            globalEn.setEngineMainFile(mainTexFile);
    
            // 3. Gọi hàm compileLaTeX (đã được thay thế bằng API call)
            // Engine mới sẽ tự động lấy tất cả các file từ bộ đệm để gửi đi
            const r = await globalEn.compileLaTeX();
    
            // 4. Xử lý kết quả trả về từ server
            consoleOutput.innerHTML = r.log || "No log output.";
            if (r.status === 0 && r.pdf) {
                const pdfblob = new Blob([r.pdf], { type: 'application/pdf' });
                const objectURL = URL.createObjectURL(pdfblob);
                pdfbox.innerHTML = `<embed src="${objectURL}" width="100%" height="100%" type="application/pdf">`;
                // Logic parse log không còn cần thiết vì backend đã cài đủ gói
                // await parseLogAndCacheDependencies(r.log); 
            } else {
                pdfbox.innerHTML = `<div style="padding: 20px; color: red; white-space: pre-wrap;">Biên dịch thất bại. Kiểm tra Console Output.</div>`;
            }
    
        } catch (error) {
            console.error("Lỗi nghiêm trọng khi biên dịch:", error);
            pdfbox.innerHTML = `<div style="padding: 20px; color: red; white-space: pre-wrap;">Lỗi phía client: ${error.message}</div>`;
        } finally {
            loadingOverlay.style.display = 'none';
            compileBtn.disabled = false;
            compileBtn.innerHTML = '<i class="fas fa-play"></i> Biên dịch';
        }
    }

    // === HÀM INIT() ĐÃ ĐƯỢC "PHẪU THUẬT" ===
    async function init() {
        
        // Cấu hình Editor và Theme
        const savedTheme = localStorage.getItem('editorTheme') || 'monokai';
        editorEl.setTheme(`ace/theme/${savedTheme}`);
        if (themeSelector) themeSelector.value = savedTheme;
        editorEl.session.setMode("ace/mode/latex");
        // --- ÁP DỤNG CỠ CHỮ ĐÃ LƯU ---
    const savedFontSize = parseInt(localStorage.getItem('editorFontSize')) || 16;
    editorEl.setFontSize(savedFontSize);
    if (currentFontSizeSpan) { // currentFontSizeSpan đã được lấy ở hàm main()
        currentFontSizeSpan.textContent = `${savedFontSize}`;
    }
    // ---------------------------------
    
    editorEl.resize(true)
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
        compileBtn.addEventListener('click', compile); // QUAN TRỌNG: Nút compile giờ sẽ gọi hàm compile đã được phẫu thuật
        
        // ... (giữ nguyên các phần init khác) ...
        initResizer();
        initFooterPanel();
        initMathPreview();
        
        // Luồng khởi tạo ứng dụng chính (ĐÃ THAY ĐỔI)
        try {
            await openDb();
            await preloadPackagedFiles(); // Vẫn giữ lại để có file mẫu ban đầu
            await loadCustomSuggestions();

            // === DÒNG QUAN TRỌNG NHẤT ===
            await globalEn.loadEngine(); // Kết nối đến server backend

            // Load các file từ DB vào bộ đệm của engine mới
            const files = await getAllFilesFromDb();
            files.forEach(file => globalEn.writeMemFSFile(file.name, file.data));

            await updateMainFileSelector();
            const firstMainFile = mainFileSelector.value || 'main.tex';
            await openFileInEditor(firstMainFile);
            
            compileBtn.innerHTML = '<i class="fas fa-play"></i> Biên dịch';
            compileBtn.disabled = false;
            consoleOutput.innerHTML = "Kết nối đến server biên dịch thành công. Sẵn sàng!";

        } catch (err) {
            console.error(err);
            consoleOutput.innerHTML = `Khởi tạo thất bại: ${err.message || err}`;
            compileBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Lỗi Backend';
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
    main(); // Không cần đợi DOMContentLoaded nữa nếu script được đặt ở cuối body
}