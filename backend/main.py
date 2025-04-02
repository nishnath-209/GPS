from fastapi import FastAPI, Query
from pydantic import BaseModel
from neo4j import GraphDatabase
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
import re

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
async def get_graph_data(dataType: str = None):
    try:
        with driver.session() as session:
            if dataType == "Movie database":
                # Fetch movie-related data
                query = """
                MATCH (m:Movie)<-[r]-(p:Person)
                RETURN m.title AS movie, m.released AS released, m.tagline AS tagline, 
                       collect({name: p.name, born: p.born, relationship: type(r), roles: r.roles}) AS people
                """
                result = session.run(query)
                movies = [
                    {
                        "title": record["movie"],
                        "released": record["released"],
                        "tagline": record["tagline"],
                        "people": record["people"]
                    }
                    for record in result
                ]
                return {"type": "Movie database", "movies": movies}
            else:
                # Fetch default graph data
                nodes_query = "MATCH (n:node) RETURN n"
                relationships_query = "MATCH (a:node)-[r]->(b:node) RETURN a, r, b"
                
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
                    "type": "Graph data",
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

def parse_profile(raw_profile):
    """Parses the Neo4j query profile JSON into a structured format."""
    def parse_operator(operator):
        """Recursively parses an operator and its children."""
        return {
            "Operator Type": operator.get("operatorType", "Unknown"),
            "Rows": operator.get("rows", 0),
            "DB Hits": operator.get("dbHits", 0),
            "Page Cache Hits": operator.get("pageCacheHits", 0),
            "Page Cache Misses": operator.get("pageCacheMisses", 0),
            "Details": operator.get("args", {}).get("Details", "N/A"),
            "Estimated Rows": operator.get("args", {}).get("EstimatedRows", 0),
            "Memory (Bytes)": operator.get("args", {}).get("Memory", 0),
            "Children": [parse_operator(child) for child in operator.get("children", [])]
        }

    # Parse the root operator
    parsed_profile = parse_operator(raw_profile)

    # Add global details if available
    global_details = {
        "Global Memory": raw_profile.get("args", {}).get("GlobalMemory", 0),
        "Total DB Hits": raw_profile.get("dbHits", 0),
        "Total Page Cache Hits": raw_profile.get("pageCacheHits", 0),
        "Total Page Cache Misses": raw_profile.get("pageCacheMisses", 0)
    }
    parsed_profile.update(global_details)

    return parsed_profile

def execute_query_with_profile(session, query):
    """Executes a Cypher query with PROFILE and returns both results and parsed performance details."""
    result = session.run(f"PROFILE {query}")
    records = list(result)  # Fetch all records first
    raw_profile = result.consume().profile  # Consume the result to get the profile
    parsed_profile = parse_profile(raw_profile)  # Parse the raw profile
    return records, parsed_profile

def find_shortest_distance(session, startNode, endNode):
    query = (
        f"MATCH path = shortestPath((n1)-[:CONNECTS*..150]->(n2)) "
        f"WHERE n1.num = {startNode} AND n2.num = {endNode} "
        f"RETURN path, length(path) AS distance, nodes(path) AS pathNodes, relationships(path) AS pathEdges"
    )
    records, profile = execute_query_with_profile(session, query)
    paths = []
    for record in records:
        path = record["path"]
        distance = record["distance"]
        nodes_in_path = record["pathNodes"]
        edges_in_path = record["pathEdges"]

        nodes = [
            {
                "id": str(node.id),
                "num": node.get("num"),
                "labels": list(node.labels)
            }
            for node in nodes_in_path
        ]

        edges = [
            {
                "source": str(rel.start_node.id),
                "target": str(rel.end_node.id),
                "type": rel.type,
                "id": str(rel.id)
            }
            for rel in edges_in_path
        ]

        paths.append({
            "distance": distance,
            "nodes": nodes,
            "edges": edges
        })

    if not paths:
        return {"message": "No path found.", "data": None, "profile": profile}
    return {"message": "Shortest distance found.", "data": paths[0], "profile": profile}

def find_no_of_nodes(session):
    query = "MATCH (n) RETURN n AS node, count(n) AS nodeCount"
    result, profile = execute_query_with_profile(session, query)
    nodes = [
        {
            "id": str(record["node"].id),
            "num": record["node"].get("num"),
            "labels": list(record["node"].labels)
        }
        for record in result
    ]
    node_count = len(nodes)
    return {
        "message": f"Total number of nodes: {node_count}",
        "data": {"nodes": nodes},
        "profile": profile
    }

