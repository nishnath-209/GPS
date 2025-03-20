from neo4j import GraphDatabase

# Neo4j Connection Details
NEO4J_URI="neo4j+s://fde52fc5.databases.neo4j.io"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="lI8chwvrb8ktqpNn1wnNrJZ1SOVk7Nyhz8geSttrKek"

# Connect to Neo4j
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def load_graph_from_file(filename):
    """Loads graph data from dataset.txt into Neo4j."""
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")  # Clear existing data
        
        with open(filename, "r") as f:
            for line in f:
                src, dest = line.strip().split()  # Read source and target
                cypher_query = (
                    f"MERGE (a:Node {{id: '{src}'}}) "
                    f"MERGE (b:Node {{id: '{dest}'}}) "
                    f"MERGE (a)-[:CONNECTED_TO]->(b)"
                )
                session.run(cypher_query)
        print("✅ Graph data loaded successfully!")

# Run this once to load the data
if __name__ == "__main__":
    load_graph_from_file("dataset.txt")
