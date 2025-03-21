const net = require('net');  // Importing Node.js net module for TCP connections
const Singleton = require('./Singleton');  // Utility functions for ID generation
const RoutingTable = require('./RoutingTable');  // Manages peer storage

// Parse command-line arguments
const args = process.argv.slice(2);
const peerNameIndex = args.indexOf('-n');
const peerConnectIndex = args.indexOf('-p');

// Check if the required peer name argument is provided
if (peerNameIndex === -1 || peerNameIndex === args.length - 1) {
    console.error("Usage: node DHTPeer.js -n <peerName> [-p <peerIP>:<port>]");
    process.exit(1);
}

//Settting up characteristics for each peer
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

//Create a TCP Server to listn for incoming connections
const server = net.createServer(socket => {
    console.log(`Incoming connection from ${socket.remoteAddress}:${socket.remotePort}`);
    
    socket.on('data', (data) => {
        console.log(`Received: ${data}`);
    });

    socket.on('end', () => {
        console.log(`Connection closed`);
    });
});

//Start listening on the assigned port
server.listen(peer.port, peer.ip, () => {
    console.log(`Peer ${peer.name} started at ${peer.ip}:${peer.port} with ID ${peer.id}`);
});


// If -p <peerIP>:<port> is provided, connect to an existing peer
if (peerConnectIndex !== -1 && peerConnectIndex + 1 < args.length) {
    const [targetIP, targetPort] = args[peerConnectIndex + 1].split(':');

    const client = new net.Socket();
    client.connect(parseInt(targetPort), targetIP, () => {
        console.log(`Connected to peer at ${targetIP}:${targetPort}`);
        client.write(`Hello from ${peer.name} [${peer.id}]`);
    });

    client.on('data', (data) => {
        console.log(`Received from ${targetIP}:${targetPort}: ${data}`);
    });

    client.on('close', () => {
        console.log(`Connection closed with ${targetIP}:${targetPort}`);
    });
}