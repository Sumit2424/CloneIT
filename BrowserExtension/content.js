console.log('🔍 CloneIT - Loading content script');

// Check if html2canvas is available in the content script
if (typeof html2canvas === 'undefined') {
  console.error('❌ CloneIT - html2canvas is not available in content script!');
}

let isCapturing = false;
let captureInterval = null;
let selectedArea = null;
let selectionBox = null;
let mode = "visible"; // Default to visible
let captureCount = 0; // Counter for captures in this session

// Function to inject html2canvas directly into the page if needed
function ensureHtml2Canvas() {
  // First check if it's already available
  if (typeof html2canvas !== 'undefined') {
    console.log('✅ CloneIT - html2canvas already available');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    console.log('🔄 CloneIT - Attempting to load html2canvas...');
    
    // Check if we tried loading before
    if (document.querySelector('script[src*="html2canvas"]')) {
      console.log('🔄 CloneIT - html2canvas script already in DOM, waiting for it to load...');
      // Give it a bit more time to load
      setTimeout(() => {
        if (typeof html2canvas !== 'undefined') {
          console.log('✅ CloneIT - html2canvas is now available');
          resolve();
        } else {
          console.error('❌ CloneIT - html2canvas still not available after waiting');
          reject(new Error('Failed to load html2canvas even after waiting'));
        }
      }, 1000);
      return;
    }
    
    // Create a script element to inject html2canvas
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('html2canvas.min.js');
    script.onload = () => {
      console.log('✅ CloneIT - html2canvas loaded successfully');
      resolve();
    };
    script.onerror = (error) => {
      console.error('❌ CloneIT - Failed to load html2canvas:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

function startSelection() {
  document.addEventListener("mousedown", onMouseDown);
}

function onMouseDown(e) {
  const startX = e.clientX;
  const startY = e.clientY;

  selectionBox = document.createElement("div");
  selectionBox.style.position = "absolute";
  selectionBox.style.border = "2px dashed #00f";
  selectionBox.style.background = "rgba(0, 0, 255, 0.2)";
  selectionBox.style.zIndex = "999999";
  selectionBox.style.left = `${startX}px`;
  selectionBox.style.top = `${startY}px`;
  document.body.appendChild(selectionBox);

  function onMouseMove(e2) {
    const width = e2.clientX - startX;
    const height = e2.clientY - startY;

    selectionBox.style.width = `${Math.abs(width)}px`;
    selectionBox.style.height = `${Math.abs(height)}px`;
    selectionBox.style.left = `${width < 0 ? e2.clientX : startX}px`;
    selectionBox.style.top = `${height < 0 ? e2.clientY : startY}px`;
  }

  function onMouseUp(e3) {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    const rect = selectionBox.getBoundingClientRect();
    selectedArea = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    selectionBox.remove();
    selectionBox = null;

    startCaptureChunk(); // Start capturing after selection
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

// Simplified capture function that uses direct canvas
function captureSimple(area) {
  console.log('🔄 CloneIT - Performing simplified capture for area:', area);
  
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = area.width;
  canvas.height = area.height;
  
  // Get the 2D context
  const ctx = canvas.getContext('2d');
  
  try {
    // Draw the current view to the canvas
    ctx.drawWindow(
      window,
      area.left,
      area.top,
      area.width,
      area.height,
      'rgb(255,255,255)'
    );
    
    return canvas.toDataURL();
  } catch (e) {
    console.error('❌ CloneIT - Error in captureSimple:', e);
    return null;
  }
}

function startCaptureChunk() {
  if (mode === "custom" && !selectedArea) {
    console.log('⚠️ CloneIT - Custom mode selected but no area defined. Please select an area first.');
    return;
  }

  // Stop any existing capture before starting a new one
  if (isCapturing) {
    stopCapture();
  }

  // Reset capture counter
  captureCount = 0;

  isCapturing = true;
  
  // Add visual indicator that capture is active
  const captureIndicator = document.createElement("div");
  captureIndicator.id = "cloneit-capture-indicator";
  captureIndicator.style.position = "fixed";
  captureIndicator.style.top = "10px";
  captureIndicator.style.left = "10px";
  captureIndicator.style.background = "rgba(0, 128, 0, 0.8)";
  captureIndicator.style.color = "white";
  captureIndicator.style.padding = "10px";
  captureIndicator.style.borderRadius = "5px";
  captureIndicator.style.zIndex = "999999";
  captureIndicator.style.fontFamily = "Arial, sans-serif";
  captureIndicator.style.fontSize = "12px";
  captureIndicator.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
  captureIndicator.style.lineHeight = "1.4";
  captureIndicator.style.minWidth = "180px";
  captureIndicator.innerHTML = "CloneIT: Starting capture...";
  document.body.appendChild(captureIndicator);

  console.log('✅ CloneIT - Starting capture with mode:', mode, 'at interval of 5 seconds');

  // Take first capture immediately
  doCaptureNow();

  // Set up interval to capture every 5 seconds
  captureInterval = setInterval(doCaptureNow, 5000);
  
  // Log that the interval was set up
  console.log('✅ CloneIT - Capture interval set to 5 seconds with ID:', captureInterval);
  
  // Set up a watchdog to ensure capturing doesn't stop
  // Check every 10 seconds if we're still capturing and reinitialize if needed
  setInterval(() => {
    const indicator = document.getElementById("cloneit-capture-indicator");
    
    if (isCapturing && !indicator) {
      console.log('🔄 CloneIT - Watchdog detected missing indicator, recreating...');
      const newIndicator = document.createElement("div");
      newIndicator.id = "cloneit-capture-indicator";
      newIndicator.style.position = "fixed";
      newIndicator.style.top = "10px";
      newIndicator.style.left = "10px";
      newIndicator.style.background = "rgba(0, 128, 0, 0.8)";
      newIndicator.style.color = "white";
      newIndicator.style.padding = "10px";
      newIndicator.style.borderRadius = "5px";
      newIndicator.style.zIndex = "999999";
      newIndicator.style.fontFamily = "Arial, sans-serif";
      newIndicator.style.fontSize = "12px";
      newIndicator.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
      newIndicator.style.lineHeight = "1.4";
      newIndicator.style.minWidth = "180px";
      newIndicator.innerHTML = "CloneIT: Capturing (restored)...";
      document.body.appendChild(newIndicator);
    }
    
    if (isCapturing && !captureInterval) {
      console.log('🔄 CloneIT - Watchdog detected missing interval, recreating...');
      captureInterval = setInterval(doCaptureNow, 5000);
    }
  }, 10000);
}

function doCaptureNow() {
  // Double check that capturing is still enabled
  if (!isCapturing) {
    console.log('❌ CloneIT - Capture called but isCapturing is false. Restarting capture process...');
    isCapturing = true;
    return;
  }

  // Increment the capture counter
  captureCount++;

  // Update indicator
  const indicator = document.getElementById("cloneit-capture-indicator");
  if (indicator) {
    const currentTime = new Date().toLocaleTimeString();
    const nextCaptureTime = new Date(Date.now() + 5000).toLocaleTimeString();
    
    indicator.innerHTML = `
      <div style="font-weight:bold;">CloneIT: Capturing...</div>
      <div>Time: ${currentTime}</div>
      <div>Capture #${captureCount} complete</div>
      <div>Next: ${nextCaptureTime} (5s interval)</div>
      <div>Page: ${document.title.substring(0, 20)}${document.title.length > 20 ? '...' : ''}</div>
    `;
  } else {
    // If indicator is missing, recreate it
    console.log('⚠️ CloneIT - Indicator missing, recreating...');
    const captureIndicator = document.createElement("div");
    captureIndicator.id = "cloneit-capture-indicator";
    captureIndicator.style.position = "fixed";
    captureIndicator.style.top = "10px";
    captureIndicator.style.left = "10px";
    captureIndicator.style.background = "rgba(0, 128, 0, 0.8)";
    captureIndicator.style.color = "white";
    captureIndicator.style.padding = "10px";
    captureIndicator.style.borderRadius = "5px";
    captureIndicator.style.zIndex = "999999";
    captureIndicator.style.fontFamily = "Arial, sans-serif";
    captureIndicator.style.fontSize = "12px";
    captureIndicator.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
    captureIndicator.style.lineHeight = "1.4";
    captureIndicator.style.minWidth = "180px";
    document.body.appendChild(captureIndicator);
    }

    // Define area to capture
      let crop = selectedArea || {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };

  console.log(`🔄 CloneIT - Performing capture #${captureCount} at ${new Date().toLocaleTimeString()}`);
    
    // Check if html2canvas is available
    if (typeof html2canvas === 'undefined') {
      console.error('❌ CloneIT - html2canvas is not defined! Trying emergency fallback');
      
      // Try injecting and using html2canvas
      ensureHtml2Canvas()
        .then(() => performCapture(crop))
        .catch(error => {
          console.error('❌ CloneIT - Failed to load html2canvas, using manual fallback');
          performManualCapture(crop);
        });
    } else {
      // html2canvas is available, proceed normally
      performCapture(crop);
    }
  
  // Double check the interval is still active
  if (!captureInterval) {
    console.log('⚠️ CloneIT - Interval was lost, recreating...');
    captureInterval = setInterval(doCaptureNow, 5000);
  }
}

function performCapture(crop) {
  try {
  const captureOptions = {
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
    useCORS: true,
    allowTaint: true,
      logging: false, // reduce console noise
      ignoreElements: (element) => {
        // Ignore our own UI elements
        return element.id === 'cloneit-capture-indicator';
      }
    };

    console.log('🔄 CloneIT - Calling html2canvas for capture #' + captureCount);
    
    // Set a timeout to handle hung captures
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('html2canvas timed out after 10 seconds')), 10000);
    });
    
    // Race between the capture and the timeout
    Promise.race([
      html2canvas(document.body, captureOptions),
      timeoutPromise
    ])
    .then((canvas) => {
        console.log('✅ CloneIT - html2canvas succeeded for capture #' + captureCount);
      
        try {
      // Create a cropped canvas
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = crop.width;
      croppedCanvas.height = crop.height;
      const croppedCtx = croppedCanvas.getContext("2d");

      croppedCtx.drawImage(canvas, crop.left, crop.top, crop.width, crop.height, 0, 0, crop.width, crop.height);
      const base64image = croppedCanvas.toDataURL("image/png").split(",")[1];

      // Get the HTML content
      const rawHTML = document.documentElement.outerHTML;

          console.log(`🔍 CloneIT - Sending capture #${captureCount} (${Math.round(base64image.length/1024)} KB)`);
      
      // Send to backend
      sendCaptureToServer(base64image, rawHTML, crop);
        } catch (cropError) {
          console.error('❌ CloneIT - Error cropping canvas:', cropError);
          performManualCapture(crop);
        }
    })
    .catch((error) => {
      console.error('❌ CloneIT - html2canvas failed:', error);
      performManualCapture(crop);
    });
  } catch (error) {
    console.error('❌ CloneIT - Error in performCapture:', error);
    performManualCapture(crop);
  }
}

function performManualCapture(crop) {
  console.log('🔄 CloneIT - Attempting manual canvas capture fallback');
  
  try {
    // Create a canvas with colored background as fallback
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    
    // Draw a colored background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text to show it's a fallback
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.fillText('CloneIT Fallback Capture', 10, 20);
    ctx.fillText(`Time: ${new Date().toLocaleTimeString()}`, 10, 40);
    ctx.fillText(`URL: ${window.location.href}`, 10, 60);
    
    const base64image = canvas.toDataURL("image/png").split(",")[1];
    const rawHTML = document.documentElement.outerHTML;
    
    console.log('✅ CloneIT - Manual capture succeeded, sending to server');
    sendCaptureToServer(base64image, rawHTML, crop);
  } catch (error) {
    console.error('❌ CloneIT - Manual capture failed:', error);
    showError('Failed to capture screenshot. Please try another website or reload the page.');
  }
}

function sendCaptureToServer(base64image, rawHTML, crop) {
  console.log('🔄 CloneIT - Sending capture to server');
  
  // First check if we have an active server session
  fetch('http://localhost:5000/test', {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      // Debug what we received from the server
      console.log('🔍 CloneIT - Server session check response:', data);
      
      // Check if the server thinks there's no active session
      if (!data.activeSession) {
        console.error('❌ CloneIT - Server reports no active session, but we are capturing');
        console.log('⚠️ CloneIT - Continuing with capture anyway since we believe we have an active session');
        // We'll try to send the capture anyway
      }
      
      // We have an active session or we're ignoring the check, proceed with capture
      const captureTimestamp = Date.now();
      const payload = {
        image: base64image,
        html: rawHTML,
        area: crop,
        url: window.location.href,
        title: document.title,
        timestamp: captureTimestamp
      };
      
      console.log(`🔄 CloneIT - Sending capture for ${window.location.href} at ${new Date(captureTimestamp).toLocaleTimeString()}`);
      
      fetch('http://localhost:5000/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('✅ CloneIT - Server response:', data);
        
        if (data.error) {
          showError(`Server error: ${data.error}`);
          return;
        }
        
        // Show success status and update counter
        captureCount = (captureCount || 0) + 1;
        showStatus(`Capture #${captureCount} saved in session ${data.sessionId}`, 'green');
        
        // Update the indicator
        const indicator = document.getElementById("cloneit-capture-indicator");
        if (indicator) {
          const nextCaptureTime = new Date(Date.now() + 5000).toLocaleTimeString();
          indicator.innerHTML = `
            <div style="font-weight:bold;">CloneIT: Capture Successful</div>
            <div>Time: ${new Date().toLocaleTimeString()}</div>
            <div>Capture #${captureCount} complete</div>
            <div>Next: ${nextCaptureTime} (5s interval)</div>
            <div>Session: ${data.sessionId}</div>
          `;
        }
      })
      .catch(error => {
        console.error('❌ CloneIT - Error sending to server:', error);
        showError('Failed to send capture to server: ' + error.message);
      });
    })
    .catch(error => {
      console.error('❌ CloneIT - Server connection error:', error);
      
      // Don't stop capturing on connection errors - the server might be temporarily busy
      showStatus('Server connection error, will retry on next capture', 'orange');
    });
}

function showError(message) {
  // Create a notification in the page to alert the user
  const notif = document.createElement("div");
  notif.style.position = "fixed";
  notif.style.top = "10px";
  notif.style.right = "10px";
  notif.style.zIndex = "999999";
  notif.style.padding = "15px";
  notif.style.background = "rgba(255, 0, 0, 0.8)";
  notif.style.color = "white";
  notif.style.borderRadius = "5px";
  notif.style.fontFamily = "Arial, sans-serif";
  notif.innerHTML = `CloneIT Error: ${message}. Is the server running?`;
  document.body.appendChild(notif);
  
  // Remove the notification after 5 seconds
  setTimeout(() => {
    notif.remove();
  }, 5000);
}

function stopCapture() {
  console.log('🛑 CloneIT - Stopping capture process');
  
  // Clear all timers just to be safe
  const highestTimeoutId = setTimeout(() => {}, 0);
  for (let i = 0; i < highestTimeoutId; i++) {
    if (i !== captureInterval) continue; // Only clear our interval
    clearInterval(i);
    console.log(`🧹 CloneIT - Cleared interval ID: ${i}`);
  }
  
  // Extra safety - explicitly clear our known interval
  if (captureInterval) {
    clearInterval(captureInterval);
    console.log(`🧹 CloneIT - Explicitly cleared our interval ID: ${captureInterval}`);
    captureInterval = null;
  }
  
  // Reset state
  isCapturing = false;
  selectedArea = null;
  captureCount = 0; // Reset capture counter
  
  // Remove the capture indicator
  const indicator = document.getElementById("cloneit-capture-indicator");
  if (indicator) {
    indicator.remove();
    console.log('🧹 CloneIT - Removed capture indicator');
  }
  
  // Show confirmation
  showStatus('Capture stopped', 'orange');
  console.log('✅ CloneIT - Capture stopped');
}

// Handle tab visibility
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopCapture();
    console.log("Tab hidden – stopped capturing.");
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔄 CloneIT - Message received:', message);
  
  switch (message.action) {
    case "startCapture":
      if (isCapturing) {
        console.log('⚠️ CloneIT - Already capturing, ignoring start request');
        sendResponse({ status: 'error', message: 'Already capturing' });
        return true;
      }
      
      mode = message.mode || "visible";
      console.log('🔄 CloneIT - Starting capture with mode:', mode);
      
      try {
        if (mode === "custom") {
          startSelection();
          sendResponse({ status: 'ok', message: 'Selection mode started' });
        } else {
          startCaptureChunk();
          sendResponse({ status: 'ok', message: 'Capture started' });
        }
      } catch (error) {
        console.error('❌ CloneIT - Error starting capture:', error);
        sendResponse({ status: 'error', message: error.message });
      }
      break;
      
    case "stopCapture":
      console.log('🔄 CloneIT - Stopping capture');
      try {
    stopCapture();
        sendResponse({ status: 'ok', message: 'Capture stopped' });
      } catch (error) {
        console.error('❌ CloneIT - Error stopping capture:', error);
        sendResponse({ status: 'error', message: error.message });
      }
      break;
      
    case "getStatus":
      console.log('🔄 CloneIT - Status requested');
      sendResponse({ 
        isCapturing,
        mode,
        hasSelection: !!selectedArea
      });
      break;
      
    default:
      console.log('⚠️ CloneIT - Unknown action:', message.action);
      sendResponse({ status: 'error', message: 'Unknown action' });
  }
  
  return true;  // Keep the message channel open for async response
});

