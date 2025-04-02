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
  const [graphResponse, setGraphResponse] = useState(null);
  const [profileOutput, setProfileOutput] = useState(""); // State to store query profile

  const handleSubmit = () => {
    let params = { type: selectedOption };
    if (
      selectedOption === "Find Shortest Distance" ||
      selectedOption === "Common Neighbors" ||
      selectedOption === "All Shortest Paths"
    ) {
      params.startNode = startNode;
      params.endNode = endNode;
    } else if (
      selectedOption === "Find Nodes connected from a node" ||
      selectedOption === "Find Nodes connected to a node"
    ) {
      params.inputValue = inputValue;
    }

    axios
      .get("http://127.0.0.1:8000/process_input", { params })
      .then((response) => {
        console.log("Response from backend:", response.data);
        let message = response.data.message;

        if (selectedOption === "Find Shortest Distance" && response.data.data) {
          message += `\nDistance is ${response.data.data.distance}`;
          const pathNodes = response.data.data.nodes.map((node) => node.num).join(" -> ");
          message += `\nPath Nodes: ${pathNodes}`;
        } else if (
          selectedOption === "Find Nodes connected to a node" ||
          selectedOption === "Find Nodes connected from a node" ||
          selectedOption === "Common Neighbors"
        ) {
          if (response.data.data) {
            const nums = response.data.data.nodes.map((node) => node.num).join(", ");
            message += `\nNodes: ${nums}`;
          }
        } else if (selectedOption === "All Shortest Paths" && response.data.data) {
          message += `\nDistance : ${response.data.data.paths[0].distance}`;
          response.data.data.paths.forEach((path, index) => {
            const pathNodes = path.nodes.map((node) => node.num).join(" -> ");
            message += `\nPath ${index + 1}: ${pathNodes}`;
          });
        }

        setOutput(message); // Set the response message
        setProfileOutput(JSON.stringify(response.data.profile, null, 2)); // Set the query profile

        if (
          selectedOption === "Find Shortest Distance"
        ) {
          setGraphResponse(response.data.data); // Pass path data to GraphQueryInterface
        } else if (
          selectedOption === "Find Nodes connected to a node" ||
          selectedOption === "Find no of Nodes" ||
          selectedOption === "Find Nodes connected from a node" ||
          selectedOption === "Common Neighbors"
        ) {
          setGraphResponse(response.data.data);
        } else if(selectedOption === "All Shortest Paths" && response.data.data) {
          setGraphResponse(response.data.data.combined);
        }
      })
      .catch((error) => {
        console.error("Error submitting data:", error);
        setOutput("Failed to process the request.");
      });
  };

  const renderInputFields = () => {
    switch (selectedOption) {
      case "Find Shortest Distance":
      case "All Shortest Paths":
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
            <button onClick={handleSubmit}>Get no of nodes</button>
          </div>
        );
      case "Find Nodes connected from a node":
      case "Find Nodes connected to a node":
        return (
          <div className="input-fields">
            <label>
              Input:
              <input
                type="text"
                placeholder="Enter the node"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Submit</button>
          </div>
        );
      case "Common Neighbors":
        return (
          <div className="input-fields">
            <label>
              Node 1:
              <input
                type="text"
                placeholder="Enter Node 1"
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
              />
            </label>
            <label>
              Node 2:
              <input
                type="text"
                placeholder="Enter Node 2"
                value={endNode}
                onChange={(e) => setEndNode(e.target.value)}
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
              <li onClick={() => { setSelectedOption("Find Shortest Distance"); setOutput(""); setProfileOutput(""); }}>
                Find Shortest Distance
              </li>
              <li onClick={() => { setSelectedOption("Find no of Nodes"); setOutput("");setProfileOutput(""); }}>
                Find no of Nodes
              </li>
              <li onClick={() => { setSelectedOption("Find Nodes connected from a node"); setOutput(""); setProfileOutput(""); }}>
                Find Nodes connected from a node
              </li>
              <li onClick={() => { setSelectedOption("Find Nodes connected to a node"); setOutput(""); setProfileOutput("");}}>
                Find Nodes connected to a node
              </li>
              <li onClick={() => { setSelectedOption("Common Neighbors"); setOutput("");setProfileOutput(""); }}>
                Common Neighbors
              </li>
              <li onClick={() => { setSelectedOption("All Shortest Paths"); setOutput(""); setProfileOutput("");}}>
                All Shortest Paths
              </li>
            </ul>
          </div>
          <div className="input-container">
            {renderInputFields()}
            {output && (
              <div className="output-container">
                <strong>Output:</strong>
                <pre>{output}</pre> {/* Use <pre> to preserve newlines */}
              </div>
            )}
            {profileOutput && (
              <div className="profile-container">
                <strong>Query Profile:</strong>
                <pre>{profileOutput}</pre> {/* Display query profile */}
              </div>
            )}
          </div>
        </div>
        <div className="right-panel">
          <GraphQueryInterface
            graphResponse={graphResponse} // Pass the shortest path data
          />
        </div>
      </div>
    </div>
  );
}

export default App;
