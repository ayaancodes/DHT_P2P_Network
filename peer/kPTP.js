// Define a custom protocol handler for peer-to-peer messaging
class kPTP {
    // Static protocol version used to ensure compatibility between peers
    static VERSION = 18;

    /**
     * Creates a structured message to be sent over the network.
     *
     * @param {number} type - Type identifier for the message (e.g., Hello, Welcome, Heartbeat).
     * @param {object} sender - Information about the sender peer (name, IP, port, ID).
     * @param {Array} peers - Optional list of other known peers to include in the message.
     * @returns {string} - JSON-encoded message string ready for transmission.
     */
    static createMessage(type, sender, peers = []) {
        let message = {
            version: this.VERSION,  // Include protocol version for backward compatibility
            type: type,             // Numeric type code representing the message kind
            sender: {
                name: sender.name,
                ip: sender.ip,
                port: sender.port,
                id: sender.id        // Unique identifier for the sending peer
            },
            // Include known peers, if any, with minimal identifying data
            peers: peers.map(peer => ({
                name: peer.name,
                ip: peer.ip,
                port: peer.port,
                id: peer.id
            }))
        };

        // Convert the structured object into a JSON string
        return JSON.stringify(message);
    }

    /**
     * Parses a received JSON string and converts it into a JavaScript object.
     *
     * @param {string} message - JSON-formatted message string received from a peer.
     * @returns {object|null} - Parsed message object, or null if parsing fails.
     */
    static parseMessage(message) {
        try {
            // Attempt to convert the JSON string into a native object
            return JSON.parse(message);
        } catch (error) {
            // Handle cases where message is malformed or corrupted
            console.error("Failed to parse message:", error);
            return null;
        }
    }
}

// Export the protocol utility so other modules can use it
module.exports = kPTP;
