// Shared WebRTC ICE config with Metered.ca Global Anycast TURN relay + Google Global STUN
const ICE_CONFIG = {
  iceServers: [
    // 1. Google Edge STUN (Fast direct P2P discovery worldwide)
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302"
      ],
    },
    // 2. Metered Global STUN (Anycast)
    {
      urls: "stun:global.relay.metered.ca:80",
    },
    // 3. Metered Global Anycast TURN (Routes to nearest regional edge via Geo-DNS)
    {
      urls: "turn:global.relay.metered.ca:80?transport=udp",
      username: "09655e50c631521390b28117",
      credential: "80bbUxe9CA/X07cd",
    },
    {
      urls: "turn:global.relay.metered.ca:443?transport=udp",
      username: "09655e50c631521390b28117",
      credential: "80bbUxe9CA/X07cd",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "09655e50c631521390b28117",
      credential: "80bbUxe9CA/X07cd",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "09655e50c631521390b28117",
      credential: "80bbUxe9CA/X07cd",
    },
    // 4. Metered Standard (North American) Fallback
    {
      urls: "turn:standard.relay.metered.ca:80?transport=udp",
      username: "09655e50c631521390b28117",
      credential: "80bbUxe9CA/X07cd",
    },
    {
      urls: "turns:standard.relay.metered.ca:443?transport=tcp",
      username: "09655e50c631521390b28117",
      credential: "80bbUxe9CA/X07cd",
    },
  ],
  iceCandidatePoolSize: 4
};

function round1(n) {
  return typeof n === "number" ? Math.round(n * 10) / 10 : 0;
}

function parsePlayerData(player) {
  return {
    position: { x: round1(player.body.position.x), y: round1(player.body.position.y) },
    velocity: { x: round1(player.body.velocity.x), y: round1(player.body.velocity.y) },
    id: player.body.id,
    direction: player.direction,
    keys: player.keys,
    frame: player.frame,
    color: player.color,
    scale: player.scale,
    ready: player.ready,
    shields: player.hasShield,
    dead: player.dead,
  };
}

function setPlayerWithData(player, data, updatePhysics = true) {
  if (!player || !player.body || !data) return;

  if (updatePhysics && data.position) {
    const cur = player.body.position;
    const dx = data.position.x - cur.x;
    const dy = data.position.y - cur.y;
    const distSq = dx * dx + dy * dy;

    // Hard-snap on large jumps (spawns, teleports, level transitions > 65px)
    if (distSq > 4225) {
      Matter.Body.setPosition(player.body, data.position);
      if (data.velocity) {
        Matter.Body.setVelocity(player.body, data.velocity);
      }
    } else if (distSq > 0.04) {
      // Smooth lerp interpolation to eliminate high-frequency micro-twitching
      const lerp = 0.45;
      Matter.Body.setPosition(player.body, {
        x: cur.x + dx * lerp,
        y: cur.y + dy * lerp
      });
      if (data.velocity) {
        Matter.Body.setVelocity(player.body, {
          x: player.body.velocity.x * (1 - lerp) + data.velocity.x * lerp,
          y: player.body.velocity.y * (1 - lerp) + data.velocity.y * lerp
        });
      }
    }

    if (data.direction !== undefined) {
      player.direction = data.direction;
    }
  }

  if (data.keys) {
    player.updateKeys(data.keys);
  }
  if (data.color) player.color = data.color;
  if (data.frame) player.frame = data.frame;
  if (data.ready !== undefined) player.ready = data.ready;
  if (data.shields) player.hasShield = data.shields;
  if (data.dead !== undefined) player.dead = data.dead;
  if (typeof player.setScale === "function" && data.scale) {
    player.setScale(data.scale);
  }
}

const SIGNAL_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:5px;flex-shrink:0;"><rect x="2" y="16" width="3.5" height="5" rx="1"></rect><rect x="8" y="12" width="3.5" height="9" rx="1"></rect><rect x="14" y="7" width="3.5" height="14" rx="1"></rect><rect x="20" y="2" width="3.5" height="19" rx="1"></rect></svg>';

