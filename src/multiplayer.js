// Shared WebRTC ICE config: STUN for direct paths + TURN relay (needs your credentials in turn-config.js)
// for players on different networks / mobile data (symmetric NAT).
const ICE_CONFIG = (function () {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ];
  const t = window.TURN_CONFIG;
  if (t && t.username && t.credential) {
    ['turn:standard.relay.metered.ca:80',
     'turn:standard.relay.metered.ca:80?transport=tcp',
     'turn:standard.relay.metered.ca:443',
     'turns:standard.relay.metered.ca:443?transport=tcp'
    ].forEach(u => servers.push({ urls: u, username: t.username, credential: t.credential }));
  } else {
    console.warn('No TURN credentials set in src/turn-config.js - cross-network play may fail.');
  }
  return { iceServers: servers, iceCandidatePoolSize: 4 };
})();

function parsePlayerData(player) {
  return {
    position: player.body.position,
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
    Matter.Body.setPosition(player.body, data.position);
    player.direction = data.direction;
  }
  if (!window.hostConnection && data.keys) {
    player.updateKeys(data.keys);
  }
  player.color = data.color;
  player.frame = data.frame;
  player.ready = data.ready;
  player.hasShield = data.shields;
  player.dead = data.dead;
  if (typeof player.setScale === "function" && data.scale) {
    player.setScale(data.scale);
  }
}
