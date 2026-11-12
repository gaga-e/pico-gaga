# 🐾 PICO GAGA

A real-time multiplayer cooperative puzzle-platformer web game inspired by **PICO PARK**, built with **JavaScript (Matter.js 2D Physics)** and **WebRTC (PeerJS)** for serverless peer-to-peer multiplayer.

![Screenshot](assets/imgs/favicon.png)

---

## ✨ Features
- 🎮 **Up to 6+ Players:** Play with friends online via 4-letter room codes.
- ⚡ **Zero Backend Game Server Needed:** Runs 100% peer-to-peer (P2P) over WebRTC Data Channels.
- 🧱 **Cooperative Physics:** Jump on teammates' heads (stacking), push heavy multi-player blocks, step on pressure plates, avoid hazards, and carry keys to unlock exit doors.
- 🚀 **One-Click Deploy:** Ready for instant static hosting on Vercel, Netlify, or GitHub Pages.

---

## 🕹️ Controls

| Action | Player 1 (Host/Solo) | Player 2 (Local WASD) |
| :--- | :--- | :--- |
| **Move Left / Right** | `←` `→` (Arrow Keys) | `A` `D` |
| **Jump** | `↑` (Arrow Up) | `W` |
| **Enter Door (When Open)** | `↓` (Arrow Down) | `S` |

> 💡 **Tip:** To clear a level, bring the key to the exit door, and **all living players must stand inside the open door and press DOWN (`↓` or `S`)**!

---

## 🚀 Running Locally
```bash
node server.js
```
Open [http://localhost:8080](http://localhost:8080) in your browser.
