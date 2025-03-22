const net = require('net');
const kPTP = require('./kPTP');
class RoutingTable {
    constructor(peer) {
        this.peer = peer;
        this.kBuckets = Array(16).fill(null);
        this.heartbeatMisses = {}; //key = peer.id, value = # of missed heartbeats
    }

    pushBucket(newPeer) {
        let sharedPrefix = this.getSharedPrefix(this.peer.id, newPeer.id);
        let bucketIndex = Math.min(sharedPrefix.length, this.kBuckets.length - 1);;

        if (!this.kBuckets[bucketIndex]) {
            this.kBuckets[bucketIndex] = newPeer;
            console.log(`Added peer ${newPeer.name} [${newPeer.id}] to bucket ${bucketIndex}`);
        } else {
            console.log(`Bucket ${bucketIndex} full, comparing distances`);
            let existingPeer = this.kBuckets[bucketIndex];
            let keepPeer = this.compareDistance(existingPeer.id, newPeer.id) ? existingPeer : newPeer;
            this.kBuckets[bucketIndex] = keepPeer;
            console.log(`Kept ${keepPeer.name} [${keepPeer.id}] in bucket ${bucketIndex}`);
        }
    }

    /**
     * Calculates the shared prefix length between two peer IDs.
     */
    getSharedPrefix(id1, id2) {
        let xorResult = parseInt(id1, 16) ^ parseInt(id2, 16);
        return xorResult.toString(2).padStart(16, '0').match(/^0*/)[0]; // Count leading zeros
    }

    compareDistance(id1, id2) {
        return parseInt(id1, 16) < parseInt(id2, 16); // Closer distance means smaller XOR result
    }

    refreshBuckets(peers) {
        peers.forEach(peer => {
            this.pushBucket(peer);
        });
        this.printTable();
    }

    getPeers() {
        return this.kBuckets.filter(p => p !== null);
    }

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


    sendHeartbeats() {
        this.kBuckets.forEach((peer, index) => {
            if (!peer) return;
    
            const client = new net.Socket();
    
            client.connect(peer.port, peer.ip, () => {
                const heartbeat = kPTP.createMessage(5, this.peer);
                client.write(heartbeat);
                client.end();
            });
    
            client.on('error', () => {
                // If connection fails, increment missed count
                this.heartbeatMisses[peer.id] = (this.heartbeatMisses[peer.id] || 0) + 1;
                const missed = this.heartbeatMisses[peer.id];
    
                console.log(`[HEARTBEAT] Missed heartbeat for ${peer.name} (${missed}/3)`);
    
                if (missed >= 3) {
                    console.log(`[HEARTBEAT] Removing peer ${peer.name} [${peer.id}] from bucket ${index}`);
                    this.kBuckets[index] = null;
                    delete this.heartbeatMisses[peer.id];
                }
            });
    
            client.on('data', (data) => {
                const message = kPTP.parseMessage(data.toString());
                if (message && message.type === 5) {
                    // Heartbeat response received: reset missed counter
                    this.heartbeatMisses[peer.id] = 0;
                }
            });
        });
    }
    
    
}

module.exports = RoutingTable;
