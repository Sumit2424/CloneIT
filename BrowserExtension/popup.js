document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const serverStatus = document.getElementById('serverStatus');
  const noSession = document.getElementById('noSession');
  const activeSession = document.getElementById('activeSession');
  const sessionId = document.getElementById('sessionId');
  const captureStatus = document.getElementById('captureStatus');
  const startSessionBtn = document.getElementById('startSessionBtn');
  const stopSessionBtn = document.getElementById('stopSessionBtn');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const viewSessionsBtn = document.getElementById('viewSessionsBtn');
  const radioBtns = document.querySelectorAll('input[name="capture-mode"]');

  // Server URL
  const SERVER_URL = 'http://localhost:5000';

  // State
  let isServerConnected = false;
  let isCapturing = false;
  let activeSessionIdValue = null;
  let selectedMode = 'visible';

  // Check server connection status on popup open
  checkServerConnection();

  // Check if there's an active capture in the current tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "getStatus"}, function(response) {
        if (response && response.isCapturing) {
          isCapturing = true;
          updateCaptureUI();
        }
      });
    }
  });

  // Event Listeners
  startSessionBtn.addEventListener('click', startSession);
  stopSessionBtn.addEventListener('click', stopSession);
  startBtn.addEventListener('click', startCapture);
  stopBtn.addEventListener('click', stopCapture);
  viewSessionsBtn.addEventListener('click', viewSessions);

  // Listen for mode changes
  radioBtns.forEach(btn => {
    btn.addEventListener('change', function() {
      selectedMode = this.value;
    });
  });

  // Functions
  function checkServerConnection() {
    fetch(`${SERVER_URL}/test`)
      .then(response => response.json())
      .then(data => {
        isServerConnected = true;
        const dot = serverStatus.querySelector('.dot');
        const statusText = serverStatus.querySelector('.status-text');
        
        dot.classList.remove('disconnected');
        dot.classList.add('connected');
        statusText.textContent = 'Server connected';
        
        // Check if there's an active session
        if (data.activeSession) {
          activeSessionIdValue = data.activeSession;
          sessionId.textContent = data.activeSession;
          captureStatus.textContent = data.isCapturing ? 'Capturing' : 'Paused';
          
          noSession.style.display = 'none';
          activeSession.style.display = 'block';
          
          // Update button states
          startBtn.disabled = !data.isCapturing;
          stopBtn.disabled = !data.isCapturing;
        } else {
          noSession.style.display = 'block';
          activeSession.style.display = 'none';
          
          // If no active session, enable start session button
          startSessionBtn.disabled = false;
          
          // But disable capture buttons
          startBtn.disabled = true;
          stopBtn.disabled = true;
        }
      })
      .catch(error => {
        console.error('Server connection failed:', error);
        isServerConnected = false;
        
        const dot = serverStatus.querySelector('.dot');
        const statusText = serverStatus.querySelector('.status-text');
        
        dot.classList.remove('connected');
        dot.classList.add('disconnected');
        statusText.textContent = 'Server offline';
        
        // Disable buttons if server is not connected
        startSessionBtn.disabled = true;
        startBtn.disabled = true;
        stopBtn.disabled = true;
      });
  }

  function startSession() {
    if (!isServerConnected) {
      alert('Server is not connected. Please check your backend server.');
      return;
    }
    
    // Disable the button while we're waiting for server response
    startSessionBtn.disabled = true;
    
    fetch(`${SERVER_URL}/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert(`Error: ${data.error}`);
        startSessionBtn.disabled = false; // Re-enable the button if there's an error
        return;
      }
      
      activeSessionIdValue = data.sessionId;
      sessionId.textContent = data.sessionId;
      captureStatus.textContent = 'Ready';
      
      noSession.style.display = 'none';
      activeSession.style.display = 'block';
      
      // Enable/disable the appropriate buttons
      startBtn.disabled = false;
      stopBtn.disabled = true;
      
      alert(`Session ${data.sessionId} started. You can now begin capturing.`);
    })
    .catch(error => {
      console.error('Error starting session:', error);
      alert('Failed to start session. Check console for details.');
      startSessionBtn.disabled = false; // Re-enable the button on error
    });
  }

  function stopSession() {
    if (!activeSessionIdValue) {
      alert('No active session to stop.');
      return;
    }
    
    fetch(`${SERVER_URL}/sessions/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      // Stop capturing if it's running
      stopCapture();
      
      // Update UI
      activeSessionIdValue = null;
      noSession.style.display = 'block';
      activeSession.style.display = 'none';
      
      // Enable the start session button
      startSessionBtn.disabled = false;
      
      // Reset the startBtn and stopBtn
      startBtn.disabled = true;
      stopBtn.disabled = true;
      
      alert(`Session ${data.sessionId} stopped.`);
    })
    .catch(error => {
      console.error('Error stopping session:', error);
      alert('Failed to stop session. Check console for details.');
    });
  }

  function startCapture() {
    if (!activeSessionIdValue) {
      alert('Please start a session first.');
      return;
    }
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            action: "startCapture",
            mode: selectedMode
          },
          function(response) {
            if (response && response.status === 'ok') {
              isCapturing = true;
              updateCaptureUI();
              
              // Update session status
              captureStatus.textContent = 'Capturing (5s interval)';
            } else {
              alert('Failed to start capture in the current tab.');
            }
          }
        );
      }
    });
  }

  function stopCapture() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "stopCapture" },
          function(response) {
            isCapturing = false;
            updateCaptureUI();
            
            // Update session status if we have an active session
            if (activeSessionIdValue) {
              captureStatus.textContent = 'Paused';
            }
          }
        );
      }
    });
  }

  function updateCaptureUI() {
    startBtn.disabled = isCapturing;
    stopBtn.disabled = !isCapturing;
  }

  function viewSessions() {
    chrome.tabs.create({
      url: `${SERVER_URL}/static/sessions.html`
      });
  }
});
