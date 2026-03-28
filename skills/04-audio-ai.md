# Web Audio & Gemini AI Integration Rules

## Audio Capture
- Use the native browser `navigator.mediaDevices.getUserMedia` and `MediaRecorder` API.
- **Trigger:** Start recording when the `SHIFT` key is pressed down. Stop recording when `SHIFT` is released.
- **Volume Calculation:** While recording, use an `AnalyserNode` to calculate the volume (scale of 1-100). Store the peak or average volume during the hold duration.
- **Constraint:** Drop the player's movement speed to 50% while `SHIFT` is held down.

## Gemini API Call
- Once `SHIFT` is released, convert the audio to a `Blob` (audio/webm or audio/mp3) and send it directly to the Gemini 1.5 Flash API endpoint via a standard `fetch` request.
- **System Prompt for Gemini:** The API call MUST include this exact instruction: 
  > "Listen to the audio. Determine which spell the user is trying to cast. Return ONLY a valid JSON object matching this schema: `{ "spell": "fireball" | "frostbite" | "bolt" | "nova", "backfire": boolean }`. If the user is mumbling, stuttering, or the word is unintelligible, set `backfire` to `true`. Do not wrap the output in markdown code blocks."

## Spell Scaling
- Map the calculated volume to a scale multiplier locally *after* receiving the JSON:
  - 1-50: 1.0x (Normal)
  - 51-85: 1.5x (Yelling)
  - 86-100: 2.0x (Screaming)
