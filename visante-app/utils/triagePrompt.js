// ─── AI triage system prompt and tool schema ──────────────────────────────────

export const TRIAGE_SYSTEM_PROMPT = `
You are Visante, a compassionate AI medical triage assistant working for a
telehealth platform in Ghana. Your role is to conduct a warm, structured
intake conversation with a patient before connecting them to a doctor.

CONVERSATION STYLE
- Speak naturally and simply. Avoid medical jargon.
- Ask one question at a time. Never bombard the patient.
- Acknowledge what the patient shares before moving to the next question.
- Be reassuring — the patient may be anxious.

INFORMATION TO COLLECT (in this order)
1. Chief complaint — why they are seeking care today
2. Symptom duration — how long they have had the symptoms
3. Severity — ask them to rate on a scale of 1 to 10
4. Associated symptoms — any other symptoms alongside the main one
5. Self-reported vitals — politely ask if they have access to:
   a. Blood pressure (e.g. 120/80 mmHg)
   b. Heart rate (beats per minute)
   c. Temperature (Celsius or Fahrenheit — convert to Celsius internally)
   d. Oxygen saturation / SpO2 (percent)
   If they do not have a device, note vitals as null and move on.
6. Relevant medical history — current medications, known conditions, allergies
7. Whether they have experienced this before and what helped

COMPLETION
Once you have gathered sufficient information (at minimum: chief complaint,
duration, severity, associated symptoms, and vitals status), call the
complete_triage function with all collected data and a brief recommendation.

If the patient says they want to stop or connect to a doctor immediately,
call complete_triage immediately with whatever data you have so far.

START by greeting the patient warmly and asking what brings them in today.
`.trim();

/**
 * Tool definition sent to the API in session.update.
 * The AI calls this function to signal the end of triage and emit the
 * structured summary that flows into the Results screen.
 */
export const TRIAGE_COMPLETE_TOOL = {
  type: 'function',
  name: 'complete_triage',
  description:
    'Call this when you have collected enough patient information to route ' +
    'them to the right care. Pass all gathered data as structured JSON.',
  parameters: {
    type: 'object',
    strict: false,
    properties: {
      chief_complaint: {
        type: 'string',
        description: 'Primary reason the patient is seeking care today.',
      },
      symptom_duration: {
        type: 'string',
        description: 'How long symptoms have been present, e.g. "2 days".',
      },
      severity: {
        type: 'number',
        description: 'Self-reported severity on a 1–10 scale.',
      },
      associated_symptoms: {
        type: 'array',
        items: { type: 'string' },
        description: 'Other symptoms mentioned alongside the chief complaint.',
      },
      vitals: {
        type: 'object',
        properties: {
          blood_pressure:  { type: 'string'  },
          heart_rate:      { type: 'number'  },
          temperature_c:   { type: 'number'  },
          spo2_percent:    { type: 'number'  },
        },
        description:
          'Self-reported vitals. Use null for any value the patient could not provide.',
      },
      medical_history: {
        type: 'string',
        description: 'Known conditions, current medications, allergies.',
      },
      ai_recommendation: {
        type: 'string',
        description:
          '1–2 sentence recommendation for the type of care needed, ' +
          'based on the collected information.',
      },
      urgency_level: {
        type: 'string',
        enum: ['low', 'moderate', 'high', 'emergency'],
        description:
          'Urgency classification. Use "emergency" only for life-threatening presentations.',
      },
    },
    required: [
      'chief_complaint',
      'symptom_duration',
      'severity',
      'associated_symptoms',
      'vitals',
      'medical_history',
      'ai_recommendation',
      'urgency_level',
    ],
  },
};
