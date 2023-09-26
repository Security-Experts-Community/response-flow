export type CacaoVar = {
    type: string;
    description?: string;
    value?: string;
    constant?: boolean;
    external?: boolean;
};


export type CacaoParallelStep = CacaoWorkflowStep &{
    next_steps : string[]
}

export type ErmackOneOfStep = CacaoWorkflowStep &{
    united_steps : string[]
}

export type CacaoConditionStep = CacaoWorkflowStep &{
    on_true : string,
    on_false: string
}

export type CacaoWorkflowStep = {
    type: string;
    name?: string;
    description?: string;
    external_references?: string;
    delay?: number;
    timeout?: number;
    next_steps? : string[];
    united_steps? : string[];
    step_variables?: {
        [key: string]: {
            variable: CacaoVar;
        };
    };
    owner?: string;
    on_completion?: string;
    on_success?: string;
    on_failure?: string;
    step_extensions?: {
        [key: string]: {
            extension_type: string;
        };
    };

};

export type ErmackAction = CacaoWorkflowStep & {
    author: string;
    created: string;
    modified: string;
    description: string;
    extended_description: string;
    id: string;
    stage: string;
    title: string;
};

export const CacaoSpec: any = {
    spec_version: "cacao-2.0"
}

export const ErmackSpec: any = {
    spec_version: "ermack-1.0"
}

export type CacaoPlaybook = {
    type: string;
    spec_version: string;
    id: string;
    descripton?: string;
    playbook_types?: string[];
    playbook_activities?: string[];
    playbook_processing_summary?: string[];
    created_by: string;
    created: string;
    modified: string;
    revoked?: boolean;
    valid_from?: string;
    valid_until?: string;
    derived_from?: string[];
    related_to?: string[];
    priority?: number;
    severity?: number;
    impact?: number;
    industry_sectors?: string[];
    labels?: string[];
    external_references?: string[];
    markings?: string[];
    playbook_variables?: {
        [key: string]: {
            variable: CacaoVar;
        };
    };
    workflow_start: string;
    workflow_exception?: string;
    workflow: {
        [key: string]: CacaoWorkflowStep;
    };
    playbook_extensions?: {
        [key: string]: {
            playbook_extensions: string;
        };
    };
    authentication_info_definitions?: {
        [key: string]: {
            authentication_info_definition: string;
        };
    };
    agent_definitions?: {
        [key: string]: {
            agent_definition: string;
        };
    };
    target_definitions?: {
        [key: string]: {
            target_definition: string;
        };
    };
    extension_definitions?: {
        [key: string]: {
            extension_definition: string;
        };
    };
    data_marking_definitions?: {
        [key: string]: {
            data_marking_definition: string;
        };
    };
    signatures?: string[];
    [key: string]: any;
};

export type CacaoStepLink = {
    obj: {[key: string]:CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction},
    via: string
}