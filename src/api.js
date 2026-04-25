const API_URL = 'https://script.google.com/macros/s/AKfycbyTSWKWgWPT8JBAFsW80ONZDGzl7hbnVO6E-5g1fYaBVW_7uiOgbTM8n_ApxxUbWZPZzw/exec';

async function apiPost(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors', // Required for simple Google Apps Script Web App setups without preflight
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response;
}
