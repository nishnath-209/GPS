import React, { useState } from "react";
import axios from "axios";
import "./App.css";
import GraphQueryInterface from "./components/dashboard";

function App() {
  const [selectedPage, setSelectedPage] = useState("General");
  const [selectedOption, setSelectedOption] = useState(null);
  const [startNode, setStartNode] = useState("");
  const [endNode, setEndNode] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [output, setOutput] = useState(""); // State to store backend response

  const handleSubmit = () => {
    let params = { type: selectedOption };
    if (selectedOption === "Find Shortest Distance") {
      params.startNode = startNode;
      params.endNode = endNode;
    } else if (selectedOption === "Find no of Nodes") {
      params.inputValue = inputValue;
    }

    axios
      .get("http://127.0.0.1:8000/process_input", { params })
      .then((response) => {
        console.log("Response from backend:", response.data);
        setOutput(response.data.message); // Set the response message
      })
      .catch((error) => {
        console.error("Error submitting data:", error);
        setOutput("Failed to process the request.");
      });
  };

  const renderInputFields = () => {
    switch (selectedOption) {
      case "Find Shortest Distance":
        return (
          <div className="input-fields">
            <label>
              Start Node:
              <input
                type="text"
                placeholder="Enter start node"
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
              />
            </label>
            <label>
              End Node:
              <input
                type="text"
                placeholder="Enter end node"
                value={endNode}
                onChange={(e) => setEndNode(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Submit</button>
          </div>
        );
      case "Find no of Nodes":
        return (
          <div className="input-fields">
            <label>
              Input:
              <input
                type="text"
                placeholder="Enter input for another option"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Submit</button>
          </div>
        );
      default:
        return <p>Select an option to see input fields.</p>;
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <button onClick={() => setSelectedPage("General")}>General</button>
        <button onClick={() => setSelectedPage("Movie database")}>
          Movie database
        </button>
        <button onClick={() => setSelectedPage("Social Network")}>
          Social Network
        </button>
      </header>
      <div className="app-content">
        <div className="left-panel">
          <div className="options-list">
            <h2>{selectedPage} Options</h2>
            <ul>
              <li onClick={() => setSelectedOption("Find Shortest Distance")}>
                Find Shortest Distance
              </li>
              <li onClick={() => setSelectedOption("Find no of Nodes")}>
              Find no of Nodes
              </li>
              {/* Add more options as needed */}
            </ul>
          </div>
          <div className="input-container">{renderInputFields()}
            {output && <div className="output-container"><strong>Output:</strong> {output}</div>}
          </div>
        </div>
        <div className="right-panel">
          <GraphQueryInterface />
        </div>
      </div>
    </div>
  );
}

export default App;
