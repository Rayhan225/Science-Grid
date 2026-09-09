// src/graphDatabase.js
import neo4j from 'neo4j-driver';

const URI = 'neo4j+s://28ead07c.databases.neo4j.io'; 
const USERNAME = '28ead07c'; 
const PASSWORD = 'X2cthBzWJJnOtJEjZQV4Kykw7bZg68dEP3O1NeWfShQ';

let driver = null;
try {
  driver = neo4j.driver(URI, neo4j.auth.basic(USERNAME, PASSWORD));
} catch (e) {
  console.warn("Neo4j driver initialization warning:", e);
}

export async function saveEquationToGraph(equationText, variablesArray) {
  if (!driver) return false;
  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      const query = `
        MERGE (eq:Equation { text: $equationText })
        WITH eq
        UNWIND $variablesArray AS varName
        MERGE (v:Variable { name: varName })
        MERGE (eq)-[:CONTAINS_VARIABLE]->(v)
        RETURN eq, v
      `;
      return await tx.run(query, { equationText, variablesArray });
    });
    return true;
  } catch (error) {
    console.warn('Graph save bypassed (offline mode):', error.message);
    return false;
  } finally {
    await session.close();
  }
}

export async function fetchGraphData() {
  if (!driver) return { nodes: [], links: [] };
  const session = driver.session();
  try {
    const result = await session.executeRead(async (tx) => {
      const query = `
        MATCH (eq:Equation)-[:CONTAINS_VARIABLE]->(var:Variable)
        RETURN eq, var
      `;
      return await tx.run(query);
    });

    const nodes = [];
    const links = [];
    const nodeIds = new Set();

    result.records.forEach(record => {
      const eq = record.get('eq').properties;
      const v = record.get('var').properties;

      const eqId = eq.text;
      if (!nodeIds.has(eqId)) {
        nodes.push({ id: eqId, label: eq.text.substring(0, 15) + '...', type: 'equation' });
        nodeIds.add(eqId);
      }

      const vId = v.name;
      if (!nodeIds.has(vId)) {
        nodes.push({ id: vId, label: v.name, type: 'variable' });
        nodeIds.add(vId);
      }

      links.push({ source: eqId, target: vId });
    });

    return { nodes, links };
  } catch (error) {
    console.warn('Graph fetch bypassed (offline mode):', error.message);
    return { nodes: [], links: [] };
  } finally {
    await session.close();
  }
}