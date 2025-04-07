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
                MATCH (m:Movie)-[r]-(p:Person)
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
    query = "MATCH (n:node) RETURN n AS node, count(n) AS nodeCount"
    result, profile = execute_query_with_profile(session, query)
    print("result",result)
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

def fetch_all_movies(session):
    """Fetch all movies with their details."""
    query = """
    MATCH (m:Movie)
    RETURN m.title AS title, m.released AS released, m.tagline AS tagline
    """
    result, profile = execute_query_with_profile(session, query)
    movies = [
        {
            "title": record["title"],
            "released": record["released"],
            "tagline": record["tagline"]
        }
        for record in result
    ]
    return {"message": f"Fetched {len(movies)} movies.", "data": movies,"profile":profile }

def fetch_movie_details(session, movie_title):
    """Fetch details of a specific movie."""
    query = f"""
    MATCH (m:Movie {{title: '{movie_title}'}})<-[r]-(p:Person)
    RETURN m.title AS title, m.released AS released, m.tagline AS tagline,
           collect({{name: p.name, born: p.born, relationship: type(r), roles: r.roles}}) AS people
    """
    result, profile = execute_query_with_profile(session, query)
    records = list(result)
    record = records[0]
    if not records:
        return {"message": f"No details found for movie '{movie_title}'."}
    movie_details = {
        "title": record["title"],
        "released": record["released"],
        "tagline": record["tagline"],
        "people": record["people"]
    }
    return {"message": f"Details for movie '{movie_title}' fetched successfully.", "data": movie_details,"profile":profile}

def fetch_people_in_movies(session, person_name):
    """Fetch movies associated with a specific person."""
    query = f"""
    MATCH (p:Person {{name: '{person_name}'}})-[r]->(m:Movie)
    RETURN p.name AS name, p.born AS born,
           collect({{title: m.title, released: m.released, relationship: type(r), roles: r.roles}}) AS movies
    """
    result, profile = execute_query_with_profile(session, query)
    records = list(result)
    record = records[0]
    if not records:
        return {"message": f"No movies found for person '{person_name}'."}
    person_details = {
        "name": record["name"],
        "born": record["born"],
        "movies": record["movies"]
    }
    return {"message": f"Movies for person '{person_name}' fetched successfully.", "data": person_details,"profile":profile}

def find_co_actors(session, actor_name):
    """Find co-actors of a given actor."""
    query = f"""
    MATCH (a:Person {{name: '{actor_name}'}})-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(co:Person)
    RETURN co.name AS coActor,collect(m.title) AS movies
    """
    result, profile = execute_query_with_profile(session, query)
    co_actors = [
        {"coActor": record["coActor"], "movies": record["movies"]}
        for record in result
    ]
    if not co_actors:
        return {"message": f"No co-actors found for actor '{actor_name}'.", "profile": profile}
    return {"message": f"Co-actors of '{actor_name}' fetched successfully.", "data": co_actors, "profile": profile}

def find_frequent_collaborators(session):
    """Find actor-director pairs that have worked together multiple times."""
    query = """
    MATCH (a:Person)-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Person)
    RETURN a.name AS actor, d.name AS director, count(m) AS collaborations
    ORDER BY collaborations DESC
    """
    result, profile = execute_query_with_profile(session, query)
    collaborators = [
        {"actor": record["actor"], "director": record["director"], "collaborations": record["collaborations"]}
        for record in result
    ]
    if not collaborators:
        return {"message": "No frequent collaborators found.", "profile": profile}
    return {"message": "Frequent collaborators fetched successfully.", "data": collaborators, "profile": profile}

