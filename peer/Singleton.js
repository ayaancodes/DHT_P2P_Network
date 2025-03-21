const crypto = require('crypto');

class Singleton {
    /**
     * Generates a unique 16-bit peer ID using the Blake2s hash function.
     * ID is derived from the peer's IP address and port number.
     */
    static getPeerID(ip, port) {
        return crypto.createHash('blake2s256').update(`${ip}:${port}`).digest('hex').substring(0, 4);
    }

    /**
     * Generates a random ephemeral port number in the range of 1024-41000.
     * This ensures the peer listens on a dynamically assigned port.
     */
    static getRandomPort() {
        return Math.floor(Math.random() * 40000) + 1024;
    }
}

module.exports = Singleton;
