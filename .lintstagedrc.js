const path = require("path");

module.exports = {
    "**/*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --fix --cache"],
    "*.{json,html,md,yml}": ["prettier --ignore-path .prettierignore --write"],
    ".{eslintrc,prettierrc,}": ["prettier --ignore-path .prettierignore --write"],
};
