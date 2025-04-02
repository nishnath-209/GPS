from fastapi import FastAPI, Query
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
    try:
        with driver.session() as session:
            # Get all nodes first
            nodes_query = "MATCH (n) RETURN n"
            relationships_query = "MATCH (a)-[r]->(b) RETURN a, r, b"
            
            nodes = {}
            edges = []
            
            # Process nodes
            nodes_result = session.run(nodes_query)
            for record in nodes_result:
                node = record["n"]
                nodes[node.id] = {
                    "id": str(node.id),  # Convert to string for consistency
                    "num": node.get("num"),
                    "labels": list(node.labels)
                }
            
            # Process relationships
            rels_result = session.run(relationships_query)
            for record in rels_result:
                rel = record["r"]
                edges.append({
                    "source": str(rel.start_node.id),
                    "target": str(rel.end_node.id),
                    "type": rel.type,
                    "id": str(rel.id)
                })
            
            return {
                "nodes": list(nodes.values()),
                "edges": edges
            }
    
    except Exception as e:
        print("Error:", e)
        return {"error": str(e)}
    
@app.get("/")
def read_root():
    return {"message": "Graph Query API is running!"}

class InputData(BaseModel):
    startNode: str = None
    endNode: str = None
    inputValue: str = None

@app.get("/process_input")
async def process_input(
    type: str = Query(...), startNode: str = None, endNode: str = None, inputValue: str = None
):
    """Processes input data sent from the frontend."""
    print(f"Received type: {type}, startNode: {startNode}, endNode: {endNode}, inputValue: {inputValue}")
    try:
        with driver.session() as session:
            if type == "Find Shortest Distance" and startNode and endNode:
                query = (
                    f"MATCH path = allShortestPaths((n1)-[:CONNECTS*]->(n2)) "
                    f"WHERE n1.num = {startNode} AND n2.num = {endNode} "
                    f"RETURN path"
                )
                result = session.run(query)
                paths = [record["path"] for record in result]
                return {"message": f"Shortest path: {paths}"}

            elif type == "Another Option" and inputValue:
                query = f"MATCH (n) WHERE n.id = '{inputValue}' RETURN n"
                result = session.run(query)
                nodes = [record["n"] for record in result]
                return {"message": f"Nodes matching input: {nodes}"}

            else:
                return {"message": "Invalid input or type."}

    except Exception as e:
        print("Error processing input:", e)
        return {"message": f"Error: {str(e)}"}
