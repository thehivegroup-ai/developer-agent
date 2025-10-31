export interface AgentRequest {
    type: string;
    payload: unknown;
    sender?: string;
    target?: string;
}
export interface AgentResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}
//# sourceMappingURL=AgentTypes.d.ts.map