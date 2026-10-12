const { GoogleGenerativeAI } = require('@google/generative-ai');

function getGeminiModel() {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'your-gemini-api-key-here') return null;
    try {
        const genAI = new GoogleGenerativeAI(key);
        return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch {
        return null;
    }
}

// Fallback logic for when AI key is missing or offline
function fallbackNoticeAssist(action, input) {
    const text = input.text || '';
    const title = input.title || '';

    switch (action) {
        case 'generate':
            return {
                title: title || 'Important Campus Announcement',
                content: `📢 Official Announcement\n\n${text}\n\nKey Highlights:\n• Please review all instructions carefully.\n• Reach out to your department coordinator for queries.\n• Adhere to all specified schedules.`,
                category: 'General announcement',
                extractedDeadlines: ['Check portal for exact dates']
            };
        case 'polish':
            return {
                polishedText: text
                    .split('\n')
                    .map(line => line.trim())
                    .filter(Boolean)
                    .map(line => line.charAt(0).toUpperCase() + line.slice(1))
                    .join('\n\n')
            };
        case 'suggest_title':
            return {
                titles: [
                    title ? `Official Update: ${title}` : 'Urgent Department Notice',
                    title ? `Important Briefing on ${title}` : 'Campus Circular & Guidelines',
                    title ? `Action Required: ${title}` : 'Academic & Administrative Notice'
                ]
            };
        case 'summarize':
            const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
            return {
                summary: sentences.slice(0, 3).map(s => `• ${s}.`).join('\n') || '• No summary available.'
            };
        case 'extract_dates':
            const dateRegex = /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/gi;
            const matches = text.match(dateRegex) || [];
            return {
                dates: matches.length ? matches : ['No explicit dates detected. Please verify dates manually.']
            };
        case 'social_caption':
            return {
                caption: `🚨 *CAMPUS UPDATE* 🚨\n\n📌 *${title || 'Important Notice'}*\n\n${text.slice(0, 150)}...\n\n👉 Read complete circular on CampusAI portal.`
            };
        case 'event_description':
            return {
                description: `Join us for an engaging and hands-on session on ${title || 'Campus Event'}. Learn key industry insights, connect with mentors, and collaborate with peers.\n\nEvent Agenda:\n• Keynote & Welcome Address\n• Deep Dive Technical Session\n• Q&A and Networking`,
                category: 'Workshop'
            };
        default:
            return { result: text };
    }
}

async function runAIAssistant(action, input) {
    const model = getGeminiModel();
    if (!model) {
        return { success: true, aiPowered: false, ...fallbackNoticeAssist(action, input) };
    }

    try {
        let systemPrompt = '';
        if (action === 'generate') {
            systemPrompt = `You are CampusAI's official writing assistant. Convert these rough bullet points into a professional, welcoming campus notice. Do NOT invent dates, venues, or contact details not provided.
Input text: "${input.text}"
Return ONLY valid JSON: {"title": "suggested title", "content": "full formatted notice text", "category": "Academic"}`;
        } else if (action === 'polish') {
            systemPrompt = `Improve the grammar, tone, and professional formatting of this college announcement. Keep all factual dates and links intact.
Input text: "${input.text}"
Return ONLY valid JSON: {"polishedText": "polished text"}`;
        } else if (action === 'suggest_title') {
            systemPrompt = `Suggest 3 clear, professional, and attention-grabbing titles for this college notice.
Notice content: "${input.text}"
Return ONLY valid JSON: {"titles": ["title 1", "title 2", "title 3"]}`;
        } else if (action === 'summarize') {
            systemPrompt = `Summarize this lengthy college circular into 3 concise bullet points for busy students.
Input text: "${input.text}"
Return ONLY valid JSON: {"summary": "• Point 1\\n• Point 2\\n• Point 3"}`;
        } else if (action === 'extract_dates') {
            systemPrompt = `Extract all dates, deadlines, and time schedules mentioned in this notice text.
Input text: "${input.text}"
Return ONLY valid JSON: {"dates": ["Date 1", "Date 2"]}`;
        } else if (action === 'social_caption') {
            systemPrompt = `Create a WhatsApp / Instagram broadcast caption with emojis for this campus notice.
Title: "${input.title}"
Content: "${input.text}"
Return ONLY valid JSON: {"caption": "broadcast text"}`;
        } else if (action === 'event_description') {
            systemPrompt = `Generate a compelling, student-focused event description and suggest category.
Event Title: "${input.title}"
Details: "${input.text}"
Return ONLY valid JSON: {"description": "full event description", "category": "Workshop"}`;
        }

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return { success: true, aiPowered: true, ...parsed };
    } catch (err) {
        console.warn('[aiAssistant] Gemini failed or invalid response, falling back:', err.message);
        return { success: true, aiPowered: false, ...fallbackNoticeAssist(action, input) };
    }
}

module.exports = {
    runAIAssistant
};