def find_actors_not_worked_together(session):
    """Find actors who haven’t worked together."""
    query = """
    MATCH (a:Person)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(b:Person)
    WITH collect([a.name, b.name]) AS pairs
    MATCH (x:Person), (y:Person)
    WHERE NOT [x.name, y.name] IN pairs AND x <> y
    RETURN x.name AS actor1, y.name AS actor2
    """
    result, profile = execute_query_with_profile(session, query)
    actors = [{"actor1": record["actor1"], "actor2": record["actor2"]} for record in result]
    if not actors:
        return {"message": "No actors found who haven’t worked together.", "profile": profile}
    return {"message": "Actors who haven’t worked together fetched successfully.", "data": actors, "profile": profile}

def find_actors_debuted_in_year(session, year):
    """Find actors who debuted in a specific year."""
    query = f"""
    MATCH (a:Person)-[:ACTED_IN]->(m:Movie)
    WHERE m.released = {year}
    RETURN DISTINCT a.name AS actor,collect(m.title) AS movies
    """
    result, profile = execute_query_with_profile(session, query)
    actors = [
        {"actor": record["actor"], "movies": record["movies"]}
        for record in result
    ]
    if not actors:
        return {"message": f"No actors found who debuted in the year {year}.", "profile": profile}
    return {"message": f"Actors who debuted in {year} fetched successfully.", "data": actors, "profile": profile}

def find_most_connected_movie(session):
    """Find the most connected movie (largest cast or crew)."""
    query = """
    MATCH (m:Movie)<-[r]-(p:Person)
    RETURN m.title AS movie, count(r) AS connections
    ORDER BY connections DESC
    LIMIT 1
    """
    result, profile = execute_query_with_profile(session, query)
    record = result[0] if result else None
    if not record:
        return {"message": "No connected movies found.", "profile": profile}
    return {
        "message": f"The most connected movie is '{record['movie']}' with {record['connections']} connections.",
        "data": {"movie": record["movie"], "connections": record["connections"]},
        "profile": profile,
    }

def find_sequels_prequels(session, movie_title):
    """Find sequels or prequels of a movie."""
    query = f"""
    MATCH (m:Movie {{title: '{movie_title}'}})-[:SEQUEL_OF|:PREQUEL_OF]-(related:Movie)
    RETURN related.title AS relatedMovie, type(r) AS relationship
    """
    result, profile = execute_query_with_profile(session, query)
    sequels_prequels = [{"relatedMovie": record["relatedMovie"], "relationship": record["relationship"]} for record in result]
    if not sequels_prequels:
        return {"message": f"No sequels or prequels found for movie '{movie_title}'.", "profile": profile}
    return {
        "message": f"Sequels/Prequels for '{movie_title}' fetched successfully.",
        "data": sequels_prequels,
        "profile": profile,
    }

def find_movies_actor_director_combo(session, actor_name, director_name):
    """Find movies with a specific actor and director combo."""
    query = f"""
    MATCH (a:Person {{name: '{actor_name}'}})-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Person {{name: '{director_name}'}})
    RETURN m.title AS movie
    """
    result, profile = execute_query_with_profile(session, query)
    movies = [record["movie"] for record in result]
    if not movies:
        return {"message": f"No movies found with actor '{actor_name}' and director '{director_name}'.", "profile": profile}
    return {
        "message": f"Movies with actor '{actor_name}' and director '{director_name}' fetched successfully.",
        "data": movies,
        "profile": profile,
    }

def find_shortest_path_between_actors(session, actor1, actor2):
    """Find the shortest path between two actors."""
    query = f"""
    MATCH path = shortestPath((a:Person {{name: '{actor1}'}})-[*]-(b:Person {{name: '{actor2}'}}))
    RETURN path, length(path) AS distance
    """
    result, profile = execute_query_with_profile(session, query)
    record = result[0] if result else None
    if not record:
        return {"message": f"No path found between '{actor1}' and '{actor2}'.", "profile": profile}
    return {
        "message": f"Shortest path between '{actor1}' and '{actor2}' found.",
        "data": {"distance": record["distance"], "path": record["path"]},
        "profile": profile,
    }

