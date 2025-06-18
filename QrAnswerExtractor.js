// ==========================================================
// === MODULE TRÍCH XUẤT ĐÁP ÁN VÀ TẠO QR CODE ===
// File: QrAnswerExtractor.js
// ==========================================================

const QrAnswerExtractor = {

    // ----------------------------------------------------------
    // -- CÁC HÀM XỬ LÝ CHUỖI CON (HELPER FUNCTIONS)
    // -- Chúng ta đặt chúng là "private" bằng cách bắt đầu với dấu _
    // ----------------------------------------------------------
    _xoaNoiDungTruocNgoacMo(text) {
        return text.replace(/(\\shortans)\s*[^\{]*(\{)/g, '$1$2');
    },

    _xoaNgoacConTrongShortans(text) {
        let result = '';
        let i = 0;
        const shortansPrefix = '\\shortans{';
        const prefixLength = shortansPrefix.length;
        while (i < text.length) {
            if (text.startsWith(shortansPrefix, i)) {
                let startIndex = i + prefixLength;
                let braceCount = 1;
                let j = startIndex;
                while (j < text.length && braceCount > 0) {
                    if (text[j] === '{') braceCount++;
                    else if (text[j] === '}') braceCount--;
                    j++;
                }
                if (braceCount === 0) {
                    let innerContent = text.slice(startIndex, j - 1);
                    let noiDungKhongNgoac = innerContent.replace(/[{}]/g, '').replace(/\$/g, '').replace(/\s+/g, '').replace(/,/g, '.');
                    result += '\\shortans{' + noiDungKhongNgoac + '}';
                    i = j;
                } else {
                    result += text[i]; i++;
                }
            } else {
                result += text[i]; i++;
            }
        }
        return result;
    },

    _layCacNgoacLon(text) {
        let positions = [];
        let stack = [];
        let startIndex = null;
        for (let i = 0; i < text.length; i++) {
            let kyTu = text[i];
            if (kyTu === '{') {
                if (stack.length === 0) startIndex = i;
                stack.push(i);
            } else if (kyTu === '}') {
                if (stack.length > 0) {
                    stack.pop();
                    if (stack.length === 0 && startIndex !== null) {
                        positions.push([startIndex, i]);
                        startIndex = null;
                    }
                }
            }
        }
        return positions;
    },

    // ----------------------------------------------------------
    // -- CÁC HÀM TRÍCH XUẤT DỮ LIỆU CHÍNH (CORE LOGIC)
    // ----------------------------------------------------------
    extractAnswerData(content) {
        content = content.replace(/^%.*$/gm, '').replace(/^\s*$/gm, '');
        content = this._xoaNgoacConTrongShortans(content);
        content = this._xoaNoiDungTruocNgoacMo(content);

        const regexChoice = /\\begin\{ex\}[\s\S]*?\\choice(?!TF)\s*([\s\S]*?)\\loigiai/gs;
        const regexChoiceTF = /\\begin\{ex\}[\s\S]*?\\choiceTF\s*([\s\S]*?)\\loigiai/gs;
        const regexShortans = /\\shortans\{([\s\S]*?)\}/gs;
        let extractedData = [];
        let match;

        while ((match = regexChoice.exec(content)) !== null) {
            const positions = this._layCacNgoacLon(match[1].trim());
            if (positions.length >= 4) {
                const answers = positions.slice(0, 4).map(p => match[1].trim().substring(p[0] + 1, p[1]));
                const correctIdx = answers.findIndex(ans => ans.includes('\\True'));
                extractedData.push(correctIdx !== -1 ? String.fromCharCode(65 + correctIdx) : "N/A");
            } else {
                extractedData.push("N/A");
            }
        }

        while ((match = regexChoiceTF.exec(content)) !== null) {
            const positions = this._layCacNgoacLon(match[1].trim());
            if (positions.length >= 4) {
                const answers = positions.slice(0, 4).map(p => match[1].trim().substring(p[0] + 1, p[1]));
                extractedData.push(answers.map(ans => ans.includes('\\True') ? 'Đ' : 'S').join(''));
            } else {
                extractedData.push("N/A");
            }
        }

        while ((match = regexShortans.exec(content)) !== null) {
            let answer = (match[1] || "").replace(/,/g, '.').replace(/\$/g, '').replace(/\{|\}/g, '').replace(/\s+/g, '').trim();
            if (answer === '') {
                extractedData.push("N/A");
            } else {
                const num = parseFloat(answer);
                extractedData.push(!isNaN(num) ? num : answer);
            }
        }
        
        return extractedData.filter(item => item !== "N/A");
    },

    extractMade(content) {
        const match = content.match(/\\newcommand\{\\made\}\{(.{3})\}/);
        return match ? match[1] : null;
    },

    // ----------------------------------------------------------
    // -- CÁC HÀM ĐỊNH DẠNG ĐẦU RA (FORMATTERS)
    // ----------------------------------------------------------
    formatForUntlap(made, data) {
        let parts = { single: [], tf: [], other: [] };
        data.forEach(item => {
            if (typeof item === 'string' && /^[A-D]$/.test(item)) parts.single.push(item);
            else if (typeof item === 'string' && /^[ĐS]+$/.test(item)) parts.tf.push(item);
            else parts.other.push(String(item));
        });
        let result = [made];
        if (parts.single.length > 0) result.push(parts.single.join(''));
        if (parts.tf.length > 0) result.push(parts.tf.join(''));
        if (parts.other.length > 0) result.push(parts.other.join('|'));
        return result.join('\n');
    },

    formatForTNMaker(made, data) {
        let parts = { single: [], tf: [], other: [] };
        data.forEach(item => {
            if (typeof item === 'string' && /^[A-D]$/.test(item)) parts.single.push(item);
            else if (typeof item === 'string' && /^[ĐS]+$/.test(item)) parts.tf.push(item);
            else parts.other.push(String(item));
        });
        const tfFormatted = parts.tf.join('').match(/.{1,4}/g)?.join('_') || '';
        const finalParts = [parts.single.join(''), tfFormatted, parts.other.join('_')].filter(p => p);
        return JSON.stringify({ [made]: finalParts.join('#'), success: true, type: 5 }, null, 2);
    },

    formatForSmarttest(made, data) {
        return JSON.stringify({ [made]: data.map(String), success: true, type: 5 }, null, 2);
    },

    // ----------------------------------------------------------
    // -- HÀM ĐIỀU KHIỂN CHÍNH, HIỂN THỊ MODAL (PUBLIC METHOD)
    // ----------------------------------------------------------
    // File: QrAnswerExtractor.js

// ... (các hàm khác giữ nguyên) ...

// --- HÀM ĐIỀU KHIỂN CHÍNH, HIỂN THỊ MODAL (PHIÊN BẢN MỚI) ---
async showModal() {
    const editor = ace.edit("editor");
    const content = editor.getValue();
    if (!content.trim()) {
        return Swal.fire('Nội dung rỗng', 'Không có gì trong trình soạn thảo để xử lý.', 'warning');
    }

    const { value: format } = await Swal.fire({
        title: 'Tạo QR Code Đáp án',
        input: 'select',
        inputOptions: {
            untlap: 'Định dạng UnTlap',
            tnmaker: 'Định dạng TNMaker',
            smarttest: 'Định dạng Smarttest'
        },
        inputPlaceholder: 'Chọn định dạng đầu ra',
        showCancelButton: true,
        confirmButtonText: 'Tạo QR'
    });

    if (!format) return;

    const extractedData = this.extractAnswerData(content);
    if (extractedData.length === 0) {
        return Swal.fire('Không tìm thấy', 'Không trích xuất được đáp án hợp lệ nào.', 'info');
    }
    
    const made = this.extractMade(content) || '101';
    let resultString = '';

    switch (format) {
        case 'untlap':    resultString = this.formatForUntlap(made, extractedData); break;
        case 'tnmaker':   resultString = this.formatForTNMaker(made, extractedData); break;
        case 'smarttest': resultString = this.formatForSmarttest(made, extractedData); break;
    }

    // ==========================================================
    // === PHẦN NÂNG CẤP BẮT ĐẦU TỪ ĐÂY ===
    // ==========================================================
    Swal.fire({
        title: `Kết quả cho định dạng "${format}"`,
        html: `
            <p style="text-align:left; font-size:0.9em; color:#555;">Bạn có thể chỉnh sửa nội dung dưới đây, mã QR sẽ tự động cập nhật.</p>
            <textarea id="qr-result-textarea" class="swal2-textarea">${resultString}</textarea> <!-- Bỏ readonly -->
            <div id="qr-code-display" style="margin: 20px auto 0 auto; width: 256px; height: 256px; display: flex; align-items: center; justify-content: center;"></div>
        `,
        width: '600px',
        didOpen: () => {
            const qrContainer = document.getElementById('qr-code-display');
            const textarea = document.getElementById('qr-result-textarea');
            let updateTimer = null;

            // Hàm để vẽ lại QR code
            const redrawQRCode = (text) => {
                qrContainer.innerHTML = ''; // Xóa QR cũ
                if (!text) return;

                QRCode.toCanvas(text, { width: 256, margin: 1, errorCorrectionLevel: 'H' }, (error, canvas) => {
                    if (error) {
                        qrContainer.innerHTML = `<p style="color: red; font-size: 0.9em;">Lỗi: Dữ liệu quá lớn hoặc không hợp lệ.</p>`;
                        console.error("Lỗi tạo QR:", error);
                    } else {
                        qrContainer.appendChild(canvas);
                    }
                });
            };

            // Vẽ QR code lần đầu tiên
            redrawQRCode(textarea.value);

            // Lắng nghe sự kiện input trên textarea
            textarea.addEventListener('input', () => {
                clearTimeout(updateTimer);
                // Dùng setTimeout để tránh vẽ lại QR quá nhiều lần khi đang gõ nhanh
                updateTimer = setTimeout(() => {
                    redrawQRCode(textarea.value.trim());
                }, 250); // Đợi 250ms sau khi người dùng ngừng gõ
            });
        }
    });
}
};