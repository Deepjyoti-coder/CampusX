const { GoogleGenerativeAI } = require('@google/generative-ai');

const WEIGHTS = {
    category: 0.25,
    description: 0.35,
    location: 0.20,
    date: 0.10,
    color: 0.10
};

// Common synonym / token groups for semantic normalization
const SEMANTIC_CLUSTERS = [
    ['headphones', 'earphones', 'earbuds', 'headset', 'airpods', 'audio', 'earpiece'],
    ['laptop', 'notebook', 'macbook', 'charger', 'adapter', 'cable'],
    ['wallet', 'purse', 'money', 'cardholder', 'billfold'],
    ['id card', 'id', 'identity', 'student card', 'smart card', 'badge', 'hall ticket'],
    ['backpack', 'bag', 'rucksack', 'knapsack', 'tote', 'duffel'],
    ['bottle', 'sipper', 'flask', 'thermos', 'tumbler'],
    ['watch', 'smartwatch', 'band', 'fitbit', 'timepiece'],
    ['phone', 'mobile', 'smartphone', 'iphone', 'android', 'handset'],
    ['keys', 'keychain', 'bike key', 'car key', 'room key'],
    ['calculator', 'scientific calculator', 'fx991es', 'casio']
];

function tokenize(str) {
    if (!str) return new Set();
    return new Set(
        str.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2)
    );
}

function calculateJaccard(tokensA, tokensB) {
    if (!tokensA.size || !tokensB.size) return 0;
    let intersection = 0;
    for (const t of tokensA) {
        if (tokensB.has(t)) intersection++;
    }
    const union = tokensA.size + tokensB.size - intersection;
    return union > 0 ? intersection / union : 0;
}

function checkSemanticGroupOverlap(textA, textB) {
    const lowerA = (textA || '').toLowerCase();
    const lowerB = (textB || '').toLowerCase();
    for (const cluster of SEMANTIC_CLUSTERS) {
        const hasA = cluster.some(w => lowerA.includes(w));
        const hasB = cluster.some(w => lowerB.includes(w));
        if (hasA && hasB) return true;
    }
    return false;
}

function compareDates(dateA, dateB) {
    if (!dateA || !dateB) return 0.5;
    const diffHours = Math.abs(new Date(dateA) - new Date(dateB)) / (1000 * 60 * 60);
    if (diffHours <= 24) return 1.0;
    if (diffHours <= 72) return 0.8;
    if (diffHours <= 168) return 0.5; // within 1 week
    if (diffHours <= 336) return 0.2; // within 2 weeks
    return 0.05;
}

function compareLocation(locA, locB) {
    if (!locA || !locB) return 0.3;
    const a = locA.toLowerCase();
    const b = locB.toLowerCase();
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.85;

    const tokensA = tokenize(a);
    const tokensB = tokenize(b);
    const sim = calculateJaccard(tokensA, tokensB);
    return Math.max(sim, 0.1);
}

function compareColors(colorA, colorB) {
    if (!colorA || !colorB) return 0.4;
    const a = colorA.toLowerCase();
    const b = colorB.toLowerCase();
    if (a === b) return 1.0;

    const commonColors = ['black', 'blue', 'silver', 'white', 'grey', 'gray', 'red', 'green', 'gold', 'brown', 'pink', 'yellow'];
    for (const col of commonColors) {
        if (a.includes(col) && b.includes(col)) return 0.9;
    }
    return 0.1;
}

async function computeSemanticSimilarityWithGemini(descA, descB) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
        return null;
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Compare these two physical item descriptions for a lost and found system.
Item 1: "${descA}"
Item 2: "${descB}"

Rate the likelihood that these two descriptions refer to the same physical object on a scale from 0 to 100.
Return ONLY valid JSON in this exact structure without markdown:
{"score": 85, "matchReason": "Both describe over-ear dark wireless headphones"}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (typeof parsed.score === 'number') {
            return {
                score: Math.min(Math.max(parsed.score / 100, 0), 1),
                reason: parsed.matchReason || ''
            };
        }
    } catch (err) {
        // Fallback to keyword matching silently
    }
    return null;
}

async function calculateMatchScore(itemTarget, candidateItem) {
    const matchingTraits = [];

    // 1. Category Similarity
    let categoryScore = 0;
    if (itemTarget.category === candidateItem.category) {
        categoryScore = 1.0;
        matchingTraits.push(`Category: ${itemTarget.category}`);
    } else {
        const groupMatch = checkSemanticGroupOverlap(itemTarget.category + ' ' + itemTarget.name, candidateItem.category + ' ' + candidateItem.name);
        categoryScore = groupMatch ? 0.7 : 0.05;
        if (groupMatch) matchingTraits.push('Related item type');
    }

    // 2. Location Proximity
    const locationScore = compareLocation(itemTarget.location, candidateItem.location);
    if (locationScore >= 0.7) {
        matchingTraits.push(`Nearby location: ${candidateItem.location || 'Campus'}`);
    }

    // 3. Date Proximity
    const dateScore = compareDates(itemTarget.dateOccurred, candidateItem.dateOccurred);
    if (dateScore >= 0.8) {
        matchingTraits.push('Reported within similar timeframe');
    }

    // 4. Color / Feature Similarity
    const colorScore = compareColors(itemTarget.color, candidateItem.color);
    if (colorScore >= 0.7) {
        matchingTraits.push(`Color match: ${candidateItem.color || 'Similar appearance'}`);
    }

    // 5. Description & Semantic Similarity
    const textA = `${itemTarget.name} ${itemTarget.description || ''} ${itemTarget.identifyingFeatures || ''}`;
    const textB = `${candidateItem.name} ${candidateItem.description || ''} ${candidateItem.identifyingFeatures || ''}`;

    let descriptionScore = 0;
    let aiReason = '';

    // Check Gemini AI first
    const aiResult = await computeSemanticSimilarityWithGemini(textA, textB);
    if (aiResult) {
        descriptionScore = aiResult.score;
        if (aiResult.reason) aiReason = aiResult.reason;
    } else {
        // Fallback keyword & token overlap
        const tokensA = tokenize(textA);
        const tokensB = tokenize(textB);
        const jaccard = calculateJaccard(tokensA, tokensB);
        const clusterMatch = checkSemanticGroupOverlap(textA, textB);
        descriptionScore = Math.min((jaccard * 1.5) + (clusterMatch ? 0.45 : 0), 1.0);
    }

    if (descriptionScore >= 0.5) {
        matchingTraits.push(aiReason || 'Distinctive characteristics match');
    }

    // Weighted Total Score
    const totalScore = (
        (categoryScore * WEIGHTS.category) +
        (descriptionScore * WEIGHTS.description) +
        (locationScore * WEIGHTS.location) +
        (dateScore * WEIGHTS.date) +
        (colorScore * WEIGHTS.color)
    );

    const percentage = Math.round(totalScore * 100);

    let strength = 'Potential Match';
    if (percentage >= 75) strength = 'High Match';
    else if (percentage >= 50) strength = 'Moderate Match';

    return {
        item: candidateItem,
        score: percentage,
        matchScore: percentage,
        strength,
        traits: matchingTraits,
        matchingCharacteristics: matchingTraits,
        characteristics: matchingTraits,
        breakdown: {
            category: Math.round(categoryScore * 100),
            description: Math.round(descriptionScore * 100),
            location: Math.round(locationScore * 100),
            date: Math.round(dateScore * 100),
            color: Math.round(colorScore * 100)
        }
    };
}

module.exports = {
    calculateMatchScore,
    WEIGHTS
};
