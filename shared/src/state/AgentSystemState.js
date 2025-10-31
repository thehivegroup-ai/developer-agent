/**
 * Initialize default state
 */
export function createInitialState(sessionId, threadId, userId, query) {
    return {
        sessionId,
        threadId,
        userId,
        query,
        queryTimestamp: new Date(),
        activeAgents: new Map(),
        tasks: [],
        repositories: [],
        relationships: [],
        results: [],
        status: 'initializing',
        metadata: {},
    };
}
/**
 * State update operations
 */
export class StateManager {
    /**
     * Add an active agent to the state
     */
    static addAgent(state, agent) {
        const newAgents = new Map(state.activeAgents);
        newAgents.set(agent.agentId, agent);
        return {
            ...state,
            activeAgents: newAgents,
        };
    }
    /**
     * Remove an agent from the state
     */
    static removeAgent(state, agentId) {
        const newAgents = new Map(state.activeAgents);
        newAgents.delete(agentId);
        return {
            ...state,
            activeAgents: newAgents,
        };
    }
    /**
     * Update agent metadata
     */
    static updateAgent(state, agent) {
        const newAgents = new Map(state.activeAgents);
        newAgents.set(agent.agentId, agent);
        return {
            ...state,
            activeAgents: newAgents,
        };
    }
    /**
     * Add a task
     */
    static addTask(state, task) {
        return {
            ...state,
            tasks: [...state.tasks, task],
        };
    }
    /**
     * Update a task
     */
    static updateTask(state, taskId, updates) {
        return {
            ...state,
            tasks: state.tasks.map((task) => task.id === taskId ? { ...task, ...updates, updatedAt: new Date() } : task),
        };
    }
    /**
     * Add a repository
     */
    static addRepository(state, repo) {
        // Check if repository already exists
        const exists = state.repositories.some((r) => r.fullName === repo.fullName);
        if (exists) {
            return state;
        }
        return {
            ...state,
            repositories: [...state.repositories, repo],
        };
    }
    /**
     * Add a relationship
     */
    static addRelationship(state, relationship) {
        return {
            ...state,
            relationships: [...state.relationships, relationship],
        };
    }
    /**
     * Add a result
     */
    static addResult(state, result) {
        return {
            ...state,
            results: [...state.results, result],
        };
    }
    /**
     * Update system status
     */
    static updateStatus(state, status, error) {
        return {
            ...state,
            status,
            error,
        };
    }
}
//# sourceMappingURL=AgentSystemState.js.map