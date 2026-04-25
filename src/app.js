// src/app.js

// -- State Management & DB Stubs --
let currentProjectId = 'PROJ_001';
let mismatchQueue = [];
let currentMismatchIndex = 0;
let parsedBOQData = null;



window.handleCredentialResponse = function(response) {
    document.getElementById('auth-screen')?.classList.remove('active');
    document.getElementById('app-screen')?.classList.add('active');
    loadView('project-engineering');
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(e => console.log('SW error:', e));
}

const state = {
    currentView: 'dashboard',
    isOnline: navigator.onLine,
    projects: [
        { id: 'P1', name: 'Villa 14', status: 'Design', client_id: 'C1', architect_firm_id: 'A1', stall_days: 2 },
        { id: 'P2', name: 'Sunset Residency', status: 'Quote', client_id: 'C2', architect_firm_id: 'A2', stall_days: 6 }
    ],
    clients: [
        { id: 'C1', name: 'John Doe', phone: '1234567890', city: 'Mumbai', type_tag: 'Direct' },
        { id: 'C2', name: 'Jane Smith', phone: '0987654321', city: 'Delhi', type_tag: 'Direct' }
    ],
    architects: [
        { id: 'A1', firm_name: 'Studio Arch', main_contact: 'Alice', phone: '111222333', city: 'Pune' },
        { id: 'A2', firm_name: 'Design Hub', main_contact: 'Bob', phone: '444555666', city: 'Bangalore' }
    ],
    activities: [],
    rfqs: [],
    financials: [
        { project_id: 'P1', total_value: 500000, received: 100000, pending: 400000 }
    ]
};

// -- Core App Initialization --
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initNetworkStatus();
    loadView(state.currentView);
    setupConsentModal();
});

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.dataset.target || e.currentTarget.dataset.view;
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.currentView = view;
            loadView(view);
        });
    });
}

function initNetworkStatus() {
    const statusIcon = document.getElementById('sync-status');
    const updateOnlineStatus = () => {
        state.isOnline = navigator.onLine;
        if (statusIcon) {
            statusIcon.textContent = state.isOnline ? 'cloud_done' : 'cloud_off';
            statusIcon.className = `material-icons-round status-icon ${state.isOnline ? 'online' : 'offline'}`;
        }
        if (state.isOnline) {
            triggerSync(); // alias: was syncQueue
        }
    };
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // initial check
}



// -- Consent Gate --
let pendingAction = null;
function setupConsentModal() {
    document.getElementById('consent-deny').addEventListener('click', () => {
        document.getElementById('consent-modal').classList.add('hidden');
        pendingAction = null;
    });
    
    document.getElementById('consent-approve').addEventListener('click', () => {
        document.getElementById('consent-modal').classList.add('hidden');
        if (pendingAction) {
            logAuthAction(pendingAction.type, pendingAction.recipient);
            pendingAction.execute();
            pendingAction = null;
        }
    });
}

function requireConsent(actionType, recipient, executeCallback) {
    pendingAction = { type: actionType, recipient, execute: executeCallback };
    document.getElementById('consent-message').textContent = `Do you authorize sending an automated ${actionType} to ${recipient}?`;
    document.getElementById('consent-modal').classList.remove('hidden');
}

function logAuthAction(actionType, recipient) {
    const logEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action_type: actionType,
        recipient: recipient,
        status: 'approved',
        user_consent_id: 'user_123'
    };
    queueSyncAction('AUTH_LOG', logEntry);
}

