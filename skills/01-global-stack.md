# Global Stack & Architecture Constraints

## Core Mandate
You are building a real-time multiplayer MVP in a 5.5-hour hackathon. Speed, simplicity, and robust error handling are your highest priorities. 

## Project Structure
- Monorepo format.
- `/client`: Frontend code. Strictly Vanilla HTML, CSS, and standard ES Modules (`.js`). 
- `/server`: Backend code. Node.js with Express and Socket.io.
- **CRITICAL:** Do NOT introduce build tools (Webpack, Vite, Babel, TypeScript). Use CDN links for external frontend libraries. 

## Code Style
- Use modern ES6+ syntax (async/await, arrow functions, destructuring).
- Do not over-engineer. Avoid abstract design patterns unless absolutely necessary for the game state.
- Every major function must have a `try/catch` block with a highly descriptive `console.error` (e.g., `console.error('[Audio Capture Error]:', err)`).
