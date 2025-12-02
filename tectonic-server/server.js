const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;
const WORK_DIR = path.join(__dirname, 'temp_work');

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the parent directory (stex root)
app.use(express.static(path.join(__dirname, '..')));

// Ensure work directory exists
fs.ensureDirSync(WORK_DIR);

const upload = multer({ dest: path.join(WORK_DIR, 'uploads') });

// --- Endpoints ---

app.post('/api/init-session', (req, res) => {
    const sessionId = 'local-session-' + Date.now();
    const sessionDir = path.join(WORK_DIR, sessionId);
    fs.ensureDirSync(sessionDir);
    res.json({ success: true, session_id: sessionId });
});

app.post('/api/upload-image-batch', upload.any(), async (req, res) => {
    const sessionId = req.body.session_id;
    if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

    const sessionDir = path.join(WORK_DIR, sessionId);
    if (!fs.existsSync(sessionDir)) return res.status(400).json({ error: 'Invalid session_id' });

    try {
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // Allow .sty files to be uploaded with their original names
                const targetPath = path.join(sessionDir, file.originalname);
                await fs.ensureDir(path.dirname(targetPath));
                await fs.move(file.path, targetPath, { overwrite: true });
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/compile-latex-pdf', async (req, res) => {
    const { latex_code, session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    const sessionDir = path.join(WORK_DIR, session_id);
    if (!fs.existsSync(sessionDir)) return res.status(400).json({ error: 'Invalid session_id' });

    const mainTexPath = path.join(sessionDir, 'main.tex');

    try {
        await fs.writeFile(mainTexPath, latex_code);

        // Run Tectonic with SyncTeX enabled
        const command = `tectonic -X compile main.tex --synctex --keep-intermediates --keep-logs`;

        exec(command, { cwd: sessionDir }, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Exec error: ${error}`);
                return res.status(400).json({
                    error: "Compilation failed",
                    log: stdout + "\n" + stderr
                });
            }

            const pdfPath = path.join(sessionDir, 'main.pdf');
            if (fs.existsSync(pdfPath)) {
                res.sendFile(pdfPath);
            } else {
                res.status(500).json({
                    error: "PDF not generated",
                    log: stdout + "\n" + stderr
                });
            }
        });

    } catch (err) {
        console.error("Server error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- SyncTeX Endpoints ---

app.get('/api/synctex/edit', (req, res) => {
    const { session_id, page, x, y } = req.query;
    if (!session_id || !page || !x || !y) return res.status(400).json({ error: 'Missing parameters' });

    const sessionDir = path.join(WORK_DIR, session_id);
    const pdfPath = path.join(sessionDir, 'main.pdf');

    // synctex edit -o <page>:<x>:<y>:<file.pdf> -d <session_dir>
    // Note: x and y are in points (72 dpi) from top-left? 
    // SyncTeX usually expects coordinates relative to the PDF page.
    const command = `synctex edit -o ${page}:${x}:${y}:${pdfPath} -d ${sessionDir}`;

    exec(command, { cwd: sessionDir }, (error, stdout, stderr) => {
        if (error) {
            // synctex might return non-zero if no match found, but we check stdout
            console.error(`SyncTeX error: ${error}`);
        }

        // Parse output
        // Output format example:
        // Line:10
        // Column:0
        // Input:/path/to/main.tex

        const lineMatch = stdout.match(/Line:(\d+)/);
        const fileMatch = stdout.match(/Input:(.+)/);

        if (lineMatch && fileMatch) {
            res.json({
                line: parseInt(lineMatch[1]),
                file: path.basename(fileMatch[1]) // Return relative filename
            });
        } else {
            res.json({ error: "No match found" });
        }
    });
});

app.get('/api/synctex/view', (req, res) => {
    const { session_id, file, line } = req.query;
    if (!session_id || !file || !line) return res.status(400).json({ error: 'Missing parameters' });

    const sessionDir = path.join(WORK_DIR, session_id);
    const pdfPath = path.join(sessionDir, 'main.pdf');
    const texPath = path.join(sessionDir, file);

    // synctex view -i <line>:<col>:<file.tex> -d <session_dir> -o <file.pdf>
    const command = `synctex view -i ${line}:0:${texPath} -d ${sessionDir} -o ${pdfPath}`;

    exec(command, { cwd: sessionDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`SyncTeX error: ${error}`);
        }

        // Parse output
        // Output format example:
        // Page:1
        // x:100.0
        // y:200.0
        // h:50.0
        // v:50.0
        // W:10.0
        // H:10.0

        const pageMatch = stdout.match(/Page:(\d+)/);
        const xMatch = stdout.match(/x:([\d\.]+)/);
        const yMatch = stdout.match(/y:([\d\.]+)/);

        if (pageMatch && xMatch && yMatch) {
            res.json({
                page: parseInt(pageMatch[1]),
                x: parseFloat(xMatch[1]),
                y: parseFloat(yMatch[1])
            });
        } else {
            res.json({ error: "No match found" });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Tectonic Server running at http://localhost:${PORT}`);
    console.log(`Serving frontend at http://localhost:${PORT}/index_tectonic.html`);
});
