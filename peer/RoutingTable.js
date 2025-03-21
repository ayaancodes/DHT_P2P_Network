class RoutingTable {
    constructor(peer) {
        this.peer = peer;
        this.kBuckets = Array(16).fill(null);
    }

    pushBucket(newPeer) {
        let sharedPrefix = this.getSharedPrefix(this.peer.id, newPeer.id);
        let bucketIndex = sharedPrefix.length;

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
            }
        });
    }
}

module.exports = RoutingTable;
