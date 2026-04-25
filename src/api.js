const API_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';

async function apiPost(payload) {
    const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for simple Google Apps Script Web App setups without preflight
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return response;
}