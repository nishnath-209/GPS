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
    if (
      selectedOption === "Find Shortest Distance" ||
      selectedOption === "Common Neighbors" ||
      selectedOption === "All Shortest Paths" ||
      selectedOption === "Find Movies with Actor + Director Combo" ||
      selectedOption === "Find Shortest Path Between Two Actors" ||
      selectedOption === "K-length Paths" ||
    ) {
      params.startNode = startNode;
      params.endNode = endNode;
    } else if (
      selectedOption === "Find Nodes connected from a node" ||
      selectedOption === "Find Nodes connected to a node" ||
      selectedOption === "Fetch Movie Details" ||
      selectedOption === "Fetch People in Movies" ||
      selectedOption === "Find Co-actors" ||
      selectedOption === "Find Sequels/Prequels of a Movie" ||
      selectedOption === "Find Actors Who Debuted in a Specific Year" ||
      selectedOption === "Find Directors Who Worked with a Specific Actor" ||
      selectedOption === "Find All Movies Directed by a Person" ||
      selectedOption === "Triangles Containing Node"
    ) {
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
        } else if (selectedOption === "All Shortest Paths" && response.data.data) {
          message += `\nDistance : ${response.data.data.paths[0].distance}`;
          response.data.data.paths.forEach((path, index) => {
            const pathNodes = path.nodes.map((node) => node.num).join(" -> ");
            message += `\nPath ${index + 1}: ${pathNodes}`;
          });
        } else if (selectedOption === "Fetch All Movies" && response.data.data) {
          message += `\nMovies:\n`;
          response.data.data.forEach((movie) => {
            message += `- ${movie.title} (Released: ${movie.released}, Tagline: ${movie.tagline})\n`;
          });
        } else if (selectedOption === "Fetch Movie Details" && response.data.data) {
          const movie = response.data.data;
          message += `\nMovie Details:\nTitle: ${movie.title}\nReleased: ${movie.released}\nTagline: ${movie.tagline}\nPeople:\n`;
          movie.people.forEach((person) => {
            message += `- ${person.name} (${person.born}) - ${person.relationship}`;
            if (person.roles && person.roles.length > 0) {
              message += ` [Roles: ${person.roles.join(", ")}]`;
            }
            message += "\n";
          });
        } else if (selectedOption === "Fetch People in Movies" && response.data.data) {
          const person = response.data.data;
          message += `\nPerson Details:\nName: ${person.name}\nBorn: ${person.born}\nMovies:\n`;
          person.movies.forEach((movie) => {
            message += `- ${movie.title} (Released: ${movie.released}, Relationship: ${movie.relationship}`;
            if (movie.roles && movie.roles.length > 0) {
              message += `, Roles: ${movie.roles.join(", ")}`;
            }
            message += ")\n";
          });
        } else if (selectedOption === "Find Co-actors" && response.data.data) {
          message += `\nCo-actors:\n`;
          response.data.data.forEach((coActor) => {
            message += `- ${coActor.coActor} (Movies: ${coActor.movies.join(", ")})\n`;
          });

        } else if (selectedOption === "Find Frequent Collaborators" && response.data.data) {
          message += `\nFrequent Collaborators:\n`;
          response.data.data.forEach((collab) => {
            message += `- Actor: ${collab.actor}, Director: ${collab.director}, Collaborations: ${collab.collaborations}\n`;
          });

        } else if (selectedOption === "Find Actors Who Haven’t Worked Together" && response.data.data) {
          message += `\nActors Who Haven’t Worked Together:\n`;
          response.data.data.forEach((pair) => {
            message += `- ${pair.actor1} and ${pair.actor2}\n`;
          });

        } else if (selectedOption === "Find Actors Who Debuted in a Specific Year" && response.data.data) {
          message += `\nActors Who Debuted in ${inputValue}:\n`;
          response.data.data.forEach((actor) => {
            message += `- ${actor.actor} (Movies: ${actor.movies.join(", ")})\n`;
          });

        } else if (selectedOption === "Find Most Connected Movie" && response.data.data) {
          message += `\nMost Connected Movie:\n${response.data.data.movie} with ${response.data.data.connections} connections.`;

        } else if (selectedOption === "Find Sequels/Prequels of a Movie" && response.data.data) {
          message += `\nSequels/Prequels:\n`;
          response.data.data.forEach((related) => {
            message += `- ${related.relatedMovie} (${related.relationship})\n`;
          });
        } else if (selectedOption === "Find Movies with Actor + Director Combo" && response.data.data) {
          message += `\nMovies with Actor '${startNode}' and Director '${endNode}':\n${response.data.data.join(", ")}`;
        } else if (selectedOption === "Find Shortest Path Between Two Actors" && response.data.data) {
          message += `\nShortest Path:\nDistance: ${response.data.data.distance}`;
        
          // Check if path and nodes exist
          if (response.data.data.path && response.data.data.path.nodes) {
            const pathNodes = response.data.data.path.nodes.map((node) => node.name || node.title || "unknown").join(" -> ");
            message += `\nPath Nodes: ${pathNodes}`;
          } else {
            message += `\nPath Nodes: Path data is unavailable or in an unexpected format.`;
          }
        
          // Check if edges exist
          if (response.data.data.path && response.data.data.path.edges) {
            const pathEdges = response.data.data.path.edges.map((edge) => `${edge.source} -> ${edge.target} (${edge.type})`).join("\n");
            message += `\nPath Edges:\n${pathEdges}`;
          } else {
            message += `\nPath Edges: Edge data is unavailable or in an unexpected format.`;
          }
        } else if (selectedOption === "Find Directors Who Worked with a Specific Actor" && response.data.data) {
          message += `\nDirectors Who Worked with '${inputValue}':\n`;
          response.data.data.forEach((director) => {
            message += `- ${director.director} (Movies: ${director.movies.join(", ")})\n`;
          });
        } else if (selectedOption === "Find Producers with Most Movies Produced" && response.data.data) {
          message += `\nTop Producers:\n`;
          response.data.data.forEach((producer) => {
            message += `- ${producer.producer} (Movies Produced: ${producer.movieCount})\n`;
          });
        } else if (selectedOption === "Find Most Central Actor" && response.data.data) {
          message += `\nMost Central Actor:\n${response.data.data.actor} with a centrality score of ${response.data.data.score}.`;
        } else if (selectedOption === "Find Clusters or Communities of Actors" && response.data.data) {
          message += `\nClusters of Actors:\n`;
          Object.entries(response.data.data).forEach(([community, actors]) => {
            message += `Community ${community}: ${actors.join(", ")}\n`;
          });
        } else if (selectedOption === "Find Isolated Nodes" && response.data.data) {
          message += `\nIsolated Nodes:\n`;
          response.data.data.forEach((node) => {
            message += `- ${node.name} (Labels: ${node.labels.join(", ")})\n`;
          });
        }


        setOutput(message); // Set the response message
        setProfileOutput(JSON.stringify(response.data.profile, null, 2)); // Set the query profile

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
          <li onClick={() => { setSelectedOption("Find Co-actors"); setOutput(""); setProfileOutput(""); }}>
            Find Co-actors
          </li>
          <li onClick={() => { setSelectedOption("Find Frequent Collaborators"); setOutput(""); setProfileOutput(""); }}>
            Find Frequent Collaborators
          </li>
          <li onClick={() => { setSelectedOption("Find Actors Who Haven’t Worked Together"); setOutput(""); setProfileOutput(""); }}>
            Find Actors Who Haven’t Worked Together
          </li>
          <li onClick={() => { setSelectedOption("Find Actors Who Debuted in a Specific Year"); setOutput(""); setProfileOutput(""); }}>
            Find Actors Who Debuted in a Specific Year
          </li>
          <li onClick={() => { setSelectedOption("Find Most Connected Movie"); setOutput(""); setProfileOutput(""); }}>
            Find Most Connected Movie
          </li>
          {/* <li onClick={() => { setSelectedOption("Find Sequels/Prequels of a Movie"); setOutput(""); setProfileOutput(""); }}>
            Find Sequels/Prequels of a Movie
          </li> */}
          <li onClick={() => { setSelectedOption("Find Movies with Actor + Director Combo"); setOutput(""); setProfileOutput(""); }}>
            Find Movies with Actor + Director Combo
          </li>
          <li onClick={() => { setSelectedOption("Find All Movies Directed by a Person"); setOutput(""); setProfileOutput(""); }}>
            Find All Movies Directed by a Person
          </li>
          <li onClick={() => { setSelectedOption("Find Directors Who Worked with a Specific Actor"); setOutput(""); setProfileOutput(""); }}>
            Find Directors Who Worked with a Specific Actor
          </li>
          <li onClick={() => { setSelectedOption("Find Producers with Most Movies Produced"); setOutput(""); setProfileOutput(""); }}>
            Find Producers with Most Movies Produced
          </li>
          <li onClick={() => { setSelectedOption("Find Shortest Path Between Two Actors"); setOutput(""); setProfileOutput(""); }}>
            Find Shortest Path Between Two Actors
          </li>
          <li onClick={() => { setSelectedOption("Find Most Central Actor"); setOutput(""); setProfileOutput(""); }}>
            Find Most Central Actor
          </li>
          <li onClick={() => { setSelectedOption("Find Clusters or Communities of Actors"); setOutput(""); setProfileOutput(""); }}>
            Find Clusters or Communities of Actors
          </li>
          <li onClick={() => { setSelectedOption("Find Isolated Nodes"); setOutput(""); setProfileOutput(""); }}>
            Find Isolated Nodes
          </li>
          <li onClick={() => { setSelectedOption("Find Actors with Widest Genre Diversity"); setOutput(""); setProfileOutput(""); }}>
            Find Actors with Widest Genre Diversity
          </li>
        </ul>
      </div>
    );
  };

  const renderMovieDatabaseInputFields = () => {
    switch (selectedOption) {
      case "Fetch All Movies":
        return (
          <div className="input-fields">
            <button onClick={handleSubmit}>Fetch All Movies</button>
          </div>
        );
      case "Fetch Movie Details":
        return (
          <div className="input-fields">
            <label>
              Movie Title:
              <input
                type="text"
                placeholder="Enter movie title"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Fetch Movie Details</button>
          </div>
        );
      case "Fetch People in Movies":
        return (
          <div className="input-fields">
            <label>
              Person Name:
              <input
                type="text"
                placeholder="Enter person name"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Fetch People in Movies</button>
          </div>
        );
      case "Find Co-actors":
        return (
          <div className="input-fields">
            <label>
              Actor Name:
              <input
                type="text"
                placeholder="Enter actor name"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Find Co-actors</button>
          </div>
        );
      case "Find Frequent Collaborators":
        return (
          <div className="input-fields">
            <button onClick={handleSubmit}>Find Frequent Collaborators</button>
          </div>
        );
      case "Find Actors Who Haven’t Worked Together":
        return (
          <div className="input-fields">
            <button onClick={handleSubmit}>Find Actors Who Haven’t Worked Together</button>
          </div>
        );
      case "Find Actors Who Debuted in a Specific Year":
        return (
          <div className="input-fields">
            <label>
              Year:
              <input
                type="text"
                placeholder="Enter debut year"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Find Actors Who Debuted in a Specific Year</button>
          </div>
        );
      case "Find Most Connected Movie":
        return (
          <div className="input-fields">
            <button onClick={handleSubmit}>Find Most Connected Movie</button>
          </div>
        );
      case "Find Sequels/Prequels of a Movie":
        return (
          <div className="input-fields">
            <label>
              Movie Title:
              <input
                type="text"
                placeholder="Enter movie title"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Find Sequels/Prequels</button>
          </div>
        );
      case "Find Movies with Actor + Director Combo":
        return (
          <div className="input-fields">
            <label>
              Actor Name:
              <input
                type="text"
                placeholder="Enter actor name"
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
              />
            </label>
            <label>
              Director Name:
              <input
                type="text"
                placeholder="Enter director name"
                value={endNode}
                onChange={(e) => setEndNode(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Find Movies</button>
          </div>
        );
      case "Find All Movies Directed by a Person":
        return (
          <div className="input-fields">
            <label>
              Director Name:
              <input
                type="text"
                placeholder="Enter director name"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Find Movies</button>
          </div>
        );
      case "Find Directors Who Worked with a Specific Actor":
        return (
          <div className="input-fields">
            <label>
              Actor Name:
              <input
                type="text"
                placeholder="Enter actor name"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Find Directors</button>
          </div>
        );
      case "Find Producers with Most Movies Produced":
        return (
          <div className="input-fields">
            <button onClick={handleSubmit}>Find Producers</button>
          </div>
        );
      case "Find Shortest Path Between Two Actors":
        return (
          <div className="input-fields">
            <label>
              Actor 1:
              <input
                type="text"
                placeholder="Enter first actor"
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
              />
            </label>
            <label>
              Actor 2:
              <input
                type="text"
                placeholder="Enter second actor"
                value={endNode}
                onChange={(e) => setEndNode(e.target.value)}
              />
            </label>
            <button onClick={handleSubmit}>Find Shortest Path</button>
          </div>
        );
      case "Find Most Central Actor":
        return (
          <div className="input-fields">
            <button onClick={handleSubmit}>Find Most Central Actor</button>
          </div>
        );
      case "Find Clusters or Communities of Actors":
        return (
          <div className="input-fields">
            <button onClick={handleSubmit}>Find Clusters</button>
          </div>
        );
      case "Find Isolated Nodes":
        return (
          <div className="input-fields">
            <button onClick={handleSubmit}>Find Isolated Nodes</button>
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
        {selectedPage === "Movie database" ? (
          <div className="left-panel">
            {renderMovieDatabaseOptions()}
            <div className="input-container">
              {renderMovieDatabaseInputFields()}
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