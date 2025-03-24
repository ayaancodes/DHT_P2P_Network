const net = require('net');  // Built-in Node.js module for creating TCP servers and clients
const Singleton = require('./Singleton');  // Module for generating unique peer IDs and random ports
const RoutingTable = require('./RoutingTable');  // Handles storage and management of known peers
const kPTP = require('./kPTP');  // Module for creating and parsing messages based on a custom protocol

// Extract command-line input arguments
const args = process.argv.slice(2);  // Ignore first two default Node arguments
const peerNameIndex = args.indexOf('-n');  // Find flag for peer name
const peerConnectIndex = args.indexOf('-p');  // Find flag for peer connection target

// Utility function to generate a timestamp string in a readable format
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

// Ensure that a peer name was specified via the command line
if (peerNameIndex === -1 || peerNameIndex === args.length - 1) {
    console.error("Missing peer name.\nUsage: node DHTPeer.js -n <peerName> [-p <peerIP>:<port>]");
    process.exit(1);  // Stop execution due to invalid input
}

// Initialize basic peer metadata
const peerName = args[peerNameIndex + 1];  // Retrieve name for this peer
const peerIP = '127.0.0.1';  // Defaulting to local loopback address
const peerPort = Singleton.getRandomPort();  // Dynamically assign an unused port
const peerID = Singleton.getPeerID(peerIP, peerPort);  // Generate a unique identifier using IP and port

// Represent the local peer as an object
const peer = {
    name: peerName,
    ip: peerIP,
    port: peerPort,
    id: peerID,
};

// Create a routing table instance to maintain known peers
const routingTable = new RoutingTable(peer);

// Create a TCP server to handle incoming messages from other peers
const server = net.createServer(socket => {
    console.log(`New incoming connection from ${socket.remoteAddress}:${socket.remotePort}`);

    // Handle received data from connected peer
    socket.on('data', (data) => {
        const message = kPTP.parseMessage(data.toString());  // Convert raw data into structured message
        if (!message) return;  // Ignore if message parsing failed

        // If the message is a "Hello" type (4), add sender to routing table
        if (message.type === 4) {
            console.log(`Hello received from ${message.sender.name} [ID: ${message.sender.id}]`);

            // Store new peer in the routing table
            routingTable.pushBucket(message.sender);

            // Also update routing table with additional peers known to the sender
            routingTable.refreshBuckets(message.peers);

            // Send a welcome message back with our known peers
            const welcomeMessage = kPTP.createMessage(2, peer, routingTable.getPeers());
            socket.write(welcomeMessage);  // Respond with welcome message
            socket.end();  // Close the connection after sending
        }

        // Handle heartbeat message (type 5) to maintain connectivity
        else if (message.type === 5) {
            console.log(`[HEARTBEAT] Ping received from ${message.sender.name} [ID: ${message.sender.id}]`);

            const heartbeatResponse = kPTP.createMessage(5, peer);  // Prepare acknowledgment

            // Send response if socket is still valid
            if (!socket.destroyed && socket.writable) {
                socket.end(heartbeatResponse);  // Send response and close connection
            }
        }
    });

    // Handle socket-level errors gracefully
    socket.on('error', (err) => {
        console.error(`Socket encountered error: ${err.message}`);
    });
});

// Begin listening for incoming peer connections
server.listen(peer.port, peer.ip, () => {
    console.log(`Peer '${peer.name}' is now active at ${peer.ip}:${peer.port} with ID ${peer.id}`);
    console.log(`Listening for connections on port ${peer.port}...`);
});

// If user specified another peer to connect to, initiate handshake
if (peerConnectIndex !== -1 && peerConnectIndex + 1 < args.length) {
    const [targetIP, targetPort] = args[peerConnectIndex + 1].split(':');

    const client = new net.Socket();  // Create a new client socket
    client.connect(parseInt(targetPort), targetIP, () => {
        console.log(`${getTimestamp()} | Successfully connected to peer at ${targetIP}:${targetPort}`);

        // Send introduction message to the target peer
        const helloMessage = kPTP.createMessage(4, peer);
        client.write(helloMessage);
    });

    // Handle data received from target peer
    client.on('data', (data) => {
        const message = kPTP.parseMessage(data.toString());
        if (message && message.type === 2) {  // Welcome message received
            console.log(`Welcome received from ${message.sender.name} [ID: ${message.sender.id}]`);
            routingTable.refreshBuckets(message.peers);  // Sync with received peer list
        }
    });

    // Notify when the connection ends
    client.on('close', () => {
        console.log(`${getTimestamp()} | Connection closed with ${targetIP}:${targetPort}`);
    });

    // Handle any connection errors
    client.on('error', (err) => {
        console.error(`Client encountered error: ${err.message}`);
    });
}

// Set up a recurring task to send heartbeat messages to all known peers
setInterval(() => {
    routingTable.sendHeartbeats();  // Inform connected peers that this node is still alive
}, 5000);  // Repeat every 5 seconds