def find_connected_nodes_from(session, inputValue):
    query = (
        f"MATCH (n {{num: {inputValue}}})-[:CONNECTS]->(connected) "
        f"RETURN connected"
    )
    result, profile = execute_query_with_profile(session, query)
    connected_nodes = [
        {
            "id": str(record["connected"].id),
            "num": record["connected"].get("num"),
            "labels": list(record["connected"].labels)
        }
        for record in result
    ]
    if not connected_nodes:
        return {"message": f"No connected nodes found for node {inputValue}.", "profile": profile}
    return {
        "message": f"No of Nodes Connected from {inputValue}: {len(connected_nodes)}",
        "data": {"nodes": connected_nodes},
        "profile": profile
    }

def find_connected_nodes_to(session, inputValue):
    query = (
        f"MATCH (connected)-[:CONNECTS]->(n {{num: {inputValue}}}) "
        f"RETURN connected"
    )
    result, profile = execute_query_with_profile(session, query)
    connected_nodes = [
        {
            "id": str(record["connected"].id),
            "num": record["connected"].get("num"),
            "labels": list(record["connected"].labels)
        }
        for record in result
    ]
    if not connected_nodes:
        return {"message": f"No connected nodes found for node {inputValue}.", "profile": profile}
    return {
        "message": f"No of Nodes connected to {inputValue}: {len(connected_nodes)}",
        "data": {"nodes": connected_nodes},
        "profile": profile
    }

def find_common_neighbors(session, node1, node2):
    query = (
        f"MATCH (n1 {{num: {node1}}})--(common)--(n2 {{num: {node2}}}) "
        f"RETURN common"
    )
    result, profile = execute_query_with_profile(session, query)
    common_neighbors = [
        {
            "id": str(record["common"].id),
            "num": record["common"].get("num"),
            "labels": list(record["common"].labels)
        }
        for record in result
    ]
    if not common_neighbors:
        return {"message": f"No common neighbors found between {node1} and {node2}.", "profile": profile}
    return {
        "message": f"Common neighbors between {node1} and {node2}: {len(common_neighbors)}",
        "data": {"nodes": common_neighbors},
        "profile": profile
    }

def find_all_shortest_paths(session, startNode, endNode):
    query = (
        f"MATCH paths = allShortestPaths((n1)-[:CONNECTS*..150]->(n2)) "
        f"WHERE n1.num = {startNode} AND n2.num = {endNode} "
        f"RETURN paths, length(paths) AS distance, nodes(paths) AS pathNodes, relationships(paths) AS pathEdges"
    )
    records, profile = execute_query_with_profile(session, query)
    all_paths = []
    combined_nodes = {}
    combined_edges = []

    for index, record in enumerate(records, start=1):  # Add an index to each path
        path = record["paths"]
        distance = record["distance"]
        nodes_in_path = record["pathNodes"]
        edges_in_path = record["pathEdges"]

        # Extract nodes
        nodes = [
            {
                "id": str(node.id),
                "num": node.get("num"),
                "labels": list(node.labels)
            }
            for node in nodes_in_path
        ]

        # Extract edges
        edges = [
            {
                "source": str(rel.start_node.id),
                "target": str(rel.end_node.id),
                "type": rel.type,
                "id": str(rel.id)
            }
            for rel in edges_in_path
        ]

        # Add nodes and edges to combined structures
        for node in nodes:
            combined_nodes[node["id"]] = node  # Avoid duplicates by using a dictionary
        combined_edges.extend(edges)

        # Add path details to all_paths
        all_paths.append({
            "index": index,  
            "distance": distance,
            "nodes": nodes,
            "edges": edges
        })

    if not all_paths:
        return {"message": "No paths found.", "data": None, "profile": profile}

    return {
        "message": f"All shortest paths found: {len(all_paths)}",
        "data": {
            "paths": all_paths,
            "combined": {
                "nodes": list(combined_nodes.values()), 
                "edges": combined_edges
            }
        },
        "profile": profile
    }

@app.get("/process_input")
async def process_input(
    type: str = Query(...), startNode: str = None, endNode: str = None, inputValue: str = None
):
    """Processes input data sent from the frontend."""
    print(f"Received type: {type}, startNode: {startNode}, endNode: {endNode}, inputValue: {inputValue}")
    try:
        with driver.session() as session:
            if type == "Find Shortest Distance" and startNode and endNode:
                return find_shortest_distance(session, startNode, endNode)
            elif type == "Find no of Nodes":
                return find_no_of_nodes(session)
            elif type == "Find Nodes connected from a node" and inputValue:
                return find_connected_nodes_from(session, inputValue)
            elif type == "Find Nodes connected to a node" and inputValue:
                return find_connected_nodes_to(session, inputValue)
            elif type == "Common Neighbors" and startNode and endNode:
                return find_common_neighbors(session, startNode, endNode)
            elif type == "All Shortest Paths" and startNode and endNode:
                return find_all_shortest_paths(session,startNode,endNode)
            else:
                return {"message": f"Invalid input or type: {type}"}

    except Exception as e:
        print("Error processing input:", e)
        return {"message": f"Error: {str(e)}"}
