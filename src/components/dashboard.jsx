import React, { useState,useEffect } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import axios from "axios";

const GraphQueryInterface = () => {
  const [query, setQuery] = useState("MATCH (n)-[r]->(m) RETURN n, r, m");
  const [graphData, setGraphData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [val,setVal] = useState(null);
  const fetchGraphData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("http://localhost:8000/query", { cypher: query });
      const formattedData = formatGraphData(response.data);
      setGraphData(formattedData);
    } catch (err) {
      setError("Failed to fetch graph data");
    }
    setLoading(false);
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
  
  const testGraphData = [
    { data: { id: "A", label: "Node A" } },
    { data: { id: "B", label: "Node B" } },
    { data: { id: "AB", source: "A", target: "B", label: "Edge AB" } }
  ];

  return (
    <div>
      <h2>Graph Query Processor</h2>
      <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows="4" />
      <button onClick={fetchGraphData} disabled={loading}>
        {loading ? "Loading..." : "Run Query"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <CytoscapeComponent elements={testGraphData} style={{ width: "800px", height: "500px" }} layout={{ name: "cose" }} />
    </div>
  );
};

export default GraphQueryInterface;
