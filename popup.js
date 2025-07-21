document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const parametersDiv = document.getElementById('parameters');
  
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    
    // Get query parameters
    const params = new URLSearchParams(url.search);
    const base64Params = [];
    
    // Check each parameter for base64
    for (const [key, value] of params) {
      if (isBase64(value)) {
        base64Params.push({ key, value });
      }
    }
    
    if (base64Params.length === 0) {
      statusDiv.textContent = 'No base64-encoded query parameters found.';
      return;
    }
    
    statusDiv.textContent = `Found ${base64Params.length} base64-encoded parameter(s):`;
    
    // Display each parameter
    base64Params.forEach((param, index) => {
      const paramDiv = createParameterDiv(param, index, url, tab.id);
      parametersDiv.appendChild(paramDiv);
    });
    
  } catch (error) {
    statusDiv.textContent = 'Error: ' + error.message;
  }
});

function isBase64(str) {
  // Basic base64 validation - allow strings with or without padding
  const base64Regex = /^[A-Za-z0-9+/]*=*$/;
  
  // Check minimum length and valid base64 length
  if (!base64Regex.test(str) || str.length < 4) return false;
  
  try {
    // Try to decode
    const decoded = atob(str);
    // Re-encode and compare without padding to handle both padded and unpadded base64
    const reencoded = btoa(decoded);
    const strWithoutPadding = str.replace(/=+$/, '');
    const reencodedWithoutPadding = reencoded.replace(/=+$/, '');
    return strWithoutPadding === reencodedWithoutPadding;
  } catch (e) {
    return false;
  }
}

function createParameterDiv(param, index, url, tabId) {
  const div = document.createElement('div');
  div.className = 'parameter';
  
  const header = document.createElement('div');
  header.className = 'param-header';
  header.innerHTML = `<strong>${param.key}</strong>`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'param-content';
  
  let decoded = '';
  let isJson = false;
  
  try {
    decoded = atob(param.value);
    // Try to parse as JSON and pretty print
    try {
      const jsonObj = JSON.parse(decoded);
      decoded = JSON.stringify(jsonObj, null, 2);
      isJson = true;
    } catch (e) {
      // Not JSON, use raw decoded value
    }
  } catch (e) {
    decoded = 'Error decoding base64';
  }
  
  const textarea = document.createElement('textarea');
  textarea.className = 'content-editor';
  textarea.value = decoded;
  textarea.rows = 8;
  textarea.id = `editor-${index}`;
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';
  
  const updateButton = document.createElement('button');
  updateButton.textContent = 'Update URL';
  updateButton.className = 'update-btn';
  updateButton.onclick = () => updateParameter(param.key, textarea.value, isJson, url, tabId);
  
  const copyDecodedButton = document.createElement('button');
  copyDecodedButton.textContent = 'Copy Decoded';
  copyDecodedButton.className = 'copy-btn';
  copyDecodedButton.onclick = () => copyToClipboard(textarea.value);
  
  const copyEncodedButton = document.createElement('button');
  copyEncodedButton.textContent = 'Copy Encoded';
  copyEncodedButton.className = 'copy-btn';
  copyEncodedButton.onclick = () => {
    const encoded = encodeContent(textarea.value, isJson);
    copyToClipboard(encoded);
  };
  
  buttonContainer.appendChild(updateButton);
  buttonContainer.appendChild(copyDecodedButton);
  buttonContainer.appendChild(copyEncodedButton);
  
  contentDiv.appendChild(textarea);
  contentDiv.appendChild(buttonContainer);
  
  div.appendChild(header);
  div.appendChild(contentDiv);
  
  return div;
}

function encodeContent(content, isJson) {
  let toEncode = content;
  if (isJson) {
    try {
      // Parse and stringify to remove formatting
      const jsonObj = JSON.parse(content);
      toEncode = JSON.stringify(jsonObj);
    } catch (e) {
      // If parsing fails, use as is
    }
  }
  return btoa(toEncode);
}

function updateParameter(key, newContent, isJson, url, tabId) {
  try {
    const encoded = encodeContent(newContent, isJson);
    
    // Update URL
    const params = new URLSearchParams(url.search);
    params.set(key, encoded);
    url.search = params.toString();
    
    // Navigate to new URL
    chrome.tabs.update(tabId, { url: url.toString() });
    
    // Show success message
    showMessage('URL updated! The page will reload.');
  } catch (error) {
    showMessage('Error: ' + error.message, true);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showMessage('Copied to clipboard!');
  }).catch(err => {
    showMessage('Failed to copy: ' + err, true);
  });
}

function showMessage(msg, isError = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = isError ? 'message error' : 'message success';
  msgDiv.textContent = msg;
  document.body.appendChild(msgDiv);
  
  setTimeout(() => {
    msgDiv.remove();
  }, 3000);
}