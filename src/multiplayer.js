// Helper functions for serializing and deserializing player state across peers

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