function updateNetworkHUD(rtt) {
  const el = document.getElementById("netStatsBadge");
  if (!el) return;
  el.style.display = "flex";
  if (rtt === 0) {
    el.innerHTML = `${SIGNAL_ICON}<span style="font-weight:700;color:#4ade80">0ms</span>`;
    return;
  }
  if (rtt === null || rtt === undefined) {
    el.innerHTML = `${SIGNAL_ICON}<span style="font-weight:700;color:#94a3b8">--ms</span>`;
    return;
  }
  const rttNum = Math.round(rtt);
  let color = "#4ade80"; // green
  if (rttNum >= 250) {
    color = "#f87171"; // red
  } else if (rttNum >= 100) {
    color = "#fbbf24"; // yellow
  }
  el.innerHTML = `${SIGNAL_ICON}<span style="font-weight:700;color:${color}">${rttNum}ms</span>`;
}

async function inspectPeerConnection(pc, callback) {
  if (!pc || !pc.getStats) return;
  try {
    const stats = await pc.getStats();
    let selectedPair = null;
    stats.forEach(report => {
      if (report.type === "transport" && report.selectedCandidatePairId) {
        selectedPair = stats.get(report.selectedCandidatePairId);
      } else if (report.type === "candidate-pair" && (report.selected || report.nominated || (report.state === "succeeded" && report.writable))) {
        if (!selectedPair || report.currentRoundTripTime !== undefined) {
          selectedPair = report;
        }
      }
    });

    if (selectedPair) {
      const local = stats.get(selectedPair.localCandidateId);
      const remote = stats.get(selectedPair.remoteCandidateId);
      const isRelay = (local && local.candidateType === "relay") || (remote && remote.candidateType === "relay");
      const rttMs = selectedPair.currentRoundTripTime !== undefined
        ? Math.round(selectedPair.currentRoundTripTime * 1000)
        : null;
      callback({
        rtt: rttMs,
        isRelay: isRelay,
        type: isRelay ? "TURN Relay" : "Direct P2P"
      });
    }
  } catch (e) {}
}

const LEVEL_ORDER = [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "tweleve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"
];

function levelToNumber(name) {
  const idx = LEVEL_ORDER.indexOf(name);
  return idx !== -1 ? (idx + 1) : 1;
}

function numberToLevel(num) {
  const idx = Math.max(1, Math.min(LEVEL_ORDER.length, parseInt(num, 10) || 1)) - 1;
  return LEVEL_ORDER[idx] || "one";
}

function levelDisplayName(name) {
  const num = levelToNumber(name);
  return "Level " + num;
}

function saveRoomProgress(code, levelName) {
  if (!code || !levelName) return;
  const cleanCode = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  if (!cleanCode) return;
  const key = "pico_save_" + cleanCode;
  let current = {};
  try {
    current = JSON.parse(localStorage.getItem(key) || "{}");
  } catch (e) {}

  const newIdx = LEVEL_ORDER.indexOf(levelName);
  const highestIdx = LEVEL_ORDER.indexOf(current.highestLevel || "one");
  const highestLevel = (newIdx > highestIdx) ? levelName : (current.highestLevel || levelName);

  const saveData = {
    code: cleanCode,
    currentLevel: levelName,
    highestLevel: highestLevel,
    updatedAt: Date.now()
  };
  try {
    localStorage.setItem(key, JSON.stringify(saveData));

    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem("pico_recent_rooms") || "[]");
    } catch (e) {}
    if (!Array.isArray(recent)) recent = [];
    recent = recent.filter(r => r !== cleanCode);
    recent.unshift(cleanCode);
    if (recent.length > 8) recent = recent.slice(0, 8);
    localStorage.setItem("pico_recent_rooms", JSON.stringify(recent));
  } catch (e) {}
}

function getRoomProgress(code) {
  if (!code) return null;
  const cleanCode = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  try {
    const raw = localStorage.getItem("pico_save_" + cleanCode);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

