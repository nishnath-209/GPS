import React, { useState, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import axios from "axios";
import "./dashboard.css"
// Register fcose layout
cytoscape.use(fcose);

const GraphQueryInterface = () => {
  const [graphData, setGraphData] = useState([]);
  
  const [inputValue, setInputValue] = useState("");
  const cyRef = useRef(null);
  const layoutRef = useRef(null);

  const fetchGraphData = () => {
    axios
      .get("http://127.0.0.1:8000/get_data")
      .then((response) => {
        console.log("Fetched graph data:", response.data);
        const data = response.data || { nodes: [], edges: [] };
        const formattedData = formatGraphData(data);
        setGraphData(formattedData);
        
        // Trigger layout after data is set
        setTimeout(() => {
          reloadLayout();
        }, 100);
      })
      .catch((error) => {
        console.error("Error fetching graph data:", error);
      });
  };

  const reloadLayout = () => {
    console.log("Reloading layout. Current graph data:", graphData);
    if (cyRef.current && graphData.length > 0) {
      // Stop previous layout if it exists
      if (layoutRef.current) {
        layoutRef.current.stop();
      }

      // Create and run new layout
      const newLayout = cyRef.current.layout({
        name: "fcose",
        nodeRepulsion: 45000,
        idealEdgeLength: 100,
        nodeSeparation: 200,
        gravity: 0.25,
        fit: true,
        animate: true,
        animationDuration: 500
      });

      newLayout.run();
      layoutRef.current = newLayout;
    }
  };

  const formatGraphData = (data) => {
    console.log("Formatting graph data:", data);
    let elements = [];

    // Ensure nodes and edges exist
    const nodes = data.nodes || [];
    const edges = data.edges || [];

    nodes.forEach((node) => {
      elements.push({ 
        data: { 
          id: node.id || `node-${Math.random()}`, 
          label: node.num || 'Unnamed Node'
        } 
      });
    });

    edges.forEach((edge) => {
      elements.push({
        data: { 
          id: edge.id || `edge-${Math.random()}`,
          source: edge.source, 
          target: edge.target, 
          label: edge.label || ''
        },
      });
    });

    console.log("Formatted elements:", elements);
    return elements;
  };

  return (
    <div className="graph-container">
     
      <div className="graph-controls">
        <button onClick={fetchGraphData} className="fetch-data-btn">
          Fetch Graph Data
        </button>
        <button 
          onClick={reloadLayout} 
          className="reload-layout-btn" 
          disabled={graphData.length === 0}
        >
          Reload Layout
        </button>
        
      </div>

      {graphData.length > 0 && (
        <CytoscapeComponent
          cy={(cy) => {
            console.log("Cytoscape instance created");
            cyRef.current = cy;
          }}
          elements={graphData}
          className="cy-container"
          layout={{
            name: "fcose",
            nodeRepulsion: 10000,
            idealEdgeLength: 220,
            nodeSeparation: 400,
            gravity: 0.1,
            fit: true,
            animate: true,
          }}
          stylesheet={[
            {
              selector: 'node',
              style: {
                'background-color': '#666',
                'label': 'data(label)',
                'color': '#fff',
                'text-valign': 'center',
                'text-halign': 'center',
                'width': 50,
                'height': 50
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 3,
                'line-color': '#ccc',
                'target-arrow-color': '#ccc',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier'
                // 'label': 'data(label)'
              }
            }
          ]}
        />
      )}
    </div>
  );
};

export default GraphQueryInterface;