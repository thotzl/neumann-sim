/**
 * Central Python interpreter resolution for all engine call sites (no shell).
 * Override via env BOB_PYTHON (e.g. 'python' on Windows or a venv binary).
 */
const PYTHON_BIN = process.env.BOB_PYTHON || 'python3';

module.exports = { PYTHON_BIN };
