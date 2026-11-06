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
    position: { x: player.body.position.x, y: player.body.position.y },
    velocity: { x: player.body.velocity.x, y: player.body.velocity.y },
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
