
export const injectGremlin = (config = { failureRate: 0.3, minDelay: 1000, maxDelay: 5000 }) => {
    return async (req, res, next) => {
        const shouldDelay = Math.random() < config.failureRate;

        if (shouldDelay) {
            const delay = Math.floor(Math.random() * (config.maxDelay - config.minDelay + 1)) + config.minDelay;
            console.log(`[Gremlin] 😈 Simulating ${delay}ms latency for inter-service communication...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        next();
    };
};