# Wizard Arena | Project Tech Status

| **Technology** | **Status** | **Role** | **Integration Plan** |
| :--- | :--- | :--- | :--- |
| **Antigravity** | ✅ Active | High-speed AI pair programming and codebase management. | Already powering this development loop. |
| **Gemini Live API** | ✅ Integrated | Real-time multimodal (audio/video) understanding and generation. | Current use in `audio.js` handles transcription; upgrade to **Live API** for streaming latency. |
| **TypeGPU** | ⚠️ Partial | Type-safe WebGPU development for complex simulations and graphics. | `npm install @typegpu/core`; refactor `bg-shader.js` to use TypeGPU's reactive uniform buffers. |
| **Fishjam** | ✅ Integrated | Low-latency multimedia server for real-time communication (RTC). | **Complete**: Replaced Socket.IO. Handles voice-chat tracks and ultra-low latency peer metadata sync. |
| **Smelter** | ❌ Missing | High-performance WebGPU-based video and UI compositing. | Use for "Post-Processing" layer: combine Phaser canvas and WebGPU background with bloom/blur. |
| **MediaPipe** | ❌ Missing | On-device machine learning for hand, face, and pose tracking. | Add `@mediapipe/tasks-vision` to track hand gestures ("Sigils") as a secondary spell trigger. |

---

## 🏗️ Fishjam Implementation Details

We use a **Hybrid Metadata/Track** architecture for maximum performance:
- **Server-Side**: Manages rooms and peer tokens. It maintains authoritative HP state. When a hit occurs via `/hit`, the server patches the peer's metadata via Fishjam's REST API, which automatically triggers a `peerUpdated` broadcast to all clients.
- **Client-Side**:
  - **Peer Metadata**: Synchronizes player positions, velocities, and spell triggers at ~20Hz (50ms intervals).
  - **Audio Tracks**: Publishes the local microphone stream and automatically plays incoming remote voice tracks for seamless voice chat.

### 🚀 How to Run

1.  **Prepare dependencies**:
    - Ensure Docker is running.
    - Launch the Fishjam server: `docker-compose up -d`.
2.  **Start the Game Server**:
    ```bash
    cd server
    npm install
    node server.js
    ```
3.  **Launch the Arena**:
    Open [https://localhost:3000](https://localhost:3000) in **two** separate browser tabs.
    - **Note**: You must ignore the self-signed certificate warning for WebRTC to function locally.
    - **Note**: Microphone permissions are required for both voice chat and the Gemini-powered spell casting.