def find_all_movies_directed_by_person(session, director_name):
    """Find all movies directed by a specific person."""
    query = f"""
    MATCH (d:Person {{name: '{director_name}'}})-[:DIRECTED]->(m:Movie)
    RETURN m.title AS movie, m.released AS released, m.tagline AS tagline
    """
    result, profile = execute_query_with_profile(session, query)
    print(result)
    movies = [
        {"title": record["movie"], "released": record["released"], "tagline": record["tagline"]}
        for record in result
    ]
    if not movies:
        return {"message": f"No movies found directed by '{director_name}'.", "profile": profile}
    return {
        "message": f"Movies directed by '{director_name}' fetched successfully.",
        "data": movies,
        "profile": profile,
    }

def find_directors_worked_with_actor(session, actor_name):
    """Find directors who worked with a specific actor."""
    query = f"""
    MATCH (a:Person {{name: '{actor_name}'}})-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Person)
    RETURN d.name AS director, collect(m.title) AS movies
    """
    result, profile = execute_query_with_profile(session, query)
    directors = [
        {"director": record["director"], "movies": record["movies"]}
        for record in result
    ]
    if not directors:
        return {"message": f"No directors found who worked with '{actor_name}'.", "profile": profile}
    return {
        "message": f"Directors who worked with '{actor_name}' fetched successfully.",
        "data": directors,
        "profile": profile,
    }

def find_producers_with_most_movies(session):
    """Find producers with the most movies produced."""
    query = """
    MATCH (p:Person)-[:PRODUCED]->(m:Movie)
    RETURN p.name AS producer, count(m) AS movieCount
    ORDER BY movieCount DESC
    LIMIT 10
    """
    result, profile = execute_query_with_profile(session, query)
    producers = [
        {"producer": record["producer"], "movieCount": record["movieCount"]}
        for record in result
    ]
    if not producers:
        return {"message": "No producers found.", "profile": profile}
    return {
        "message": "Top producers fetched successfully.",
        "data": producers,
        "profile": profile,
    }

def find_shortest_path_between_actors(session, actor1, actor2):
    """Find the shortest path between two actors."""
    query = f"""
    MATCH path = shortestPath((a:Person {{name: '{actor1}'}})-[*]-(b:Person {{name: '{actor2}'}}))
    RETURN path, length(path) AS distance, nodes(path) AS pathNodes, relationships(path) AS pathEdges
    """
    result, profile = execute_query_with_profile(session, query)
    record = result[0] if result else None
    if not record:
        return {"message": f"No path found between '{actor1}' and '{actor2}'.", "profile": profile}

    # Extract nodes and relationships from the path
    nodes_in_path = record["pathNodes"]
    edges_in_path = record["pathEdges"]

    # Format nodes
    nodes = [
        {"name": node.get("name"), "title":node.get("title"),"labels": list(node.labels),}
        for node in nodes_in_path
    ]

    # Format edges
    edges = [
        {"source": rel.start_node.get("name"), "target": rel.end_node.get("name"), "type": rel.type}
        for rel in edges_in_path
    ]

    return {
        "message": f"Shortest path between '{actor1}' and '{actor2}' found.",
        "data": {
            "distance": record["distance"],
            "path": {
                "nodes": nodes,
                "edges": edges
            }
        },
        "profile": profile,
    }

def find_most_central_actor(session):
    """Find the most central actor using graph centrality."""
    query = """
    MATCH (p:Person)-[:ACTED_IN]-()
    RETURN p.name AS actor, count(*) AS score
    ORDER BY score DESC
    LIMIT 1
    """
    result, profile = execute_query_with_profile(session, query)
    record = result[0] if result else None
    if not record:
        return {"message": "No central actor found.", "profile": profile}
    return {
        "message": f"The most central actor is '{record['actor']}' with a centrality score of {record['score']}.",
        "data": {"actor": record["actor"], "score": record["score"]},
        "profile": profile,
    }