// -- View Router --
function loadView(view) {
    const main = document.getElementById('main-content');
    const title = document.getElementById('page-title');
    main.innerHTML = ''; // clear

    switch(view) {
        case 'dashboard':
            if (title) title.textContent = 'Dashboard';
            loadDashboard(main);
            break;
        case 'crm':
            if (title) title.textContent = 'CRM Manager';
            loadCRM(main);
            break;
        case 'kanban':
        case 'projects': // Alias to map to user's HTML
            if (title) title.textContent = 'Project Pipeline';
            loadKanban(main);
            break;
        case 'rfq':
            if (title) title.textContent = 'Master RFQs';
            loadRFQBuilder(main);
            break;
        case 'financials':
        case 'settings': // Alias to map to user's HTML for now
            if (title) title.textContent = 'Settings / Finance';
            loadFinancials(main);
            break;
        case 'project-detail':
            if (title) title.textContent = 'Project Details';
            loadProjectDetail(main, state.currentProject);
            break;
        case 'elevation-approval':
            if (title) title.textContent = 'Elevation Approval';
            loadElevationApproval(main);
            break;
        case 'project-engineering':
            if (title) title.textContent = 'Project Engineering';
            loadProjectView(main);
            break;
    }
}

// -- Module: Dashboard --
function loadDashboard(container) {
    const overdueCount = state.projects.filter(p => p.stall_days > 5).length;
    
    container.innerHTML = `
        <div class="grid grid-cols-2">
            <div class="card">
                <div class="card-title">Active Projects</div>
                <div class="card-value">${state.projects.length}</div>
            </div>
            <div class="card">
                <div class="card-title">Stalled (>5 days)</div>
                <div class="card-value ${overdueCount > 0 ? 'text-danger' : 'text-success'}">${overdueCount}</div>
            </div>
        </div>
        <div class="card" style="margin-top: 16px;">
            <div class="card-title">Today's Follow-ups</div>
            <p class="text-muted">No pending follow-ups for today.</p>
        </div>
        <div class="card" style="margin-top: 16px;">
            <div class="card-title">Quick Actions</div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-primary" onclick="appContext.triggerConsent('SMS', 'Client')"><span class="material-icons-round">sms</span> Send Update</button>
            </div>
        </div>
    `;
}

// -- Module: CRM Manager --
function loadCRM(container) {
    container.innerHTML = `
        <div class="tabs">
            <div class="tab active" id="tab-clients">Direct Clients</div>
            <div class="tab" id="tab-architects">Architect Firms</div>
        </div>
        <div class="search-bar">
            <input type="text" placeholder="Search..." id="crm-search">
            <button class="btn btn-secondary"><span class="material-icons-round">search</span></button>
        </div>
        <div id="crm-list"></div>
    `;

    const crmList = document.getElementById('crm-list');
    
    const renderClients = () => {
        crmList.innerHTML = state.clients.map(c => `
            <div class="list-item">
                <div class="list-item-content">
                    <h4>${c.name}</h4>
                    <p>${c.city} • ${c.phone}</p>
                </div>
                <button class="icon-btn"><span class="material-icons-round">chevron_right</span></button>
            </div>
        `).join('');
    };

    const renderArchitects = () => {
        crmList.innerHTML = state.architects.map(a => `
            <div class="list-item">
                <div class="list-item-content">
                    <h4>${a.firm_name}</h4>
                    <p>Contact: ${a.main_contact} • ${a.city}</p>
                </div>
                <button class="icon-btn"><span class="material-icons-round">chevron_right</span></button>
            </div>
        `).join('');
    };

    document.getElementById('tab-clients').addEventListener('click', (e) => {
        e.target.classList.add('active');
        document.getElementById('tab-architects').classList.remove('active');
        renderClients();
    });

    document.getElementById('tab-architects').addEventListener('click', (e) => {
        e.target.classList.add('active');
        document.getElementById('tab-clients').classList.remove('active');
        renderArchitects();
    });

    renderClients(); // Default
}