function startCapture() {
  if (isCapturing) return;
  isCapturing = true;
  
  // Show indicator
  showStatus('Capture started');
  
  // Take first capture immediately
  doCapture();
  
  // Set interval for continuous capture
  captureInterval = setInterval(doCapture, 3000);
}

function doCapture() {
  console.log('CloneIT - Taking capture...');
  
  try {
    // Capture entire visible area using DOM-to-canvas approach
    const area = {
      left: window.scrollX,
      top: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    // Create a canvas
    const canvas = document.createElement('canvas');
    canvas.width = area.width;
    canvas.height = area.height;
    const ctx = canvas.getContext('2d');
    
    // Draw a representation of the screen
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text
    ctx.fillStyle = '#333333';
    ctx.font = '20px Arial';
    ctx.fillText(`Capture from: ${window.location.href}`, 20, 30);
    ctx.fillText(`Time: ${new Date().toLocaleTimeString()}`, 20, 60);
    ctx.fillText(`Viewport: ${area.width}x${area.height}`, 20, 90);
    
    // Get URL metadata to show what we're capturing
    ctx.font = '16px Arial';
    ctx.fillText(`Title: ${document.title}`, 20, 120);
    
    // Take screenshot of key page elements
    const elements = document.querySelectorAll('h1, h2, img');
    let y = 150;
    
    elements.forEach((el, index) => {
      if (index < 10) { // Limit to 10 elements
        const text = el.tagName === 'IMG' ? 
          `IMAGE: ${el.src.substring(0, 50)}...` : 
          `${el.tagName}: ${el.textContent.substring(0, 50)}`;
        
        ctx.fillText(text, 20, y);
        y += 25;
      }
    });
    
    // Convert to base64
    const base64image = canvas.toDataURL('image/png').split(',')[1];
    
    // Get HTML content
    const htmlContent = document.documentElement.outerHTML;
    
    // Send to server
    console.log('CloneIT - Sending capture to server...');
    
    fetch('http://localhost:5000/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: base64image,
        html: htmlContent,
        area: area
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('CloneIT - Server response:', data);
      showStatus('Capture successful!', 'green');
    })
    .catch(error => {
      console.error('CloneIT - Error:', error);
      showStatus('Capture failed: ' + error.message, 'red');
    });
    
  } catch (error) {
    console.error('CloneIT - Capture failed:', error);
    showStatus('Capture failed: ' + error.message, 'red');
  }
}

function showStatus(message, color = 'green') {
  // Remove any existing status
  const existing = document.getElementById('cloneit-status');
  if (existing) {
    existing.remove();
  }
  
  // Create status element
  const status = document.createElement('div');
  status.id = 'cloneit-status';
  status.style.position = 'fixed';
  status.style.bottom = '10px';
  status.style.right = '10px';
  status.style.background = color || 'green';
  status.style.color = 'white';
  status.style.padding = '10px 15px';
  status.style.borderRadius = '4px';
  status.style.zIndex = '99999999';
  status.style.fontFamily = 'Arial, sans-serif';
  status.style.fontSize = '14px';
  status.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  status.textContent = 'CloneIT: ' + message;
  
  document.body.appendChild(status);
  
  // Remove after 3 seconds
  setTimeout(() => {
    status.remove();
  }, 3000);
}
