// Mapping from repository prefix (org__repo) to programming language
// Used for language stratification in multilingual leaderboard charts
const REPO_LANGUAGE_MAP = {
    // C
    "redis__redis": "C",
    "jqlang__jq": "C",
    "micropython__micropython": "C",
    "valkey-io__valkey": "C",
    // C++
    "nlohmann__json": "C++",
    "fmtlib__fmt": "C++",
    // Go
    "caddyserver__caddy": "Go",
    "hashicorp__terraform": "Go",
    "prometheus__prometheus": "Go",
    "gohugoio__hugo": "Go",
    "gin-gonic__gin": "Go",
    // Java
    "google__gson": "Java",
    "apache__druid": "Java",
    "projectlombok__lombok": "Java",
    "apache__lucene": "Java",
    "reactivex__rxjava": "Java",
    "javaparser__javaparser": "Java",
    // JavaScript/TypeScript
    "babel__babel": "JS/TS",
    "vuejs__core": "JS/TS",
    "facebook__docusaurus": "JS/TS",
    "immutable-js__immutable-js": "JS/TS",
    "mrdoob__three.js": "JS/TS",
    "preactjs__preact": "JS/TS",
    "axios__axios": "JS/TS",
    // PHP
    "phpoffice__phpspreadsheet": "PHP",
    "laravel__framework": "PHP",
    "php-cs-fixer__php-cs-fixer": "PHP",
    "briannesbitt__carbon": "PHP",
    // Ruby
    "jekyll__jekyll": "Ruby",
    "fluent__fluentd": "Ruby",
    "fastlane__fastlane": "Ruby",
    "jordansissel__fpm": "Ruby",
    "faker-ruby__faker": "Ruby",
    "rubocop__rubocop": "Ruby",
    // Rust
    "tokio-rs__tokio": "Rust",
    "uutils__coreutils": "Rust",
    "nushell__nushell": "Rust",
    "tokio-rs__axum": "Rust",
    "burntsushi__ripgrep": "Rust",
    "sharkdp__bat": "Rust",
    "astral-sh__ruff": "Rust"
};

// Language display order for consistent chart rendering
const LANGUAGE_ORDER = ["C", "C++", "Go", "Java", "JS/TS", "PHP", "Ruby", "Rust"];

// Color palette for languages (matches common language colors)
const LANGUAGE_COLORS = {
    "C": { bg: "rgba(85, 85, 85, 0.7)", border: "rgba(85, 85, 85, 1)" },
    "C++": { bg: "rgba(243, 75, 125, 0.7)", border: "rgba(243, 75, 125, 1)" },
    "Go": { bg: "rgba(0, 173, 216, 0.7)", border: "rgba(0, 173, 216, 1)" },
    "Java": { bg: "rgba(176, 114, 25, 0.7)", border: "rgba(176, 114, 25, 1)" },
    "JS/TS": { bg: "rgba(247, 223, 30, 0.7)", border: "rgba(247, 223, 30, 1)" },
    "PHP": { bg: "rgba(79, 93, 149, 0.7)", border: "rgba(79, 93, 149, 1)" },
    "Ruby": { bg: "rgba(204, 52, 45, 0.7)", border: "rgba(204, 52, 45, 1)" },
    "Rust": { bg: "rgba(222, 165, 132, 0.7)", border: "rgba(222, 165, 132, 1)" }
};

/**
 * Extract language from instance ID
 * Instance ID format: {org}__{repo}-{issue_number}
 * Example: "redis__redis-1234" -> "C"
 * @param {string} instanceId - The instance ID
 * @returns {string} - The programming language or "Unknown"
 */
function getLanguageFromInstanceId(instanceId) {
    if (!instanceId) return "Unknown";

    // Instance format: org__repo-issue_number
    // We need to extract "org__repo" from "org__repo-1234"
    // Handle cases where repo name might contain hyphens
    const parts = instanceId.split('-');
    if (parts.length < 2) return "Unknown";

    // The repo prefix is everything except the last part (issue number)
    const repoPrefix = parts.slice(0, -1).join('-');

    return REPO_LANGUAGE_MAP[repoPrefix] || "Unknown";
}

/**
 * Get all unique languages from a set of instance IDs
 * @param {string[]} instanceIds - Array of instance IDs
 * @returns {string[]} - Sorted array of unique languages
 */
function getLanguagesFromInstanceIds(instanceIds) {
    const languages = new Set();
    instanceIds.forEach(id => {
        const lang = getLanguageFromInstanceId(id);
        if (lang !== "Unknown") {
            languages.add(lang);
        }
    });
    return LANGUAGE_ORDER.filter(lang => languages.has(lang));
}

/**
 * Aggregate per-instance details by language
 * @param {Object} perInstanceDetails - Object with instance IDs as keys
 * @returns {Object} - Object with languages as keys and aggregated stats
 */
function aggregateByLanguage(perInstanceDetails) {
    const byLanguage = {};

    // Initialize all languages
    LANGUAGE_ORDER.forEach(lang => {
        byLanguage[lang] = {
            total: 0,
            resolved: 0,
            totalCost: 0,
            totalApiCalls: 0
        };
    });

    // Aggregate data
    Object.entries(perInstanceDetails || {}).forEach(([instanceId, details]) => {
        const language = getLanguageFromInstanceId(instanceId);
        if (language === "Unknown") return;

        byLanguage[language].total++;
        if (details.resolved) {
            byLanguage[language].resolved++;
        }
        if (details.cost) {
            byLanguage[language].totalCost += details.cost;
        }
        if (details.api_calls) {
            byLanguage[language].totalApiCalls += details.api_calls;
        }
    });

    return byLanguage;
}

// Export for use in other modules
window.REPO_LANGUAGE_MAP = REPO_LANGUAGE_MAP;
window.LANGUAGE_ORDER = LANGUAGE_ORDER;
window.LANGUAGE_COLORS = LANGUAGE_COLORS;
window.getLanguageFromInstanceId = getLanguageFromInstanceId;
window.getLanguagesFromInstanceIds = getLanguagesFromInstanceIds;
window.aggregateByLanguage = aggregateByLanguage;
