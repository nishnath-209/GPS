import React, { useState } from "react";
import axios from "axios";
import "./App.css";
import GraphQueryInterface from "./components/dashboard";
import MovieDashboard from "./components/movie_dashboard";

function App() {
  const [selectedPage, setSelectedPage] = useState("General");
  const [selectedOption, setSelectedOption] = useState(null);
  const [startNode, setStartNode] = useState("");
  const [endNode, setEndNode] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [kLength, setKLength] = useState(2);
  const [output, setOutput] = useState("");
  const [graphResponse, setGraphResponse] = useState(null);
  const [profileOutput, setProfileOutput] = useState("");

  const handleSubmit = () => {
    let params = { type: selectedOption };
    
    // Set parameters based on selected option
    if (selectedOption === "Find Shortest Distance" || 
        selectedOption === "Common Neighbors" || 
        selectedOption === "All Shortest Paths" ||
        selectedOption === "K-length Paths" ||
        selectedOption === "Triangles Containing Node" ||
        selectedOption === "Clustering Coefficient") {
      if (startNode) params.startNode = startNode;
      if (endNode) params.endNode = endNode;
    }
    
    if (selectedOption === "Find Nodes connected from a node" || 
        selectedOption === "Find Nodes connected to a node" ||
        selectedOption === "Triangles Containing Node" ||
        selectedOption === "Clustering Coefficient") {
      params.inputValue = inputValue;
    }
    
    if (selectedOption === "K-length Paths") {
      params.k = kLength;
    }

    axios
      .get("http://127.0.0.1:8000/process_input", { params })
      .then((response) => {
        console.log("Response from backend:", response.data);
        let message = response.data.message || "";

        // Handle different response formats
        if (response.data.data) {
          if (selectedOption === "Find Shortest Distance") {
            message += `\nDistance is ${response.data.data.distance}`;
            const pathNodes = response.data.data.nodes.map((node) => node.num).join(" -> ");
            message += `\nPath Nodes: ${pathNodes}`;
          } 
          else if (selectedOption === "K-length Paths") {
            message += `\nFound ${response.data.data.length} paths`;
            response.data.data.forEach((path, index) => {
              const pathNodes = path.nodes.map((node) => node.num).join(" -> ");
              message += `\nPath ${index + 1}: ${pathNodes}`;
            });
          }
          else if (selectedOption === "Find Nodes connected to a node" || 
                  selectedOption === "Find Nodes connected from a node" || 
                  selectedOption === "Common Neighbors" ||
                  selectedOption === "Triangles Containing Node") {
            const nums = response.data.data.nodes?.map((node) => node.num).join(", ") || "";
            message += `\nNodes: ${nums}`;
          } 
          else if (selectedOption === "All Shortest Paths") {
            message += `\nDistance: ${response.data.data.paths[0].distance}`;
            response.data.data.paths.forEach((path, index) => {
              const pathNodes = path.nodes.map((node) => node.num).join(" -> ");
              message += `\nPath ${index + 1}: ${pathNodes}`;
            });
          }
          else if (selectedOption === "Triangle Count") {
            message += `\nCount: ${response.data.data.count}`;
          }
          else if (selectedOption === "Clustering Coefficient") {
            message += `\nCoefficient: ${response.data.data.coefficient.toFixed(4)}`;
            message += `\nTriangles: ${response.data.data.triangles}`;
            message += `\nDegree: ${response.data.data.degree}`;
          }
          else if (selectedOption === "Community Detection") {
            message += `\nFound ${response.data.data.top_communities.length} communities`;
            response.data.data.top_communities.forEach((comm, index) => {
              message += `\nCommunity ${index + 1}: ${comm[1].length} nodes`;
            });
          }
          else if (selectedOption === "Page Rank" || selectedOption === "Centrality") {
            response.data.data.forEach((item, index) => {
              message += `\n${index + 1}. Node ${item.node}: ${item.score ? item.score.toFixed(4) : item.centrality.toFixed(4)}`;
            });
          }
        }

        setOutput(message);
        setProfileOutput(JSON.stringify(response.data.profile, null, 2));

        // Set graph response for visualization
        if (response.data.data) {
          if (selectedOption === "Find Shortest Distance") {
            setGraphResponse(response.data.data);
          } 
          else if (selectedOption === "All Shortest Paths") {
            setGraphResponse(response.data.data.combined);
          }
          else if (["Find Nodes connected to a node", 
                   "Find no of Nodes", 
                   "Find Nodes connected from a node", 
                   "Common Neighbors",
                   "K-length Paths",
                   "Triangles Containing Node"].includes(selectedOption)) {
            setGraphResponse(response.data.data);
          }
        }
      })
      .catch((error) => {
        console.error("Error submitting data:", error);
        setOutput("Failed to process the request: " + error.message);
      });
  };

  const renderInputFields = () => {
    switch (selectedOption) {
      case "Find Shortest Distance":
      case "All Shortest Paths":
      case "Common Neighbors":
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
      case "K-length Paths":
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
            <label>
              Path Length (k):
              <input
                type="number"
                min="1"
                value={kLength}
                onChange={(e) => setKLength(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Submit</button>
          </div>
        );
      case "Find no of Nodes":
      case "Triangle Count":
      case "Community Detection":
      case "Page Rank":
      case "Centrality":
        return (
          <div className="input-fields">
            <button onClick={handleSubmit}>Execute</button>
          </div>
        );
      case "Find Nodes connected from a node":
      case "Find Nodes connected to a node":
      case "Triangles Containing Node":
      case "Clustering Coefficient":
        return (
          <div className="input-fields">
            <label>
              Node:
              <input
                type="text"
                placeholder="Enter node number"
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

  const renderGeneralOptions = () => {
    return (
      <div className="options-list">
        <h2>General Options</h2>
        <ul>
          <li onClick={() => { setSelectedOption("Find Shortest Distance"); setOutput(""); setProfileOutput(""); }}>
            Find Shortest Distance
          </li>
          <li onClick={() => { setSelectedOption("Find no of Nodes"); setOutput(""); setProfileOutput(""); }}>
            Find no of Nodes
          </li>
          <li onClick={() => { setSelectedOption("Find Nodes connected from a node"); setOutput(""); setProfileOutput(""); }}>
            Find Nodes connected from a node
          </li>
          <li onClick={() => { setSelectedOption("Find Nodes connected to a node"); setOutput(""); setProfileOutput(""); }}>
            Find Nodes connected to a node
          </li>
          <li onClick={() => { setSelectedOption("Common Neighbors"); setOutput(""); setProfileOutput(""); }}>
            Common Neighbors
          </li>
          <li onClick={() => { setSelectedOption("All Shortest Paths"); setOutput(""); setProfileOutput(""); }}>
            All Shortest Paths
          </li>
          <li onClick={() => { setSelectedOption("K-length Paths"); setOutput(""); setProfileOutput(""); }}>
            K-length Paths
          </li>
          <li onClick={() => { setSelectedOption("Triangle Count"); setOutput(""); setProfileOutput(""); }}>
            Triangle Count
          </li>
          <li onClick={() => { setSelectedOption("Triangles Containing Node"); setOutput(""); setProfileOutput(""); }}>
            Triangles Containing Node
          </li>
          <li onClick={() => { setSelectedOption("Clustering Coefficient"); setOutput(""); setProfileOutput(""); }}>
            Clustering Coefficient
          </li>
          <li onClick={() => { setSelectedOption("Community Detection"); setOutput(""); setProfileOutput(""); }}>
            Community Detection
          </li>
          <li onClick={() => { setSelectedOption("Page Rank"); setOutput(""); setProfileOutput(""); }}>
            Page Rank
          </li>
          <li onClick={() => { setSelectedOption("Centrality"); setOutput(""); setProfileOutput(""); }}>
            Centrality
          </li>
        </ul>
      </div>
    );
  };

  const renderMovieDatabaseOptions = () => {
    return (
      <div className="options-list">
        <h2>Movie Database Options</h2>
        <ul>
          <li onClick={() => { setSelectedOption("Fetch All Movies"); setOutput(""); setProfileOutput(""); }}>
            Fetch All Movies
          </li>
          <li onClick={() => { setSelectedOption("Fetch Movie Details"); setOutput(""); setProfileOutput(""); }}>
            Fetch Movie Details
          </li>
          <li onClick={() => { setSelectedOption("Fetch People in Movies"); setOutput(""); setProfileOutput(""); }}>
            Fetch People in Movies
          </li>
        </ul>
      </div>
    );
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
        {selectedPage === "Movie database" ? (
          <div className="left-panel">
            {renderMovieDatabaseOptions()}
            <div className="input-container">
              {renderInputFields()}
              {output && (
                <div className="output-container">
                  <strong>Output:</strong>
                  <pre>{output}</pre>
                </div>
              )}
              {profileOutput && (
                <div className="profile-container">
                  <strong>Query Profile:</strong>
                  <pre>{profileOutput}</pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="left-panel">
            {renderGeneralOptions()}
            <div className="input-container">
              {renderInputFields()}
              {output && (
                <div className="output-container">
                  <strong>Output:</strong>
                  <pre>{output}</pre>
                </div>
              )}
              {profileOutput && (
                <div className="profile-container">
                  <strong>Query Profile:</strong>
                  <pre>{profileOutput}</pre>
                </div>
              )}
            </div>
          </div>
        )}
        {selectedPage === "General" ? (
          <div className="right-panel">
            <GraphQueryInterface
              graphResponse={graphResponse}
              dataType="General"
            />
          </div>
        ) : (
          <div className="right-panel">
            <MovieDashboard />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;