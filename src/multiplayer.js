// Shared WebRTC ICE config with Metered.ca TURN relay for cross-network & mobile data play
const ICE_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "turn:standard.relay.metered.ca:80",
      username: "09655e50c631521390b28117",
      credential: "80bbUxe9CA/X07cd",
    },
    {
      urls: "turn:standard.relay.metered.ca:80?transport=tcp",
      username: "09655e50c631521390b28117",
      credential: "80bbUxe9CA/X07cd",
    },
    {
      urls: "turn:standard.relay.metered.ca:443",
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
  if (data.keys) {
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
