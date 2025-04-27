chrome.runtime.onInstalled.addListener(()=>{
    console.log("CloneIt Extention Installed ")
})

chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if(message.action == "log"){
        console.log("Message received in background script",message.data);        
    }
      // Example: You can add more message handlers here later
  // For scroll capturing, backend calling, etc.
  // Example:
  // if (message.action === "send-to-backend") {
  //   fetch("http://localhost:8000/process", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ data: message.payload })
  //   }).then(response => response.json())
  //     .then(data => {
  //       sendResponse({ result: data });
  //     });
  //  return true; // Keeps sendResponse valid after async call
  // }
})