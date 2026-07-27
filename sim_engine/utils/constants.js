/**
 * Central system markers and technical constants.
 */
module.exports = {
    TAGS: {
        SELF: "[SELF-IMPULSE]",
        FOREIGN: "[FOREIGN-RESONANCE]",
        ROOT_STATE: "[FORM-SPACE]",
        MEMORY: "[COLLECTIVE MEMORY]",
        INITIAL: "[BEGINNING OF EXISTENCE]",
        UR_IMPULS: "[PRIME-IMPULSE]",
        STILLE: "[SILENCE]",
        SYSTEM_INFO: "[SYSTEM-INFO]",
        SYSTEM_RESUME: "[SYSTEM-RESUME]",
        LOSS: "[IMPULSE-LOSS]"
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
