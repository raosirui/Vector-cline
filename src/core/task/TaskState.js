export class TaskState {
    // Task-level timing
    taskStartTimeMs = Date.now();
    taskFirstTokenTimeMs;
    // Streaming flags
    isStreaming = false;
    isWaitingForFirstChunk = false;
    didCompleteReadingStream = false;
    // Content processing
    currentStreamingContentIndex = 0;
    assistantMessageContent = [];
    userMessageContent = [];
    userMessageContentReady = false;
    // Map of tool names to their tool_use_id for creating proper ToolResultBlockParam
    toolUseIdMap = new Map();
    // Presentation locks
    presentAssistantMessageLocked = false;
    presentAssistantMessageHasPendingUpdates = false;
    // Ask/Response handling
    askResponse;
    askResponseText;
    askResponseImages;
    askResponseFiles;
    lastMessageTs;
    // Plan mode specific state
    isAwaitingPlanResponse = false;
    didRespondToPlanAskBySwitchingMode = false;
    // Context and history
    conversationHistoryDeletedRange;
    // Tool execution flags
    didRejectTool = false;
    didAlreadyUseTool = false;
    didEditFile = false;
    lastToolName = ""; // Track last tool used for consecutive call detection
    // Error tracking
    consecutiveMistakeCount = 0;
    doubleCheckCompletionPending = false;
    didAutomaticallyRetryFailedApiRequest = false;
    checkpointManagerErrorMessage;
    // Retry tracking for auto-retry feature
    autoRetryAttempts = 0;
    // Task Initialization
    isInitialized = false;
    // Focus Chain / Todo List Management
    apiRequestCount = 0;
    apiRequestsSinceLastTodoUpdate = 0;
    currentFocusChainChecklist = null;
    todoListWasUpdatedByUser = false;
    // Task Abort / Cancellation
    abort = false;
    didFinishAbortingStream = false;
    abandoned = false;
    // Hook execution tracking for cancellation
    activeHookExecution;
    // Auto-context summarization
    currentlySummarizing = false;
    lastAutoCompactTriggerIndex;
}
//# sourceMappingURL=TaskState.js.map