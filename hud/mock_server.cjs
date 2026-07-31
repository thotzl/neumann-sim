const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 3005;
const statePath = path.join(__dirname, 'mock_state.json');

// Load the generated static mock state
let mockState = {};
try {
  mockState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  console.log(`[Mock Server] Loaded static mock state with ${mockState.systems?.length || 0} systems and ${mockState.agents?.length || 0} agents.`);
} catch (e) {
  console.error('[Mock Server] Failed to load mock_state.json. Did you run the generator script?', e);
  process.exit(1);
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  console.log('[Mock Server] New client connected. Sending INIT payload...');
  
  // Construct the INIT payload exactly as the monitor expects it
  const initPayload = {
    type: 'INIT',
    history: [],
    state: mockState
  };

  ws.send(JSON.stringify(initPayload));

  ws.on('close', () => {
    console.log('[Mock Server] Client disconnected.');
  });
});

console.log(`[Mock Server] Running on ws://localhost:${PORT}`);
