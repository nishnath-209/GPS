from fastapi import FastAPI
from pydantic import BaseModel
from neo4j import GraphDatabase
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

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
NEO4J_URI = "neo4j+s://fde52fc5.databases.neo4j.io"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "lI8chwvrb8ktqpNn1wnNrJZ1SOVk7Nyhz8geSttrKek"

with GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)) as driver:
    driver.verify_connectivity()
    print("Connection established.")

@app.on_event("startup")
async def register_routes():
    print("✅ Registered Routes:", [route.path for route in app.routes])

@app.get("/get_data")
async def get_graph_data():
    """Fetches a pre-defined set of nodes and edges from Neo4j."""
    try:
        with driver.session() as session:
            # nodes_query = "MATCH (n:node) RETURN n LIMIT 25"
            query = "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 10"
            result = session.run(query)
            # nodes_result = session.run(nodes_query)
            # edges_query = "MATCH p=()-[:CONNECTS]->() RETURN p LIMIT 25"
            # edges_result = session.run( edges_query)
            nodes = {}
            edges = []

            # for node in nodes{}
            for record in result:
                try:
                    node1 = record["n"]
                    node2 = record["m"]
                    relation = record["r"]
                    print(result)
                    # Add nodes
                    if node1.id not in nodes:
                        nodes[node1.id] = {"id": node1.id, "label": node1.get("label")}

                    if node2.id not in nodes:
                        nodes[node2.id] = {"id": node2.id, "label": node2.get("label")}

                    edge_id = f"{node1.id}-{relation.type}-{node2.id}"

                    # Add relationship
                    edges.append({
                        "id": edge_id,
                        "source": node1.id,
                        "target": node2.id,
                        "label": relation.type,
                    })
                except Exception as e:
                    print(" Error processing record:", e)

        print("Nodes:", list(nodes.values()))
        print("Edges:", edges)
        return {"nodes": list(nodes.values()), "edges": edges}

    except Exception as e:
        print("Error in /get_data:", e)
        return {"error": str(e)}

@app.get("/")
def read_root():
    return {"message": "Graph Query API is running!"}
