// Import TCP module to handle network communication
const net = require('net');

// Import message creation and parsing logic
const kPTP = require('./kPTP');

class RoutingTable {
    constructor(peer) {
        // Store reference to the current peer
        this.peer = peer;

        // Initialize an array of 16 "buckets", each representing a group of peers by distance
        this.kBuckets = Array(16).fill(null);

        // Track how many heartbeat messages have been missed per peer
        // Format: { peerID: missedHeartbeatCount }
        this.heartbeatMisses = {};
    }

    /**
     * Attempts to place a new peer in the appropriate bucket based on XOR distance.
     * If the bucket already contains a peer, chooses the closer one to retain.
     */
    pushBucket(newPeer) {
        // Calculate how many leading bits are shared between this peer and the new one
        let sharedPrefix = this.getSharedPrefix(this.peer.id, newPeer.id);

        // Determine which bucket this peer should be added to
        let bucketIndex = Math.min(sharedPrefix.length, this.kBuckets.length - 1);

        // If the bucket is empty, insert the new peer
        if (!this.kBuckets[bucketIndex]) {
            this.kBuckets[bucketIndex] = newPeer;
            console.log(`Added peer ${newPeer.name} [${newPeer.id}] to bucket ${bucketIndex}`);
        } else {
            // If bucket already has a peer, compare distances and keep the closer one
            console.log(`Bucket ${bucketIndex} full, comparing distances`);
            let existingPeer = this.kBuckets[bucketIndex];
            let keepPeer = this.compareDistance(existingPeer.id, newPeer.id) ? existingPeer : newPeer;
            this.kBuckets[bucketIndex] = keepPeer;
            console.log(`Kept ${keepPeer.name} [${keepPeer.id}] in bucket ${bucketIndex}`);
        }
    }

    /**
     * Returns a string of leading 0s representing the shared prefix between two peer IDs.
     * This is used to determine proximity in the ID space.
     */
    getSharedPrefix(id1, id2) {
        // XOR the two IDs and convert result to binary string
        let xorResult = parseInt(id1, 16) ^ parseInt(id2, 16);

        // Count how many leading bits are 0 (i.e., match between IDs)
        return xorResult.toString(2).padStart(16, '0').match(/^0*/)[0];
    }

    /**
     * Compares two peer IDs to determine which is closer to this peer's ID.
     * Lower XOR value means closer distance.
     */
    compareDistance(id1, id2) {
        return parseInt(id1, 16) < parseInt(id2, 16);
    }

    /**
     * Given a list of peers, tries to insert all of them into appropriate buckets.
     * Typically called when receiving a Hello or Welcome message.
     */
    refreshBuckets(peers) {
        peers.forEach(peer => {
            this.pushBucket(peer);
        });
        this.printTable();
    }

    /**
     * Returns an array of all non-null peers currently stored in the routing table.
     */
    getPeers() {
        return this.kBuckets.filter(p => p !== null);
    }

    /**
     * Prints the contents of each bucket in the DHT routing table.
     */
    printTable() {
        console.log("Current DHT Table:");
        this.kBuckets.forEach((peer, index) => {
            if (peer) {
                console.log(`Bucket ${index}: ${peer.name} [${peer.id}] at ${peer.ip}:${peer.port}`);
            } else {
                console.log(`Bucket ${index}: ---`);
            }
        });
    }

    /**
     * Iterates through all peers and sends a heartbeat message.
     * If no response is received after 3 attempts, the peer is removed from the bucket.
     */
    sendHeartbeats() {
        this.kBuckets.forEach((peer, index) => {
            if (!peer) return;  // Skip empty buckets

            // Create a new TCP client to connect to the peer
            const client = new net.Socket();

            // Attempt to connect and send heartbeat
            client.connect(peer.port, peer.ip, () => {
                const heartbeat = kPTP.createMessage(5, this.peer);  // Create heartbeat message
                client.write(heartbeat);  // Send message
                client.end();  // Close connection after writing
            });

            // If an error occurs (e.g., peer is unreachable), track the failure
            client.on('error', () => {
                // Increment missed heartbeat count
                this.heartbeatMisses[peer.id] = (this.heartbeatMisses[peer.id] || 0) + 1;
                const missed = this.heartbeatMisses[peer.id];

                console.log(`[HEARTBEAT] Missed heartbeat for ${peer.name} (${missed}/3)`);

                // If the peer has missed 3 heartbeats, remove them from the bucket
                if (missed >= 3) {
                    console.log(`[HEARTBEAT] Removing peer ${peer.name} [${peer.id}] from bucket ${index}`);
                    this.kBuckets[index] = null;  // Clear the slot
                    delete this.heartbeatMisses[peer.id];  // Stop tracking misses
                }
            });

            // When a heartbeat reply is received, reset missed counter to 0
            client.on('data', (data) => {
                const message = kPTP.parseMessage(data.toString());
                if (message && message.type === 5) {
                    this.heartbeatMisses[peer.id] = 0;
                }
            });
        });
    }
}

module.exports = RoutingTable;
