// Model release date mapping
// Maps model identifiers (from tags) to release dates in YYYYMMDD format
// Only includes models with verified release dates from official sources

const MODEL_RELEASE_DATES = {
    // ==================== Anthropic ====================
    // Claude 2: July 11, 2023 - https://www.anthropic.com/index/claude-2
    'claude-2': 20230711,

    // Claude 3 family: March 4, 2024 - https://www.anthropic.com/news/claude-3-family
    'claude-3-opus-20240229': 20240304,
    'claude-3-sonnet-20240229': 20240304,
    'claude-3-haiku-20240307': 20240307,

    // Claude 3.5 Sonnet original: June 20, 2024 - https://www.anthropic.com/news/claude-3-5-sonnet
    'claude-3-5-sonnet-20240620': 20240620,

    // Claude 3.5 Sonnet upgraded: October 22, 2024 - https://www.anthropic.com/news/3-5-models-and-computer-use
    'claude-3-5-sonnet-20241022': 20241022,
    'claude-3.5-sonnet-20241022': 20241022,

    // Claude 3.5 Haiku: November 4, 2024
    'claude-3-5-haiku-latest': 20241104,

    // Claude 3.7 Sonnet: February 24, 2025 - https://www.anthropic.com/news/claude-3-7-sonnet
    'claude-3-7-sonnet-20250219': 20250224,

    // Claude 4: May 22, 2025 - https://www.anthropic.com/news/claude-4
    'claude-4-opus-20250514': 20250522,
    'claude-4-sonnet-20250514': 20250522,
    'claude-4-sonnet': 20250522,
    'claude-4-sonnet-20250522': 20250522,
    'claude-sonnet-4-20250514': 20250522,

    // Claude Sonnet 4.5: September 29, 2025 - https://www.anthropic.com/news/claude-sonnet-4-5
    'claude-sonnet-4-5-20250929': 20250929,
    'claude-sonnet-4-5': 20250929,
    'claude-sonnet-4.5': 20250929,

    // Claude Haiku 4.5: October 15, 2025 - https://www.anthropic.com/news/claude-haiku-4-5
    'claude-haiku-4-5-20251101': 20251015,

    // Claude Opus 4.5: November 24, 2025 - https://www.anthropic.com/news/claude-opus-4-5
    'claude-opus-4-5-20251101': 20251124,

    // ==================== OpenAI ====================
    // GPT-4: March 14, 2023 - https://openai.com/research/gpt-4
    'gpt-4-0613': 20230613,
    'gpt-4-1106-preview': 20231106,
    'gpt-4-0125-preview': 20240125,

    // GPT-4 Turbo: April 9, 2024 - https://openai.com/index/new-models-and-developer-products
    'gpt-4-turbo-2024-04-09': 20240409,

    // GPT-4o: May 13, 2024 - https://openai.com/index/hello-gpt-4o/
    'gpt-4o-2024-05-13': 20240513,

    // GPT-4o mini: July 18, 2024
    'gpt-4o-mini-2024-07-18': 20240718,

    // GPT-4o August update: August 6, 2024
    'gpt-4o-2024-08-06': 20240806,

    // GPT-4o November update: November 20, 2024
    'gpt-4o-2024-11-20': 20241120,
    'gpt-4o-20241120': 20241120,

    // o1-preview and o1-mini: September 12, 2024 - https://openai.com/index/introducing-openai-o1-preview/
    'o1-preview-2024-09-12': 20240912,
    'o1-preview': 20240912,
    'o1-mini-2024-09-12': 20240912,

    // o1 full version: December 5, 2024 (API Dec 17)
    'o1-2024-12-17': 20241217,

    // o3-mini: January 31, 2025 - https://openai.com/index/openai-o3-mini/
    'o3-mini-2025-01-31': 20250131,
    'o3-mini': 20250131,

    // GPT-4.1: April 14, 2025 - https://openai.com/index/gpt-4-1/
    'gpt-4.1-2025-04-14': 20250414,
    'gpt-4.1-20250414': 20250414,
    'gpt-4.1-mini-2025-04-14': 20250414,
    'gpt-4.1-mini-20250414': 20250414,

    // o3 & o4-mini: April 16, 2025 - https://openai.com/index/introducing-o3-and-o4-mini/
    'o3-2025-04-16': 20250416,
    'o3-20250416': 20250416,
    'o4-mini-2025-04-16': 20250416,
    'o4-mini-20250416': 20250416,
    'o4-mini': 20250416,

    // GPT-5: August 7, 2025 - https://openai.com/index/introducing-gpt-5/
    'gpt-5': 20250807,
    'gpt-5-2025-08-07': 20250807,
    'gpt-5-mini-2025-08-07': 20250807,
    'gpt-5-nano-2025-08-07': 20250807,
    'openai/gpt-5-2025-08-07': 20250807,

    // GPT-5.1: November 12, 2025
    'gpt-5.1-2025-11-13': 20251112,
    'gpt-5.1-codex': 20251112,

    // GPT-5.2: December 11, 2025 - https://openai.com/index/introducing-gpt-5-2/
    'gpt-5.2-2025-12-11': 20251211,

    // gpt-oss: August 5, 2025 - https://openai.com/index/introducing-gpt-oss/
    'gpt-oss-120b': 20250805,

    // ==================== Google DeepMind ====================
    // Gemini 1.5 Pro GA: May 23, 2024
    'gemini-1.5-pro-001': 20240523,
    'gemini-1.5-pro-002': 20240924,
    'gemini-1.5-flash-002': 20240924,

    // Gemini 2.0 Flash experimental: December 11, 2024 - https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/
    'gemini-2.0-flash-exp': 20241211,
    'gemini-exp-1206': 20241206,

    // Gemini 2.0 Flash Thinking: January 21, 2025
    'gemini-2.0-flash-thinking-exp-01-21': 20250121,

    // Gemini 2.0 Flash/Pro GA: February 5, 2025 - https://blog.google/technology/google-deepmind/gemini-model-updates-february-2025/
    'gemini-2.0-flash-001': 20250205,
    'gemini-2.0-flash': 20250205,
    'gemini-2.0-pro-exp-02-05': 20250205,

    // Gemini 2.5 Pro experimental: March 25, 2025 - https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/
    'gemini-2.5-pro-preview-05-06': 20250506,
    'gemini-2.5-pro': 20250506,

    // Gemini 2.5 Flash: April 17, 2025 (preview)
    'gemini-2.5-flash-preview-04-17': 20250417,
    'gemini-2.5-flash': 20250417,

    // Gemini 3 Pro: November 18, 2025 - https://blog.google/products/gemini/gemini-3/
    'gemini-3-pro-preview': 20251118,

    // ==================== DeepSeek ====================
    // DeepSeek V3: December 26, 2024 - https://api-docs.deepseek.com/news/news1226
    'deepseek-v3': 20241226,
    'deepseek-chat': 20241226,

    // DeepSeek R1: January 20, 2025 - https://api-docs.deepseek.com/news/news250120
    'deepseek-r1': 20250120,

    // DeepSeek V3-0324: March 24, 2025 - https://api-docs.deepseek.com/news/news0324
    'deepseek-v3-0324': 20250324,
    'DeepSeek-V3-0324': 20250324,

    // DeepSeek V3.2: December 1, 2025 - https://api-docs.deepseek.com/news/news251201
    'deepseek-v3.2-reasoner': 20251201,

    // ==================== Qwen ====================
    // Qwen 2.5: September 19, 2024 - https://qwenlm.github.io/blog/qwen2.5/
    'Qwen 2.5': 20240919,

    // Qwen2.5-Coder-32B-Instruct: November 12, 2024 - https://qwenlm.github.io/blog/qwen2.5-coder-family/
    'qwen2.5-coder-32b-instruct': 20241112,
    'Qwen2.5-Coder-32B-Instruct': 20241112,
    'qwen-2.5-coder-32b-instruct': 20241112,

    // Qwen3-Coder: July 22, 2025 - https://qwenlm.github.io/blog/qwen3-coder/
    'Qwen3-Coder-30B-A3B-Instruct': 20250722,
    'Qwen3-Coder-480B-A35B-Instruct': 20250722,
    'https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct': 20250722,
    'https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct': 20250722,

    // ==================== Meta Llama ====================
    // Llama 3.1: July 23, 2024 - https://ai.meta.com/blog/meta-llama-3-1/
    'llama-3.1-405b-instruct': 20240723,
    'llama-3.1-70b-instruct': 20240723,
    'llama-3.1-8b-instruct': 20240723,
    'Llama 3.1': 20240723,

    // Llama 3.3: December 6, 2024 - https://ai.meta.com/blog/llama-3-3-instruct/
    'llama-3.3-70b-instruct': 20241206,

    // Llama 4: April 5, 2025 - https://ai.meta.com/blog/llama-4-multimodal-intelligence/
    'llama-4-maverick': 20250405,
    'llama-4-maverick-instruct': 20250405,
    'llama-4-scout': 20250405,
    'llama-4-scout-instruct': 20250405,

    // ==================== Mistral ====================
    // Codestral: May 29, 2024 - https://mistral.ai/news/codestral
    'codestral-2405': 20240529,

    // Mistral Large 2: July 24, 2024 - https://mistral.ai/news/mistral-large-2407
    'mistral-large-2407': 20240724,

    // Devstral Small: May 21, 2025 - https://mistral.ai/news/devstral
    'devstral-small-2505': 20250521,
    'mistralai/Devstral-Small-2505': 20250521,

    // Devstral Small 1.1 (2507): July 11, 2025 - https://mistral.ai/news/devstral-2507
    'devstral-small-2507': 20250711,

    // Devstral 2: December 9, 2025 - https://mistral.ai/news/devstral-2-vibe-cli
    'devstral-2512': 20251209,
    'devstral-small-2512': 20251209,

    // ==================== xAI ====================
    // Grok-2: December 12, 2024
    'grok-2-1212': 20241212,

    // ==================== Moonshot / Kimi ====================
    // Kimi K2: July 11, 2025 - https://moonshotai.github.io/Kimi-K2/
    'Kimi-K2-Instruct': 20250711,
    'kimi-k2-instruct': 20250711,
    'moonshot/kimi-k2-0711-preview': 20250711,

    // Kimi K2 updated: September 5, 2025
    'kimi-k2-0905-preview': 20250905,

    // Kimi K2 Thinking: November 6, 2025
    'Kimi-K2-Thinking': 20251106,

    // ==================== ZhipuAI / GLM ====================
    // GLM-4.5: July 28, 2025 - https://www.z.ai/
    'GLM-4.5': 20250728,
    'https://huggingface.co/zai-org/GLM-4.5': 20250728,

    // GLM-4.6: September 30, 2025
    'glm-4.6': 20250930,
    'https://huggingface.co/zai-org/GLM-4.6': 20250930,

    // ==================== MiniMax ====================
    // MiniMax M2: October 27, 2025 - https://www.minimax.io/
    'minimax-m2': 20251027,

    // ==================== Amazon ====================
    // Amazon Nova Premier: April 30, 2025 - https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/
    'amazon.nova-premier-v1:0': 20250430,

    // ==================== ByteDance ====================
    // Doubao-Seed-Code: December 3, 2025 - https://seed.bytedance.com/
    'Doubao-Seed-Code': 20251203,
};

