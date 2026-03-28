# Systematic Debugging & Root Cause Analysis

## When to use this skill
Activate this skill automatically when the user reports a bug, a stack trace, a Phaser physics `NaN` error, or when a Socket.io event fails to fire.

## The Debugging Workflow
Do NOT immediately rewrite large chunks of code or guess the fix. Follow this exact 4-step process:

1. **Isolate the Pipeline Layer:** Determine where the failure is occurring. Is it:
   - The Browser Web Audio API capture?
   - The Gemini API JSON response?
   - The Socket.io payload transmission?
   - The Phaser 3 rendering/physics?
2. **Trace:** Write lightweight `console.log()` statements to inject into the suspected layer to verify data shapes. 
3. **Verify Constraints:** Check if the bug violates the rules in `01-global-stack.md` or `03-netcode.md` (e.g., is the server trying to calculate physics instead of the client?).
4. **Targeted Fix:** Provide the absolute minimum viable code change to resolve the issue. Do not refactor surrounding working code.
