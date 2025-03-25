import React, { useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import axios from "axios";
import './dashboard.css';

// Register fcose layout
cytoscape.use(fcose);

const GraphQueryInterface = () => {
  const [graphData, setGraphData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(false); 

  const fetchGraphData = () => {
    setLoading(true);
    axios.get("http://127.0.0.1:8000/get_data")
      .then(response => {
        const data = response.data || { nodes: [], edges: [] };
        const formattedData = formatGraphData(data);
        setGraphData(formattedData);
        setShowGraph(true);
      })
      .catch(error => {
        console.error("Error fetching graph data:", error);
      })
      .finally(() => setLoading(false));
  };

  const formatGraphData = (data) => {
    let elements = [];
    
    data.nodes.forEach((node) => {
      elements.push({ data: { id: node.id, label: node.label } });
    });
    
    data.edges.forEach((edge) => {
      elements.push({ data: { id: edge.id, source: edge.source, target: edge.target, label: edge.label } });
    });

    return elements;
  };

  return (
    <div className="graph-wrapper">
      <h2>Graph Query Processor</h2>
      
      <button onClick={fetchGraphData} disabled={loading || showGraph}>
        {loading ? "Loading..." : showGraph ? "Graph Loaded" : "Show Graph"}
      </button>

      {showGraph && (
        <CytoscapeComponent
          elements={graphData}
          style={{ width: "800px", height: "500px", border: "1px solid black" }}
          layout={{
            name: "fcose",
            nodeRepulsion: 10000,
            idealEdgeLength: 120,
            gravity: 0.05,
            animate: true
          }}
          className="cy-container"
        />
      )}
    </div>
  );
};

export default GraphQueryInterface;
