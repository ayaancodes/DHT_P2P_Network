class kPTP {
    static VERSION = 18;

    static createMessage(type, sender, peers = []) {
        let message = {
            version: this.VERSION,
            type: type,
            sender: {
                name: sender.name,
                ip: sender.ip,
                port: sender.port,
                id: sender.id
            },
            peers: peers.map(peer => ({
                ip: peer.ip,
                port: peer.port,
                id: peer.id
            }))
        };
        return JSON.stringify(message);
    }

    static parseMessage(message) {
        try {
            return JSON.parse(message);
        } catch (error) {
            console.error("Failed to parse message:", error);
            return null;
        }
    }
}

module.exports = kPTP;
