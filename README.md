# 🔗 DHT_P2P_Network

A Node.js implementation of a **Distributed Hash Table (DHT)**-based peer-to-peer (P2P) network. Each peer joins the network, maintains a routing table with other peers, and exchanges heartbeat signals to monitor liveness.

---

## 📦 Features

- ⚡ Peer bootstrapping with a Hello-Welcome handshake
- 📡 16-slot routing table using **Kademlia-style bucket logic**
- ❤️ Heartbeat protocol with failure detection & eviction
- 🧠 XOR-based peer distance comparison for intelligent peer selection
- 📘 Logs include timestamps, join/leave events, heartbeat status

---

## 🛠 Prerequisites

- Node.js (v16+ recommended)
- Terminal or command line with support for multiple concurrent peer windows

---

## 🚀 Getting Started

1. **Clone the repo**
   ```bash
   git clone <your-repo-url>
   cd DHT_P2P_Network
   ```

2. **Install dependencies**
   *(If you later add any npm packages like colors or dotenv, do it here. Currently, no external deps.)*

3. **Start the first peer (bootstrap node)**
   ```bash
   node DHTPeer.js -n Peer1
   ```

4. **Start additional peers by connecting to an existing peer's IP and port**

   For example, if `Peer1` is listening on `127.0.0.1:34567`, run:

   ```bash
   node DHTPeer.js -n Peer2 -p 127.0.0.1:34567
   node DHTPeer.js -n Peer3 -p 127.0.0.1:34567
   ```

   Each peer is assigned:
   - A unique ephemeral port
   - A deterministic 16-bit ID (based on its IP:port)
   - A routing table of up to 16 other peers

---

## 💬 Message Types

- **Type 4 (Hello)**: Sent when a peer joins to announce itself.
- **Type 2 (Welcome)**: Response from an existing peer including its known peers.
- **Type 5 (Heartbeat)**: Periodic signal sent every 5 seconds to confirm liveness.

---

## 📊 Routing Table

- Internally contains `16 buckets`, indexed by shared prefix length between peer IDs.
- Peers are inserted or replaced using XOR distance logic.
- Example log:
  ```
  Bucket 0: Peer2 [a1b2] at 127.0.0.1:3000
  Bucket 1: ---
  ...
  ```

---

## 🔁 Heartbeats

- Each peer sends heartbeat messages every **5 seconds** to all known peers.
- On failure to reach a peer:
  - A miss counter increases
  - After **3 missed heartbeats**, the peer is **evicted** from the table
- Heartbeat logs:
  ```
  [HEARTBEAT] Sent to Peer2 [a1b2] at 12:04:30
  [HEARTBEAT] Missed heartbeat for Peer2 (1/3)
  ```

---

## 🧪 Testing Tips

- Run peers in different terminals.
- Monitor logs to watch:
  - Peer joins
  - Bucket placements
  - Heartbeat send/receive
  - Peer removal after timeout

---

## 🧰 Useful Commands

To simulate 4 peers:
```bash
# Terminal 1
node DHTPeer.js -n Peer1

# Terminal 2
node DHTPeer.js -n Peer2 -p 127.0.0.1:<peer1-port>

# Terminal 3
node DHTPeer.js -n Peer3 -p 127.0.0.1:<peer1-port>

# Terminal 4
node DHTPeer.js -n Peer4 -p 127.0.0.1:<peer1-port>
```

---

## 🧩 Future Improvements

- 🌐 Cross-machine support (currently limited to localhost)
- 🖼 Python visualizer for DHT table structure
- 🧪 Unit tests for routing logic
- 🛠 CLI to query peers or broadcast messages

---

## 📁 File Structure

```bash
.
├── DHTPeer.js         # Main peer entry point
├── RoutingTable.js    # DHT logic with buckets and heartbeat
├── kPTP.js            # Peer-to-peer message format
├── Singleton.js       # Utilities for ID and port generation
└── README.md
```

---

## 👨‍💻 Author

Made with 💻 by Ayaan Munshi (Western University) for SE3314.
