import React, { useState } from "react";
import "./App.css";
import GraphQueryInterface from "./components/dashboard";

function App() {
  const [selectedPage, setSelectedPage] = useState("General");
  const [selectedOption, setSelectedOption] = useState(null);

  const renderInputFields = () => {
    switch (selectedOption) {
      case "Find Shortest Distance":
        return (
          <div className="input-fields">
            <label>
              Start Node:
              <input type="text" placeholder="Enter start node" />
            </label>
            <label>
              End Node:
              <input type="text" placeholder="Enter end node" />
            </label>
            <button onClick={() => alert("Finding shortest distance...")}>
              Submit
            </button>
          </div>
        );
      case "Another Option":
        return (
          <div className="input-fields">
            <label>
              Input:
              <input type="text" placeholder="Enter input for another option" />
            </label>
            <button onClick={() => alert("Processing another option...")}>
              Submit
            </button>
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
        <button onClick={() => setSelectedPage("Movie database")}>Movie database</button>
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
          <div className="input-container">{renderInputFields()}</div>
        </div>
        <div className="right-panel">
          <GraphQueryInterface />
        </div>
      </div>
    </div>
  );
}

export default App;
