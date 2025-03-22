const net = require('net');  // Importing Node.js net module for TCP connections
const Singleton = require('./Singleton');  // Utility functions for ID generation
const RoutingTable = require('./RoutingTable');  // Manages peer storage
const kPTP = require('./kPTP');  // Import the structured message handler

// Parse command-line arguments
const args = process.argv.slice(2);
const peerNameIndex = args.indexOf('-n');
const peerConnectIndex = args.indexOf('-p');

//used for getting time stamps
function getTimestamp() {
    const now = new Date();
    return now.toLocaleString('en-CA', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Check if the required peer name argument is provided
if (peerNameIndex === -1 || peerNameIndex === args.length - 1) {
    console.error("Usage: node DHTPeer.js -n <peerName> [-p <peerIP>:<port>]");
    process.exit(1);
}

// Setting up characteristics for each peer
const peerName = args[peerNameIndex + 1];
const peerIP = '127.0.0.1';  // Default IP (assuming localhost for now)
const peerPort = Singleton.getRandomPort();  // Assign a random ephemeral port
const peerID = Singleton.getPeerID(peerIP, peerPort);  // Generate unique peer ID

// Define peer object
const peer = {
    name: peerName,
    ip: peerIP,
    port: peerPort,
    id: peerID,
};

// Initialize routing table for peer connections
const routingTable = new RoutingTable(peer);

// Create a TCP Server to listen for incoming connections
const server = net.createServer(socket => {
    console.log(`Incoming connection from ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
        const message = kPTP.parseMessage(data.toString());
        if (!message) return;

        if (message.type === 4) {  // Hello message
            console.log(`Received Hello message from ${message.sender.name} [${message.sender.id}]`);
            routingTable.pushBucket(message.sender);  // Store peer in DHT table
            routingTable.refreshBuckets(message.peers);  // Update with sender's known peers

            // Send a welcome message with known peers
            const welcomeMessage = kPTP.createMessage(2, peer, routingTable.getPeers());
            socket.write(welcomeMessage);
            socket.end();
        }

        else if (message.type === 5) {  // Heartbeat message
            console.log(`[HEARTBEAT] Received heartbeat from ${message.sender.name} [${message.sender.id}]`);

            const heartbeatResponse = kPTP.createMessage(5, peer);

            // Fix: prevent "write after end" error
            if (!socket.destroyed && socket.writable) {
                socket.end(heartbeatResponse); // write + end in one step
            }
        }
    });

    socket.on('error', (err) => {
        console.error(`Socket error: ${err.message}`);
    });
});

// Start listening on the assigned port
server.listen(peer.port, peer.ip, () => {
    console.log(`Peer ${peer.name} started at ${peer.ip}:${peer.port} with ID ${peer.id}`);
    console.log(`Listening on port ${peer.port}...`);
});

// If -p <peerIP>:<port> is provided, connect to an existing peer
if (peerConnectIndex !== -1 && peerConnectIndex + 1 < args.length) {
    const [targetIP, targetPort] = args[peerConnectIndex + 1].split(':');

    const client = new net.Socket();
    client.connect(parseInt(targetPort), targetIP, () => {
        console.log(`${getTimestamp()} | Connected to peer at ${targetIP}:${targetPort}`);

        // Send Hello message to introduce itself
        const helloMessage = kPTP.createMessage(4, peer);
        client.write(helloMessage);
    });

    client.on('data', (data) => {
        const message = kPTP.parseMessage(data.toString());
        if (message && message.type === 2) {  // Welcome message
            console.log(`Received Welcome from ${message.sender.name} [${message.sender.id}]`);
            routingTable.refreshBuckets(message.peers);  // Update routing table
        }
    });

    client.on('close', () => {
        console.log(`${getTimestamp()} | Connection closed with ${targetIP}:${targetPort}`);
    });

    client.on('error', (err) => {
        console.error(`Client error: ${err.message}`);
    });
}

// Periodically send heartbeat messages to peers every 5 seconds
setInterval(() => {
    routingTable.sendHeartbeats();
}, 5000);
