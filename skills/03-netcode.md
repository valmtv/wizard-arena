# Socket.io Multiplayer Rules

## Architecture
- The Server is an "Authoritative Relay." It does not run physics calculations. It only receives state and broadcasts it.
- The Client handles all movement, collision detection, and audio processing.

## Event Dictionary
Strictly adhere to these event names:
1. `PLAYER_JOINED`: Server -> Client (assigns socket ID).
2. `STATE_UPDATE`: Client -> Server (sends current X/Y/Velocity).
3. `BROADCAST_STATE`: Server -> Client (syncs positions).
4. `SPELL_CAST`: Client -> Server (sends payload: `{ spell, x, y, angle, scale }`).
5. `BROADCAST_SPELL`: Server -> Client (triggers remote render).

## Error Handling
- Listen for `connect_error` and `disconnect` events on both client and server, and handle them gracefully with console logs.
