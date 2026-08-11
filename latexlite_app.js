// File: latexlite_app.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Khởi tạo Ace Editor
    const editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/latex");
    editor.setFontSize(16);
    editor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        showPrintMargin: false,
        wrap: true
    });

    // 2. Lấy các phần tử DOM
    const compileBtn = document.getElementById('compile-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    const pdfBox = document.getElementById('pdfbox');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Tự động nạp API Key từ localStorage nếu có
    const savedKey = localStorage.getItem('latexlite_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    } else {
        // Pre-fill với key người dùng vừa cung cấp (đã test thành công)
        apiKeyInput.value = 'latexlite-key-c56f715e0d6a5eb2';
    }

    // 3. Hàm biên dịch qua API (Sử dụng Async API để tránh Timeout)
    async function compileWithAPI() {
        const apiKey = apiKeyInput.value.trim();
        const latexCode = editor.getValue();

        if (!apiKey) {
            Swal.fire('Thiếu API Key', 'Vui lòng nhập API Key của LaTeXLite để tiếp tục.', 'warning');
            return;
        }

        if (!latexCode.trim()) {
            Swal.fire('Nội dung trống', 'Vui lòng nhập mã LaTeX để biên dịch.', 'info');
            return;
        }

        localStorage.setItem('latexlite_api_key', apiKey);
        loadingOverlay.style.display = 'flex';
        compileBtn.disabled = true;

        try {
            // Bước 1: Tạo Job biên dịch (Async)
            const createRes = await fetch('/api/latexlite-proxy/renders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template: latexCode, api_key: apiKey })
            });

            if (!createRes.ok) {
                const err = await createRes.text();
                throw new Error(`Không thể tạo Job: ${err}`);
            }

            const createData = await createRes.json();
            const jobId = createData.data.id;
            console.log("Job created:", jobId);

            // Bước 2: Polling kiểm tra trạng thái
            let status = 'queued';
            let jobInfo = null;
            const maxAttempts = 30; // 30 lần * 2s = 60s
            let attempts = 0;

            while ((status === 'queued' || status === 'processing') && attempts < maxAttempts) {
                attempts++;
                console.log(`Checking status (Attempt ${attempts})...`);

                await new Promise(r => setTimeout(r, 2000)); // Đợi 2s

                const checkRes = await fetch(`/api/latexlite-proxy/renders/${jobId}?api_key=${apiKey}`);
                if (!checkRes.ok) throw new Error("Lỗi khi kiểm tra trạng thái Job.");

                const checkData = await checkRes.json();
                jobInfo = checkData.data;
                status = jobInfo.status;
            }

            if (status === 'completed') {
                // Bước 3: Tải PDF
                const pdfRes = await fetch(`/api/latexlite-proxy/renders/${jobId}/pdf?api_key=${apiKey}`);
                if (!pdfRes.ok) throw new Error("Không thể tải file PDF.");

                const pdfBlob = await pdfRes.blob();
                const pdfUrl = URL.createObjectURL(pdfBlob);
                pdfBox.innerHTML = `<embed src="${pdfUrl}" width="100%" height="100%" type="application/pdf">`;

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Biên dịch thành công!',
                    showConfirmButton: false,
                    timer: 2000
                });
            } else if (status === 'failed') {
                throw new Error(`Biên dịch thất bại: ${jobInfo.log || 'Không có log.'}`);
            } else {
                throw new Error("Quá thời gian chờ biên dịch (Timeout). Thử lại hoặc rút gọn mã LaTeX.");
            }

        } catch (error) {
            console.error("Lỗi LaTeXLite API:", error);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi hệ thống',
                html: `<div style="text-align: left; white-space: pre-wrap;">${error.message}</div>`
            });
            pdfBox.innerHTML = `<div style="padding: 20px; color: red;">Lỗi: ${error.message}</div>`;
        } finally {
            loadingOverlay.style.display = 'none';
            compileBtn.disabled = false;
        }
    }

    // 4. Gán sự kiện
    compileBtn.addEventListener('click', compileWithAPI);
});
