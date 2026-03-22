import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import './App.css';

const SERVER_URL = 'http://localhost:3001';

// ── Editor Room ────────────────────────────────────────────────
function EditorRoom() {
  const { roomId } = useParams();
  const [socket, setSocket] = useState(null);
  const [code, setCode] = useState('// Loading...');
  const [users, setUsers] = useState([]);
  const [language, setLanguage] = useState('javascript');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [connected, setConnected] = useState(false);
  const isRemoteChange = useRef(false);

  const userName = useRef(`User-${Math.floor(Math.random() * 1000)}`);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join_room', { roomId, userName: userName.current });
    });

    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('init', (data) => {
      isRemoteChange.current = true;
      setCode(data.document);
      setUsers(data.users);
      setLanguage(data.language || 'javascript');
      isRemoteChange.current = false;
    });

    newSocket.on('user_joined', (user) => {
      setUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
    });

    newSocket.on('user_left', (userId) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
    });

    newSocket.on('operation', ({ operation }) => {
      isRemoteChange.current = true;
      setCode(operation.text);
      isRemoteChange.current = false;
    });

    newSocket.on('language_changed', ({ language }) => {
      setLanguage(language);
    });

    newSocket.on('history', (h) => setHistory(h));

    return () => newSocket.close();
  }, [roomId]);

  const handleEditorChange = (value) => {
    if (isRemoteChange.current) return;
    setCode(value);
    if (socket) {
      socket.emit('operation', { roomId, operation: { text: value } });
    }
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    if (socket) socket.emit('language_change', { roomId, language: lang });
  };

  const loadHistory = () => {
    if (socket) socket.emit('get_history', { roomId });
    setShowHistory(true);
  };

  const rollback = (index) => {
    if (socket) socket.emit('rollback', { roomId, index });
    setShowHistory(false);
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">CollabCode</span>
          <span className="room-badge">Room: {roomId}</span>
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
        </div>

        <div className="users">
          {users.map(u => (
            <span key={u.id} className="user-tag" style={{ borderColor: u.color, color: u.color }}>
              {u.name}
            </span>
          ))}
        </div>

        <div className="header-right">
          <select value={language} onChange={handleLanguageChange} className="lang-select">
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="csharp">C#</option>
            <option value="java">Java</option>
            <option value="typescript">TypeScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="sql">SQL</option>
          </select>
          <button onClick={loadHistory} className="btn-secondary">History</button>
          <button onClick={copyRoomLink} className="btn-secondary">Copy Link</button>
        </div>
      </header>

      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <span>Version History ({history.length} snapshots)</span>
            <button onClick={() => setShowHistory(false)} className="btn-close">✕</button>
          </div>
          <div className="history-list">
            {history.map((h, i) => (
              <div key={i} className="history-item">
                <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                <span>{h.text.substring(0, 60)}...</span>
                <button onClick={() => rollback(i)} className="btn-rollback">Restore</button>
              </div>
            ))}
            {history.length === 0 && <p className="no-history">No history yet.</p>}
          </div>
        </div>
      )}

      <Editor
        height={showHistory ? '70vh' : '90vh'}
        language={language}
        value={code}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
        }}
      />
    </div>
  );
}

// ── Home / Landing ─────────────────────────────────────────────
function Home() {
  const [roomId, setRoomId] = useState('');

  const createRoom = () => {
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    window.location.href = `/room/${newRoom}`;
  };

  const joinRoom = () => {
    if (roomId.trim()) window.location.href = `/room/${roomId.trim().toUpperCase()}`;
  };

  return (
    <div className="home">
      <div className="home-card">
        <h1 className="home-title">CollabCode</h1>
        <p className="home-subtitle">Real-time collaborative code editor</p>

        <button onClick={createRoom} className="btn-primary">
          + Create New Room
        </button>

        <div className="divider"><span>or join existing</span></div>

        <div className="join-row">
          <input
            type="text"
            placeholder="Enter Room ID (e.g. ABC123)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            className="room-input"
          />
          <button onClick={joinRoom} className="btn-join">Join</button>
        </div>

        <div className="features">
          <div className="feature">Real-time sync</div>
          <div className="feature">Multi-language</div>
          <div className="feature">Version history</div>
          <div className="feature">Live cursors</div>
        </div>
      </div>
    </div>
  );
}

// ── App Router ─────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<EditorRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
