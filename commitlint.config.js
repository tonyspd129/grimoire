export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allowed scopes match the project's components
    "scope-enum": [
      2,
      "always",
      [
        "providers",  // LLM provider implementations
        "agent",      // ReAct loop, tools, prompt builder
        "learning",   // skill extractor, behavior analyzer
        "skills",     // built-in skill files
        "chat",       // Chat page
        "memory",     // Memory page
        "ui",         // shared UI components
        "settings",   // Settings page
        "db",         // SQLite commands (Rust)
        "config",     // encrypted config (Rust)
        "tools",      // bash/file/search tools (Rust)
        "ci",         // GitHub Actions / CI
        "docs",       // documentation
        "deps",       // dependency updates
      ],
    ],
    "scope-case": [2, "always", "kebab-case"],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [1, "always", 120],
  },
};
