# Project 2: Real-Time Collaborative Code Editor
## Open With: VS Code
## Folder to open: Project2_CollabCodeEditor__OpenIn_VSCode

---

## How to Run

You need **two terminals** open in VS Code (use the split terminal feature).

### Terminal 1 — Start the Server
```bash
cd server
npm install
npm run dev
```
Server runs at: http://localhost:3001

### Terminal 2 — Start the React Client
```bash
cd client
npm install
npm start
```
Client runs at: http://localhost:3000

---

## How to Use
1. Open http://localhost:3000 in your browser
2. Click **Create New Room** — you'll get a unique room ID
3. Share the URL with someone else (or open it in a second browser tab)
4. Both users will see each other's edits in real time
5. Use **History** to view and restore previous versions
6. Use **Copy Link** to share the room

---

## Project Structure
```
server/
  server.js        — Socket.io + Express server, handles rooms & OT
  package.json

client/
  src/
    App.js         — Main React app (Home page + Editor room)
    App.css        — All styles
    index.js       — React entry point
  public/
    index.html
  package.json
```

## Prerequisites
- Node.js 18+ installed (https://nodejs.org)
- Run `npm install` in BOTH server/ and client/ before starting
