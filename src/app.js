let currentProjectId = 'PROJ_001';
let mismatchQueue = [];
let currentMismatchIndex = 0;
let parsedBOQData = null;

function handleCredentialResponse(response) {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    loadProjectView();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
}

function loadProjectView() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
    <div class="card">
      <h2>Project Engineering</h2>
      <p class="text-muted">Upload multi-system BOQs for Value Engineering.</p>
      
      <select id="system-selector">
        <option value="SCHUCO">Schuco System</option>
        <option value="ALUPLAST">Aluplast uPVC</option>
        <option value="BESPOKE">Bespoke Aluminium</option>
      </select>
      
      <input type="file" id="boq-upload" accept=".xlsx" style="display: none;" onchange="processBOQUpload(event)">
      <button class="btn btn-primary" onclick="document.getElementById('boq-upload').click()">+ Upload BOQ Variant</button>
      <div id="upload-status" style="margin-top: 16px; color: var(--success); display: none;">BOQ Synced Successfully.</div>
    </div>
    
    <div class="card">
      <h3>Design Pad</h3>
      <canvas id="drawing-pad" width="400" height="400" class="canvas-container"></canvas>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary" onclick="window.pad.cloneSystem('ALUPLAST')">Clone to Aluplast</button>
        <button class="btn btn-secondary" onclick="window.pad.cloneSystem('SCHUCO')">Clone to Schuco</button>
      </div>
    </div>
  `;
    window.pad = new TopologyPad('drawing-pad');
}

async function processBOQUpload(event) {
    const file = event.target.files[0];
    const systemTag = document.getElementById('system-selector').value;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        let totalCost = 0;
        mismatchQueue = [];

        // Silent Cost processing and Mismatch logic
        jsonData.forEach(row => {
            if (row.Cost) totalCost += Number(row.Cost);
            const masterWidth = 1200; // Simulating local DB fetch for Master RFQ Item
            if (row.Width && row.Width !== masterWidth) {
                mismatchQueue.push({ itemCode: row.ItemCode || 'Unknown', originalWidth: masterWidth, boqWidth: row.Width });
            }
        });

        parsedBOQData = { file, systemTag, totalCost, base64: null };
        const b64Reader = new FileReader();
        b64Reader.onload = (b64e) => {
            parsedBOQData.base64 = b64e.target.result;
            mismatchQueue.length > 0 ? showMismatchModal() : finalizeBOQUpload();
        };
        b64Reader.readAsDataURL(file);
    };
    reader.readAsArrayBuffer(file);
}

function showMismatchModal() {
    if (currentMismatchIndex >= mismatchQueue.length) {
        document.getElementById('mismatch-modal').classList.add('hidden');
        return finalizeBOQUpload();
    }
    const match = mismatchQueue[currentMismatchIndex];
    document.getElementById('mismatch-content').innerHTML = `
    <div class="mismatch-box">
      <p><strong>Item:</strong> ${match.itemCode}</p>
      <div style="display: flex; justify-content: space-between; margin-top: 12px;">
        <div style="color: var(--danger);"><strong>Master:</strong> ${match.originalWidth}mm</div>
        <div style="color: var(--success);"><strong>BOQ:</strong> ${match.boqWidth}mm</div>
      </div>
    </div>
  `;
    document.getElementById('mismatch-modal').classList.remove('hidden');
}

function acceptMismatch() { currentMismatchIndex++; showMismatchModal(); }
function rejectMismatch() { currentMismatchIndex++; showMismatchModal(); }

async function finalizeBOQUpload() {
    const payload = {
        action: 'upload_boq_variant',
        data: {
            projectId: currentProjectId,
            systemTag: parsedBOQData.systemTag,
            fileName: `BOQ_${parsedBOQData.systemTag}_${parsedBOQData.file.name}`,
            fileData: parsedBOQData.base64,
            cost: parsedBOQData.totalCost
        }
    };
    await queueSyncAction('upload_boq_variant', payload);
    document.getElementById('upload-status').style.display = 'block';
    setTimeout(() => document.getElementById('upload-status').style.display = 'none', 3000);
    currentMismatchIndex = 0;
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        if (e.currentTarget.dataset.target === 'projects') loadProjectView();
    });
});