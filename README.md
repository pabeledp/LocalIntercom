# LocalIntercom 🫧

A lightweight, zero-cloud local Wi-Fi intercom, peer-to-peer calling, and 80GB giant file streaming desktop application built with an **Apple 3D Liquid Lens Glass** aesthetic.

[![Download for macOS](https://img.shields.io/badge/Download-macOS_Apple_Silicon_(.dmg)-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/pabeledp/LocalIntercom/releases/download/v1.0.0/LocalIntercom-1.0.0-arm64.dmg)
[![Download ZIP](https://img.shields.io/badge/Download-Portable_ZIP-gray?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/pabeledp/LocalIntercom/releases/download/v1.0.0/LocalIntercom-1.0.0-arm64-mac.zip)
[![Release Version](https://img.shields.io/badge/Release-v1.0.0-blue?style=for-the-badge)](https://github.com/pabeledp/LocalIntercom/releases/tag/v1.0.0)

---

## ⚡ Features

- **Apple 3D Liquid Glass UI:** Curved convex liquid droplet with light refraction glint, specular highlights, and edge sheen.
- **Always-on-Top Floating Head:** Draggable bubble that magnetically snaps to the screen borders.
- **Zero-Cloud LAN Discovery:** Automatic UDP heartbeats (`255.255.255.255:41234`) discover other users on the same Wi-Fi instantly without any registration, account, or external server.
- **Ultra-Low Latency Voice Intercom:** Crystal-clear WebRTC audio stream with zero server lag.
- **Giant File Transfer (70–80GB):** Dedicated native chunked streaming engine with byte-range resume support and constant memory footprint (<50MB RAM).
- **Personal Notes & Profile:** Built-in "Note to Self" space and inline avatar/name customization.
- **Global Hotkey:** Toggle the window anytime with `Cmd/Ctrl + Shift + I`.

---

## 📥 Quick Download & Install

### Option 1: Direct DMG (Recommended)
1. Download **[LocalIntercom-1.0.0-arm64.dmg](https://github.com/pabeledp/LocalIntercom/releases/download/v1.0.0/LocalIntercom-1.0.0-arm64.dmg)**.
2. Open the `.dmg` and drag **LocalIntercom** to your **Applications** folder.
3. Launch from Launchpad or Applications.

### Option 2: Portable ZIP
1. Download **[LocalIntercom-1.0.0-arm64-mac.zip](https://github.com/pabeledp/LocalIntercom/releases/download/v1.0.0/LocalIntercom-1.0.0-arm64-mac.zip)**.
2. Extract and double-click `LocalIntercom.app`.

---

## 🛠️ Tech Stack

- **Framework:** Electron.js + Vite + TypeScript
- **Styling:** Tailwind CSS + Apple Liquid Glass Morphism
- **Signaling & Chat:** Local WebSocket Server
- **Voice Intercom:** Native WebRTC PeerConnection
- **Local Discovery:** UDP Subnet Broadcast (`dgram`)
- **File Engine:** Node.js chunked HTTP stream with range headers (HighWaterMark 8MB)

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/pabeledp/LocalIntercom.git
cd LocalIntercom

# Install dependencies
npm install

# Run development mode
npm run dev

# Build standalone macOS app & DMG installer
npm run dist
```

---

## 📄 License
ISC © [pabeledp](https://github.com/pabeledp)