def find_clusters_of_actors(session):
    """Find clusters or communities of actors based on collaboration patterns."""
    query = """
    CALL algo.louvain.stream('Person', 'ACTED_IN', {})
    YIELD nodeId, community
    RETURN algo.asNode(nodeId).name AS actor, community
    ORDER BY community
    """
    result, profile = execute_query_with_profile(session, query)
    clusters = {}
    for record in result:
        community = record["community"]
        actor = record["actor"]
        if community not in clusters:
            clusters[community] = []
        clusters[community].append(actor)
    if not clusters:
        return {"message": "No clusters found.", "profile": profile}
    return {
        "message": "Clusters of actors fetched successfully.",
        "data": clusters,
        "profile": profile,
    }

def find_isolated_nodes(session):
    """Find isolated nodes (actors or movies not connected to the rest of the graph)."""
    query = """
    MATCH (n)
    WHERE NOT (n)--()
    RETURN n.name AS name, labels(n) AS labels
    """
    result, profile = execute_query_with_profile(session, query)
    isolated_nodes = [
        {"name": record["name"], "labels": record["labels"]}
        for record in result
    ]
    if not isolated_nodes:
        return {"message": "No isolated nodes found.", "profile": profile}
    return {
        "message": "Isolated nodes fetched successfully.",
        "data": isolated_nodes,
        "profile": profile,
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
            elif type == "Find Nodes connected from a node" and inputValue:
                return find_connected_nodes_from(session, inputValue)
            elif type == "Find Nodes connected to a node" and inputValue:
                return find_connected_nodes_to(session, inputValue)
            elif type == "Common Neighbors" and startNode and endNode:
                return find_common_neighbors(session, startNode, endNode)
            elif type == "Find no of Nodes":
                return find_no_of_nodes(session)
            elif type == "Find All Shortest Paths" and startNode and endNode:
                return find_all_shortest_paths(session, startNode, endNode)
            elif type == "Fetch All Movies":
                return fetch_all_movies(session)
            elif type == "Fetch Movie Details" and inputValue:
                return fetch_movie_details(session, inputValue)
            elif type == "Fetch People in Movies" and inputValue:
                return fetch_people_in_movies(session, inputValue)
            elif type == "Find Co-actors" and inputValue:
                return find_co_actors(session, inputValue)
            elif type == "Find Frequent Collaborators":
                return find_frequent_collaborators(session)
            elif type == "Find Actors Who Haven’t Worked Together":
                return find_actors_not_worked_together(session)
            elif type == "Find Actors Who Debuted in a Specific Year" and inputValue:
                return find_actors_debuted_in_year(session, inputValue)
            elif type == "Find Most Connected Movie":
                return find_most_connected_movie(session)
            elif type == "Find Sequels/Prequels of a Movie" and inputValue:
                return find_sequels_prequels(session, inputValue)
            elif type == "Find Movies with Actor + Director Combo" and startNode and endNode:
                return find_movies_actor_director_combo(session, startNode, endNode)
            elif type == "Find Shortest Path Between Two Actors" and startNode and endNode:
                return find_shortest_path_between_actors(session, startNode, endNode)
            elif type == "Find All Movies Directed by a Person" and inputValue:
                return find_all_movies_directed_by_person(session, inputValue)
            elif type == "Find Directors Who Worked with a Specific Actor" and inputValue:
                return find_directors_worked_with_actor(session, inputValue)
            elif type == "Find Producers with Most Movies Produced":
                return find_producers_with_most_movies(session)
            elif type == "Find Shortest Path Between Two Actors" and startNode and endNode:
                return find_shortest_path_between_actors(session, startNode, endNode)
            elif type == "Find Most Central Actor":
                return find_most_central_actor(session)
            elif type == "Find Clusters or Communities of Actors":
                return find_clusters_of_actors(session)
            elif type == "Find Isolated Nodes":
                return find_isolated_nodes(session)
            else:
                return {"message": f"Invalid input or type: {type}"}

    except Exception as e:
        print("Error processing input:", e)
        return {"message": f"Error: {str(e)}"}