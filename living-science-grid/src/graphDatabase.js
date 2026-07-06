// src/graphDatabase.js
import neo4j from 'neo4j-driver';

const URI = 'neo4j+s://28ead07c.databases.neo4j.io'; 
const USERNAME = '28ead07c'; 
const PASSWORD = 'X2cthBzWJJnOtJEjZQV4Kykw7bZg68dEP3O1NeWfShQ';

// Create a connection driver
const driver = neo4j.driver(URI, neo4j.auth.basic(USERNAME, PASSWORD));

/**
 * Saves a mathematical equation and its variables as connected nodes in the graph.
 */
export async function saveEquationToGraph(equationText, variablesArray) {
  const session = driver.session();
  
  try {
    // FIX: Changed from writeTransaction to executeWrite for v5 driver compatibility
    const result = await session.executeWrite(async (tx) => {
      const query = `
        MERGE (eq:Equation { text: $equationText })
        WITH eq
        UNWIND $variablesArray AS varName
        MERGE (v:Variable { name: varName })
        MERGE (eq)-[:CONTAINS_VARIABLE]->(v)
        RETURN eq, v
      `;
      
      const response = await tx.run(query, {
        equationText: equationText,
        variablesArray: variablesArray
      });
      
      return response.records.length;
    });

    console.log(`Successfully mapped ${result} relationships in the Knowledge Graph!`);
    return true;

  } catch (error) {
    console.error('Error saving to graph:', error);
    return false;
  } finally {
    await session.close();
  }
}

/**
 * Fetches all equations and variables to draw the Knowledge Graph.
 */
export async function fetchGraphData() {
  const session = driver.session();
  
  try {
    // 1. Ask Neo4j to find every Equation connected to a Variable
    const result = await session.executeRead(async (tx) => {
      const query = `
        MATCH (eq:Equation)-[:CONTAINS_VARIABLE]->(var:Variable)
        RETURN eq, var
      `;
      return await tx.run(query);
    });

    // 2. Format the data into 'nodes' (circles) and 'links' (lines)
    const nodes = [];
    const links = [];
    const nodeIds = new Set(); // To prevent drawing duplicates

    result.records.forEach(record => {
      const eq = record.get('eq').properties;
      const v = record.get('var').properties;

      // Create Equation Node (Label truncated so it fits on screen)
      const eqId = eq.text;
      if (!nodeIds.has(eqId)) {
        nodes.push({ id: eqId, label: eq.text.substring(0, 15) + '...', type: 'equation' });
        nodeIds.add(eqId);
      }

      // Create Variable Node
      const vId = v.name;
      if (!nodeIds.has(vId)) {
        nodes.push({ id: vId, label: v.name, type: 'variable' });
        nodeIds.add(vId);
      }

      // Create the connection between them
      links.push({ source: eqId, target: vId });
    });

    return { nodes, links };

  } catch (error) {
    console.error('Error fetching graph:', error);
    return { nodes: [], links: [] };
  } finally {
    await session.close();
  }
}