/**
 * Extract model ID from tags array
 * @param {string[]} tags - Array of tags like ["Model: claude-opus-4-5-20251101", "Org: Anthropic"]
 * @returns {string|null} - Model ID or null if not found
 */
function getModelIdFromTags(tags) {
    if (!tags || !Array.isArray(tags)) return null;

    for (const tag of tags) {
        if (tag.startsWith('Model: ')) {
            return tag.substring(7); // Remove "Model: " prefix
        }
    }
    return null;
}

/**
 * Get release date for a model given its tags
 * @param {string[]} tags - Array of tags
 * @returns {number|null} - Release date as YYYYMMDD integer or null if not found
 */
function getModelReleaseDate(tags) {
    const modelId = getModelIdFromTags(tags);
    if (!modelId) return null;
    return MODEL_RELEASE_DATES[modelId] || null;
}

/**
 * Parse YYYYMMDD integer to Date object
 * @param {number} dateInt - Date as YYYYMMDD integer
 * @returns {Date} - JavaScript Date object
 */
function parseReleaseDateInt(dateInt) {
    const dateStr = dateInt.toString();
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
}

/**
 * Format date for display
 * @param {Date} date - JavaScript Date object
 * @returns {string} - Formatted date string (e.g., "Jan 15, 2024")
 */
function formatReleaseDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}