// -- Module: Merged Kanban Board --
function loadKanban(container) {
    const stages = ['Lead', 'Design', 'Quote', 'Negotiation', 'Order', 'Installation'];
    
    let html = `<div class="kanban-board">`;
    
    stages.forEach(stage => {
        const stageProjects = state.projects.filter(p => p.status === stage);
        html += `
            <div class="kanban-column">
                <div class="kanban-column-header">
                    <span>${stage}</span>
                    <span class="bg-danger-light" style="color:var(--text-main); background:#e2e8f0;">${stageProjects.length}</span>
                </div>
        `;
        
        stageProjects.forEach(p => {
            const isStalled = p.stall_days > 5;
            html += `
                <div class="kanban-card ${isStalled ? 'stalled' : ''}" onclick="appContext.openProject('${p.id}')">
                    <div class="flex-between">
                        <strong>${p.name}</strong>
                        ${isStalled ? '<span class="material-icons-round text-danger" style="font-size:16px;">warning</span>' : ''}
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">
                        Idle: ${p.stall_days} days
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

// -- Module: Project Detail & Activity Tracker --
function loadProjectDetail(container, projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if(!project) return;

    container.innerHTML = `
        <div style="margin-bottom:16px;">
            <button class="btn btn-secondary" onclick="appContext.loadView('kanban')">
                <span class="material-icons-round">arrow_back</span> Back
            </button>
        </div>
        <div class="card" style="margin-bottom: 16px;">
            <div class="flex-between">
                <h2>${project.name}</h2>
                <span class="bg-danger-light">${project.status}</span>
            </div>
        </div>
        
        <div class="card" style="margin-bottom: 16px;">
            <h3>Log Activity</h3>
            <form id="activity-form" style="margin-top: 16px;">
                <div class="form-group">
                    <label>Notes / Outcome</label>
                    <textarea id="act-notes" rows="3" required></textarea>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label>Next Follow-up Date *</label>
                        <input type="date" id="act-date" required>
                    </div>
                    <div class="form-group">
                        <label>Next Action *</label>
                        <select id="act-next" required>
                            <option value="">Select...</option>
                            <option value="Call">Call</option>
                            <option value="Site Visit">Site Visit</option>
                            <option value="Send Quote">Send Quote</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;">Save Activity</button>
            </form>
        </div>

        <div class="timeline">
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <div style="font-size:0.75rem; color:var(--text-muted);">Yesterday</div>
                    <strong>Initial Meeting</strong>
                    <p style="font-size:0.875rem; margin-top:4px;">Discussed requirements for Villa. Needs Schuco quote.</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('activity-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const date = document.getElementById('act-date').value;
        const next = document.getElementById('act-next').value;
        
        if(!date || !next) {
            alert('Validation Error: Next Follow-up Date and Next Action are mandatory.');
            return;
        }

        const payload = {
            id: Date.now().toString(),
            project_id: projectId,
            notes: document.getElementById('act-notes').value,
            next_followup_date: date,
            next_action: next,
            created_at: new Date().toISOString()
        };

        queueSyncAction('CREATE_ACTIVITY', payload);
        alert('Activity Logged!');
        e.target.reset();
    });
}

// -- Module: Master RFQ Builder --
function loadRFQBuilder(container) {
    container.innerHTML = `
        <div class="card" style="margin-bottom:16px;">
            <h2>Master RFQ Builder</h2>
            <form id="rfq-form" style="margin-top:16px;">
                <div class="form-group">
                    <label>Project</label>
                    <select required>
                        ${state.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label>Location (e.g. Master Bed)</label>
                        <input type="text" required>
                    </div>
                    <div class="form-group">
                        <label>Design Topology</label>
                        <select required>
                            <option>Casement Window</option>
                            <option>Sliding Door</option>
                            <option>Tilt & Turn</option>
                            <option>Fixed Glazing</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label>Width (mm)</label>
                        <input type="number" required>
                    </div>
                    <div class="form-group">
                        <label>Height (mm)</label>
                        <input type="number" required>
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label>Sill Height Preset</label>
                        <select>
                            <option value="0">Floor Level (0mm)</option>
                            <option value="900">Bedroom (900mm)</option>
                            <option value="1100">Kitchen (1100mm)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Glass Spec</label>
                        <input type="text" placeholder="6mm Toughened">
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Add Item to Master RFQ</button>
            </form>
        </div>
        
        <div style="text-align: center;">
            <button class="btn btn-secondary" onclick="appContext.loadView('project-engineering')">
                Go to Project Engineering & BOQ Upload
            </button>
            <button class="btn btn-secondary" style="margin-left: 8px;" onclick="appContext.loadView('elevation-approval')">
                View Elevation Approvals
            </button>
        </div>
    `;

    document.getElementById('rfq-form').addEventListener('submit', (e) => {
        e.preventDefault();
        queueSyncAction('CREATE_RFQ_ITEM', { rfq_no: 'RFQ-001', data: '...' });
        alert('Item added offline. Syncing when online.');
    });
}

// -- Module: Elevation Approval View --
function loadElevationApproval(container) {
    container.innerHTML = `
        <div style="margin-bottom:16px;">
            <button class="btn btn-secondary" onclick="appContext.loadView('rfq')">
                <span class="material-icons-round">arrow_back</span> Back to RFQs
            </button>
        </div>
        <div class="card">
            <div class="flex-between">
                <h3>W1 - Master Bedroom</h3>
                <span class="bg-danger-light" style="background:#fef3c7; color:#d97706;">Pending Sign-off</span>
            </div>
            <div style="margin: 16px 0; height: 200px; background: #e2e8f0; border-radius: 8px; display:flex; align-items:center; justify-content:center;">
                <span class="material-icons-round" style="font-size:48px; color:var(--text-muted)">image</span>
                <span style="color:var(--text-muted); margin-left:8px;">Elevation Sketch Placeholder</span>
            </div>
            <div class="grid grid-cols-2" style="font-size: 0.875rem; margin-bottom: 16px;">
                <div><strong>Size:</strong> 1500w x 1200h</div>
                <div><strong>Glass:</strong> 6mm Clear Toughened</div>
                <div><strong>System:</strong> Schuco AWS 50</div>
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="appContext.triggerConsent('Email', 'Architect (PDF layout attached)')">
                Digital Sign-off & Approve
            </button>
        </div>
    `;
}

// -- Module: Project Engineering & BOQ --
function loadProjectView(container) {
  if(!container) container = document.getElementById('main-content');
  container.innerHTML = `
    <div style="margin-bottom:16px;">
        <button class="btn btn-secondary" onclick="appContext.loadView('rfq')">
            <span class="material-icons-round">arrow_back</span> Back to RFQs
        </button>
    </div>
    <div class="card" style="margin-bottom: 16px;">
      <h2>Project Engineering</h2>
      <p class="text-muted">Upload multi-system BOQs for Value Engineering.</p>
      
      <div class="form-group" style="margin-top:16px;">
        <select id="system-selector">
            <option value="SCHUCO">Schuco System</option>
            <option value="ALUPLAST">Aluplast uPVC</option>
            <option value="BESPOKE">Bespoke Aluminium</option>
        </select>
      </div>
      
      <input type="file" id="boq-upload" accept=".xlsx" style="display: none;" onchange="window.processBOQUpload(event)">
      <button class="btn btn-primary" onclick="document.getElementById('boq-upload').click()">+ Upload BOQ Variant</button>
      <div id="upload-status" style="margin-top: 16px; color: var(--success); display: none; font-weight:600;">BOQ Synced Successfully.</div>
    </div>
    
    <div class="card">
      <h3>Design Pad</h3>
      <div style="background:#e2e8f0; border-radius:8px; display:flex; justify-content:center; align-items:center; margin:16px 0;">
        <canvas id="drawing-pad" width="400" height="300" class="canvas-container"></canvas>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary" onclick="window.pad.cloneSystem('ALUPLAST')">Clone to Aluplast</button>
        <button class="btn btn-secondary" onclick="window.pad.cloneSystem('SCHUCO')">Clone to Schuco</button>
      </div>
    </div>
  `;
  window.pad = new TopologyPad('drawing-pad');
}

window.processBOQUpload = async function(event) {
  const file = event.target.files[0];
  const systemTag = document.getElementById('system-selector').value;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);
    // Uses SheetJS (XLSX) from CDN
    if(typeof XLSX === 'undefined') {
        alert("XLSX library not loaded yet.");
        return;
    }
    const workbook = XLSX.read(data, {type: 'array'});
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

    // If empty JSON data (bad excel), add dummy mismatch for demo
    if(jsonData.length === 0) {
        mismatchQueue.push({ itemCode: 'W1', originalWidth: 1200, boqWidth: 1500 });
    }

    parsedBOQData = { file, systemTag, totalCost, base64: null };
    const b64Reader = new FileReader();
    b64Reader.onload = (b64e) => {
      parsedBOQData.base64 = b64e.target.result;
      mismatchQueue.length > 0 ? showMismatchModal() : window.finalizeBOQUpload();
    };
    b64Reader.readAsDataURL(file);
  };
  reader.readAsArrayBuffer(file);
}

function showMismatchModal() {
  if (currentMismatchIndex >= mismatchQueue.length) {
    document.getElementById('mismatch-modal').classList.add('hidden');
    return window.finalizeBOQUpload();
  }
  const match = mismatchQueue[currentMismatchIndex];
  document.getElementById('mismatch-content').innerHTML = `
    <div class="mismatch-box" style="background:var(--background); padding:12px; border-radius:8px;">
      <p><strong>Item:</strong> ${match.itemCode}</p>
      <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size:1.1rem;">
        <div style="color: var(--danger);"><strong>Master:</strong> ${match.originalWidth}mm</div>
        <div style="color: var(--success);"><strong>BOQ:</strong> ${match.boqWidth}mm</div>
      </div>
    </div>
  `;
  document.getElementById('mismatch-modal').classList.remove('hidden');
}

window.acceptMismatch = function() { currentMismatchIndex++; showMismatchModal(); }
window.rejectMismatch = function() { currentMismatchIndex++; showMismatchModal(); }

window.finalizeBOQUpload = async function() {
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

// -- Module: Financials View --
function loadFinancials(container) {
    const totalPending = state.financials.reduce((acc, f) => acc + f.pending, 0);

    container.innerHTML = `
        <div class="card" style="margin-bottom: 16px; background: var(--primary); color: white;">
            <div style="font-size:0.875rem; opacity:0.9;">Total Outstanding</div>
            <div style="font-size:2rem; font-weight:700;">₹${totalPending.toLocaleString()}</div>
        </div>

        <h3>Project Balances</h3>
        <div style="margin-top: 12px;">
            ${state.financials.map(f => `
                <div class="card" style="margin-bottom:12px;">
                    <div class="flex-between">
                        <strong>Project ${f.project_id}</strong>
                        <span class="text-danger">₹${f.pending.toLocaleString()} Pending</span>
                    </div>
                    <div style="margin-top:12px; font-size:0.875rem;">
                        <div class="flex-between" style="margin-bottom:4px;">
                            <span>Total Value</span>
                            <span>₹${f.total_value.toLocaleString()}</span>
                        </div>
                        <div class="flex-between">
                            <span>Received</span>
                            <span class="text-success">₹${f.received.toLocaleString()}</span>
                        </div>
                    </div>
                    <button class="btn btn-secondary" style="width:100%; margin-top:12px;">
                        Record Payment
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

// -- Expose context for inline handlers --
window.appContext = {
    loadView,
    openProject: (id) => {
        state.currentProject = id;
        loadView('project-detail');
    },
    triggerConsent: (actionType, recipient) => {
        requireConsent(actionType, recipient, () => {
            console.log(`Executing automated ${actionType} to ${recipient}`);
            // App Script POST call would go here
            alert(`Automated action executed and logged!`);
        });
    }
};
