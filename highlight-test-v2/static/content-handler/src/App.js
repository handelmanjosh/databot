import React, { useEffect, useState, useRef } from 'react';
import { invoke } from '@forge/bridge'; 

import "./styles.css"

function App() {
  const [aiText, setAiText] = useState("");
  const [pageData, setPageData] = useState("");
  const [highlightedText, setHighlightedText] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [instructions, setInstructions] = useState("")
  const [type, setType] = useState("");
  const [changed, setChanged] = useState(false); 
  const [searchRelevant, setSearchRelevant] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const showPopupRef = useRef(showPopup);
  useEffect(() => {
    invoke("getPageData").then((data) => {
      setPageData(data);
      setLoading(false);
    });
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [])
  useEffect(() => {
    showPopupRef.current = showPopup;
  }, [showPopup])
  function handleMouseUp() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && !showPopupRef.current) {
        // Get the selected range
        if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            const documentFragment = range.cloneContents();
            const div = document.createElement('div');
            div.appendChild(documentFragment);
            const selectedHtml = div.innerHTML;  // This will contain the HTML of the selected text
            
            console.log(selectedHtml);  // For testing purposes
            
            setHighlightedText(selectedText);
            setShowPopup(true);
        }
    }
}

  function handleClickOutside(event) {
    const rect = popupRef.current.getBoundingClientRect();
  
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      setShowPopup(false);
    }
  }
  async function handleExplain() {
    setSecondaryLoading(true);
    const response = await invoke("ai2", {
      text: `${instructions ? `Additional Instructions: ${instructions}` : ""} Explain the following context in detail. Do not provide anything other than the summary: `,
      selectedContext: `${highlightedText}`,
      embeddings: searchRelevant,
    });
    setSecondaryLoading(false);
    setType("explain")
    setAiText(response.trim())
  }
  async function handleExpand() {
    setSecondaryLoading(true);
    const response = await invoke("ai2", {
      text: `${instructions ? `Additional Instructions: ${instructions}` : ""} Expand upon the following context. Do not provide anything other than the expansion: `,
      selectedContext: `${highlightedText}`,
      embeddings: searchRelevant,
    });
    setSecondaryLoading(false);
    setType("add")
    setAiText(response.trim())
  }
  async function handleFix() {
    setSecondaryLoading(true);
    const response = await invoke("ai2", {
      text: `${instructions ? `Additional Instructions: ${instructions}` : ""} Fix the errors in the following context. Rewrite it, changing anything that is incorrect: `,
      selectedContext: `${highlightedText}`,
      embeddings: searchRelevant,
    });
    setSecondaryLoading(false);
    setType("replace")
    setAiText(response.trim())
  }
  async function handleRephrase() {
    setSecondaryLoading(true);    
    const response = await invoke("ai2", {
      text: `${instructions ? `Additional Instructions: ${instructions}` : ""} Rephrase the following context. Do not provide anything other than the rephrasing: `,
      selectedContext: `${highlightedText}`,
      embeddings: searchRelevant,
    });
    setSecondaryLoading(false);
    setType("replace");
    setAiText(response.trim())
  }
  async function chat() {
    setSecondaryLoading(true);
    const response = await invoke("ai", {
      text: `${instructions ? `Additional Instructions: ${instructions}` : ""} Chat about the following context. Do not provide anything other than the chat: `,
      selectedContext: `${highlightedText}`,
      embeddings: searchRelevant,
    });
    setSecondaryLoading(false);
    setType("chat")
    setAiText(response.trim())
  }
  async function save() {
    setSecondaryLoading(true);
    await invoke("addData", {
      key: (new Date()).toString(),
      data: `${highlightedText}`
    })
    setSecondaryLoading(false);
  }
  async function accept() {
    if (type == "add") {
      setChanged(true);
      const index = pageData.indexOf(highlightedText);
      if (index) {
        const end = index + highlightedText.length;
        const before = pageData.substring(0, index);
        const after = pageData.substring(end);
        const newData = `${before}${highlightedText} ${aiText}${after}`;
        setPageData(newData);
      }
    } else if (type == "replace") {
      setChanged(true);
      const data = pageData.replace(highlightedText, aiText);
      setPageData(data);
      console.log(data);
    }
    setAiText("");
    setShowPopup(false);
  }
  async function reject() {
    setAiText("");
    setType("");
    setShowPopup(false);
  }
  async function write() {
    setLoading(true);
    await invoke("write", {
      // testing, change later
      data: "eeeeee",
    }).then(() => {
      setLoading(false);
    })
    // await invoke("comment", {
    //   bodyData: "eeeeee",
    // })
    // await invoke("label", {
    //   bodyData: ["hello"]
    // })
  }
  if (loading) {
    return <div className="loader"></div>;  // Render loader when loading
  } else {
  return (
    <div style={{position: "relative", padding: "10px"}}>
    <div dangerouslySetInnerHTML={{ __html: pageData }}></div>
    {showPopup && (
      <div
        ref={popupRef}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1000,
          background: "white",
          border: "1px solid black",
          padding: "16px",
          borderRadius: "10px",
          flexDirection: "column",
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          width: "75%",
          minHeight: "20%",
          maxHeight: "80%",
        }}
      >
        {secondaryLoading ? 
            <div className="loader"></div>
          : aiText ? 
          <>
            <div style={{display: "flex", flexDirection: 'row', alignItems: "flex-start", overflow: "auto"}}>
              <p style={{flex: 1, color: "red", maxWidth: '50%', margin: 0, padding: 0, boxSizing: 'border-box', overflow: "auto"}}>
                {highlightedText}
              </p>
              <p style={{flex: 1, color: "green", maxWidth: '50%', margin: 0, padding: 0, boxSizing: 'border-box', overflow: "auto"}}>
                {aiText} 
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              {/* { type == "explain" ?  */}
                <button onClick={reject}>Close</button>
                {/* : */ }
              {/* //   <>
                   <button onClick={accept}>Accept</button>
                   <button onClick={reject}>Reject</button>
                 </>
              } */}
            </div>
          </>
          :
          <>
            <p>
              {highlightedText}
            </p>  
            <input
              type="text"
              placeholder="Optional instructions..."
              style={{marginTop: "10px", padding: "5px 10px", width: "50%", zIndex: 1000}}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={handleExplain}>Explain</button>
              <button onClick={handleFix}>Fix Errors</button>
              <button onClick={handleExpand}>Expand Upon</button>
              <button onClick={handleRephrase}>Rephrase Text</button>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <label>
                  Utilize Stored Data
                  <input 
                    value={searchRelevant}
                    type="checkbox"
                    onChange={(e) => setSearchRelevant(e.target.checked)}
                  />
                  </label>
                <button onClick={chat}>Chat</button>
                <button onClick={save}>Save Data</button>
            </div>
          </>
        }   
      </div>      
    )}
     {/* <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
      <button onClick={write}>Write changes</button>
    </div> */}
    <div className="" style={{display: "flex", width: "100%", alignItems: "center", justifyContent: "center", position: "absolute", bottom: 0, left: 0}}>
      <button onClick={() => setShowPopup(true)}>Click to chat without context. Otherwise highlight context</button>
    </div>
  </div>
  )
  }
}
export default App;
