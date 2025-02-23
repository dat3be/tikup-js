const Logger = require('../utils/logger');
class StateManager {
    constructor() {
        this.states = new Map();
        this.timeouts = new Map();
    }

    middleware() {
        return async (ctx, next) => {
            const userId = ctx.from.id;
            
            // Attach state methods to context
            ctx.state.setState = (state) => this.setState(userId, state);
            ctx.state.getState = () => this.getState(userId);
            ctx.state.clearState = () => this.clearState(userId);

            return next();
        };
    }

    setState(userId, state, timeout = 300000) { // 5 minutes default
        this.states.set(userId, state);

        // Clear any existing timeout
        if (this.timeouts.has(userId)) {
            clearTimeout(this.timeouts.get(userId));
        }

        // Set new timeout
        const timeoutId = setTimeout(() => {
            this.clearState(userId);
        }, timeout);

        this.timeouts.set(userId, timeoutId);
    }

    getState(userId) {
        return this.states.get(userId);
    }

    clearState(userId) {
        this.states.delete(userId);
        if (this.timeouts.has(userId)) {
            clearTimeout(this.timeouts.get(userId));
            this.timeouts.delete(userId);
        }
    }

    clearAllStates() {
        try {
            // Clear all states
            this.states.clear();
            
            // Clear all timeouts
            for (const [userId, timeoutId] of this.timeouts) {
                clearTimeout(timeoutId);
            }
            this.timeouts.clear();

            Logger.info('Cleared all states');
        } catch (error) {
            Logger.error('Clear all states error:', error);
            throw error;
        }
    }
}

module.exports = new StateManager(); 