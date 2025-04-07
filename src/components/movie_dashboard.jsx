import React, { useState, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import axios from "axios";
import "./movie_dashboard.css";

// Register fcose layout
cytoscape.use(fcose);

const MovieDashboard = () => {
  const [graphData, setGraphData] = useState([]); // State for Cytoscape graph data
  const cyRef = useRef(null);
  const layoutRef = useRef(null);

  const fetchMovieData = () => {
    axios
      .get("http://127.0.0.1:8000/get_data", { params: { dataType: "Movie database" } })
      .then((response) => {
        console.log("Fetched movie data:", response.data);
        const movies = response.data.movies || [];
        const formattedData = formatGraphData(movies);
        setGraphData(formattedData);

        // Trigger layout after data is set
        setTimeout(() => {
          reloadLayout();
        }, 100);
      })
      .catch((error) => {
        console.error("Error fetching movie data:", error);
      });
  };

  const formatGraphData = (movies) => {
    console.log("Formatting movie data for Cytoscape:", movies);
    let elements = [];

    movies.forEach((movie) => {
      // Add movie node
      elements.push({
        data: {
          id: movie.title,
          label: `${movie.title} (${movie.released})`,
          type: "movie",
        },
      });

      // Add people nodes and relationships
      movie.people.forEach((person) => {
        elements.push({
          data: {
            id: person.name,
            label: person.name,
            type: "person",
          },
        });

        elements.push({
          data: {
            id: `${person.name}-${movie.title}`,
            source: person.name,
            target: movie.title,
            label: person.relationship,
          },
        });
      });
    });

    console.log("Formatted elements:", elements);
    return elements;
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
        animationDuration: 500,
      });

      newLayout.run();
      layoutRef.current = newLayout;
    }
  };

  return (
    <div className="movie-dashboard-container">
      <div className="movie-controls">
        <button onClick={fetchMovieData} className="fetch-movie-data-btn">
          Fetch Movie Data
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
              selector: "node",
              style: {
                "background-color": (ele) =>
                  ele.data("type") === "movie" ? "#007bff" : "#888",
                label: "data(label)",
                "text-valign": "center",
                "text-halign": "center",
                color: "black",
                "font-size": "12px",
              },
            },
            {
              selector: "edge",
              style: {
                "line-color": "#ccc",
                "target-arrow-color": "#ccc",
                "target-arrow-shape": "triangle",
                label: "data(label)",
                "font-size": "10px",
                "text-background-color": "#fff",
                "text-background-opacity": 1,
                "text-background-padding": "2px",
              },
            },
          ]}
        />
      )}
    </div>
  );
};

export default MovieDashboard;
