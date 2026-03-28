# Hackathon Integration & Code Review

## When to use this skill
Activate this skill when the user is merging two distinct parts of the codebase (e.g., connecting the Gemini Audio API output to the Phaser game input, or wiring the Phaser game to the Node.js Server).

## Integration Checkpoints
Before approving any integration or writing bridge code, verify the following:

1. **API to Game Bridge:** Does the JSON schema from the Gemini API `{"spell": string, "backfire": boolean}` perfectly match the data expected by the Phaser casting function?
2. **Game to Server Bridge:** Does the Socket.io `SPELL_CAST` emit payload perfectly match the data expected by the Node.js server to broadcast?
3. **Zero Build-Step Verification:** Because this project uses no build tools (No Webpack/Vite), verify that all HTML `<script>` tags use proper `.js` extensions and valid relative paths between the `/client` files.
4. **Error Boundaries:** Ensure that if Player 2 disconnects, or if Gemini returns a malformed JSON string, the client `try/catch` blocks handle it without crashing the Phaser update loop.
