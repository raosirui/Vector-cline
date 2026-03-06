import { ModelFamily } from "@/shared/prompts";
import { ClineDefaultTool } from "@/shared/tools";
import { TASK_PROGRESS_PARAMETER } from "../types";
const id = ClineDefaultTool.LIST_CODE_DEF;
const generic = {
    variant: ModelFamily.GENERIC,
    id,
    name: "list_code_definition_names",
    description: "Request to list definition names (classes, functions, methods, etc.) used in source code files at the top level of the specified directory. This tool provides insights into the codebase structure and important constructs, encapsulating high-level concepts and relationships that are crucial for understanding the overall architecture.",
    parameters: [
        {
            name: "path",
            required: true,
            instruction: `The path of the directory (relative to the current working directory {{CWD}}){{MULTI_ROOT_HINT}} to list top level source code definitions for.`,
            usage: "Directory path here",
        },
        TASK_PROGRESS_PARAMETER,
    ],
};
const NATIVE_GPT_5 = {
    variant: ModelFamily.NATIVE_GPT_5,
    id,
    name: "list_code_definition_names",
    description: "Request to list definition names (classes, functions, methods, etc.) used in source code files at the top level of the specified directory. This tool provides insights into the codebase structure and important constructs, encapsulating high-level concepts and relationships that are crucial for understanding the overall architecture.",
    parameters: [
        {
            name: "path",
            required: true,
            instruction: `The path of the directory (relative to the current working directory {{CWD}}){{MULTI_ROOT_HINT}} to list top level source code definitions for.`,
        },
        TASK_PROGRESS_PARAMETER,
    ],
};
const NATIVE_NEXT_GEN = {
    ...NATIVE_GPT_5,
    variant: ModelFamily.NATIVE_NEXT_GEN,
};
export const list_code_definition_names_variants = [generic, NATIVE_GPT_5, NATIVE_NEXT_GEN];
//# sourceMappingURL=list_code_definition_names.js.map