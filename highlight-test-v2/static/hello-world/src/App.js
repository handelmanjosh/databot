import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge'; 

import "./styles.css"
function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [isDataLayout, setIsDataLayout] = useState(false);
  const [userKey, setUserKey] = useState("");
  const [viewMyData, setViewMyData] = useState(false);
  const [userData, setUserData] = useState([]);
  const [addedData, setAddedData] = useState(false);
  const [searchRelevant, setSearchRelevant] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    invoke('getText', { text: 'Hello world!' }).then((response) => {
      setSelectedText(response.context.extension.selectedText);
    });
  }, []);
  const handleSend = async () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, sender: "user" }]);
      await callAI(input)
      setInput("");
    }
  };
  const callAI = async (query) => {
    setMessages([...messages,{ text: query, sender: "user" }, { text: "Loading...", sender: "ai" }]);
    const response = await invoke('ai', { text: query, embeddings: searchRelevant })
    setMessages([...messages,{ text: query, sender: "user" }, { text: response, sender: "ai" }]);
  }
  const predefinedAction = (action) => {
    switch (action) {
      case 'summarize':
        // Simulated AI response for summarize
        callAI("Explain the given text");
        break;
      case 'explain':
        // Simulated AI response for explain
        callAI("Fix errors in the given text")
        break;
      case 'expand':
        // Simulated AI response for expand
        callAI("Expand on the given text")
        break;
      case 'rephrase':
        // Simulated AI response for rephrase
        callAI("Rephrase the given text")
        break;
      default:
        break;
    }
    setInput("");
  };
  const handleAddData = async (key) => {
    console.log(key, selectedText);
    const response = await invoke("addData", { key, data: selectedText })
    console.log(response);
    setAddedData(true)
  }
  const viewData = async () => {
    const response = await invoke("retrieveData");
    return response;
  }
  useEffect(() => {
    viewData().then((data) => {
      setUserData(data);
    })
  }, [viewMyData])
  const deleteAll = () => {
    invoke("deleteAllData");
  }
  return (
    <div className="app-container">
    {isDataLayout ? (
        <div className="data-entry-layout">
          {viewMyData ? 
          <>
            {userData && userData.map(({key, data}) => (
              <div className="data-entry">
                <p>{key}</p>
                <p>{data}</p>
              </div>
            ))}
          </>
          :
          <>
            <input 
              value={userKey} 
              onChange={(e) => setUserKey(e.target.value)}
              placeholder="Enter your key..."
            />
            <strong>{`Data to be added: ${selectedText}`}</strong>
          </>
          }
          <div className="flex-row">
            {!viewMyData && <button onClick={() => handleAddData(userKey)} disabled={addedData}>Add Data</button> }
            <button onClick={() => setViewMyData(!viewMyData)}>{viewMyData ? "Hide" : "View"} My Data</button>
          </div>
        </div>  
    ) : (
    <div className="chat-container">
      {isLoading ? 
        <div className="loader"></div>
        :
      messages &&
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            {message.text}
          </div>
        ))}
      </div>
    }
      <div className="chat-input">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
      <div className="chat-actions">
        <button onClick={() => predefinedAction('summarize')}>Explain</button>
        <button onClick={() => predefinedAction('explain')}>Fix Errors</button>
        <button onClick={() => predefinedAction('expand')}>Expand Upon</button>
        <button onClick={() => predefinedAction("rephrase")}>Rephrase</button>
      </div>
      <label style={{marginLeft: "10px"}}>
        Utilize stored data
        <input 
          value={searchRelevant}
          type="checkbox"
          onChange={(e) => setSearchRelevant(e.target.checked)}
        />
      </label>
      <button className="button" style={{marginLeft: "5px"}} onClick={() => handleAddData((new Date()).toString())}>{"Add data"}</button>
      {/* <button className="button" style={{marginLeft: "5px"}} onClick={() => setIsDataLayout(!isDataLayout)}>{"Add / View data"}</button>
      <button className="button" style={{marginLeft: "5px"}} onClick={deleteAll}>{"Delete All data"}</button> */}
    </div> 
    )}
    </div>
  );
}
export default App;
