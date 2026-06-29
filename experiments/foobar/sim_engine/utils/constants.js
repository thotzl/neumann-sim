/**
 * Zentrale System-Marker und technische Konstanten.
 */
module.exports = {
    TAGS: {
        SELF: "[EIGENIMPULS]",
        FOREIGN: "[FREMDRESONANZ]",
        ROOT_STATE: "[FORMRAUM]",
        MEMORY: "[KOLLEKTIVES GEDÄCHTNIS]",
        INITIAL: "[BEGINN DER EXISTENZ]",
        UR_IMPULS: "[UR-IMPULS]",
        STILLE: "[STILLE]",
        SYSTEM_INFO: "[SYSTEM-INFO]",
        SYSTEM_RESUME: "[SYSTEM-RESUME]",
        LOSS: "[IMPULS-VERLUST]"
    },
    SYNTAX: {
        WRITE_START: "[WRITE:",
        WRITE_END: "[END]",
        REPLACE_START: "[REPLACE:",
        REPLACE_DIVIDER: "|||",
        REPLACE_END: "[END]",
        RUN_START: "[RUN:",
        RUN_END: "]",
        FINISH: "[FINISH]"
    },
    DEFAULTS: {
        ROOT_NAME: "x",
        DISTILLATION_INTERVAL: 5,
        MODEL: "gemini-2.5-flash",
        RETRIES: 3
    }
};
