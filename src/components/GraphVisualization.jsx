import React from "react";
import CytoscapeComponent from "react-cytoscapejs";

const GraphVisualization = ({ graphData }) => {
  return (
    <CytoscapeComponent
      elements={graphData}
      style={{ width: "800px", height: "500px", border: "1px solid black" }}
      layout={{ name: "cose" }}
    />
  );
};

export default GraphVisualization;
