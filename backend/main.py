from fastapi import FastAPI
from pydantic import BaseModel
from neo4j import GraphDatabase
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI()

# Allow frontend (React) to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Neo4j Connection
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

class QueryRequest(BaseModel):
    cypher: str  # User query from frontend

@app.post("/query")
async def run_query(request: QueryRequest):
    """Runs a Cypher query and returns formatted graph data."""
    with driver.session() as session:
        result = session.run(request.cypher)
        
        nodes = {}
        edges = []
        
        for record in result:
            for key in record.keys():
                value = record[key]
                if isinstance(value, dict):  # Node
                    node_id = value.get("id", value.get("name", ""))
                    nodes[node_id] = {
                        "id": node_id,
                        "label": value.get("name", ""),
                    }
                elif isinstance(value, tuple):  # Relationship
                    source, relation, target = value
                    edge_id = f"{source}-{relation}-{target}"
                    edges.append({
                        "id": edge_id,
                        "source": source,
                        "target": target,
                        "label": relation,
                    })

        return {"nodes": list(nodes.values()), "edges": edges}

@app.get("/temp")
def run_temp():
    return {"data_num":"9669"}

@app.get("/")
def read_root():
    return {"message": "Graph Query API is running!"}
