import { Crypto } from "./scripts/BlockDiagram/Utilities/Crypto";
import { DiagramPublisher } from "./scripts/DiagramPublisher/DiagramPublisher";
import {
    CollectionProperty,
    DiagramObjectModel,
    DictionaryProperty,
    EnumProperty,
    GraphObjectExport,
    ListProperty,
    Property,
    PropertyType,
    RawEntries,
    SemanticAnalyzer
} from "./scripts/BlockDiagram";
import { Sdo, Link, Sro, ExtensionSdo, AttackFlowExtensionId, AttackFlowExtensionCreatedDate, AttackFlowExtensionModifiedDate, AttackFlowSchemaUrl, AttackFlowSchemaVersion, AttackFlowDocsExternalReference, AttackFlowGitHubExternalReference, ExtensionAuthorSdo, AttackFlowExtensionCreatorName, AttackFlowTemplatesMap, AttackFlowSdos } from "./builder.config.publisher";

import { CacaoPlaybook, ErmackAction, ErmackSpec, CacaoStepLink, CacaoWorkflowStep, CacaoParallelStep, ErmackOneOfStep, CacaoConditionStep } from "./CacaoTypes";

///////////////////////////////////////////////////////////////////////////////
//  CACAO Publisher  //////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
export class CacaoPublisher extends DiagramPublisher {

    /**
     * Returns the published diagram in text form.
     * @param diagram
     *  The diagram to publish.
     * @returns
     *  The published diagram in text form.
     */
    public override publish(diagram: DiagramObjectModel): string {
        let graph = SemanticAnalyzer.toGraph(diagram);

        // Extract page
        let pageId = diagram.id;
        let page = graph.nodes.get(pageId);
        if (page) {
            graph.nodes.delete(pageId);
        } else {
            throw new Error("Page object missing from export.");
        }

        // Create bundle
        let cacaoPlaybook = this.createCacaoPlaybookStub();
        // let author = this.createPlaybookAuthorSdo(page);
        // let flow = this.createFlowSdo(pageId, page, author.id);
        // stixBundle.objects.push(flow);
        // stixBundle.objects.push(author);
        // Graph ID -> STIX node.
        let stixNodes = new Map<string, {[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction}>();
        // Parent STIX node -> Child Links
        let stixChildren = new Map<{[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction}, CacaoStepLink[]>();

        // Create SDOs and SCOs from graph nodes
        if (graph.nodes.size == 0){
            return JSON.stringify(cacaoPlaybook, null, 2);
        }

        for (let [id, node] of graph.nodes) {        
                switch(node.template.id) {
                    case "start":
                        let startNode = this.createCacaoStartNode()
                        stixNodes.set(id, startNode);
                        stixChildren.set(startNode, []);
                        break;

                    case "response_action":
                        let actionNode = this.createCacaoActionNode(node);
                        // cacaoPlaybook.workflow[actionId] = actionNode
                        stixNodes.set(id, actionNode);
                        stixChildren.set(actionNode, []);
                        break;

                    case "parallel":
                        let parallelNode = this.createCacaoParallelNode();
                        // cacaoPlaybook.workflow[parallelId] = parallelNode
                        stixNodes.set(id, parallelNode);
                        stixChildren.set(parallelNode, []);
                        break;
                        
                    case "one-of":
                        let oneOfNode = this.createOneOfNode(node);
                        // cacaoPlaybook.workflow[oneOfId] = oneOfNode
                        stixNodes.set(id, oneOfNode);
                        stixChildren.set(oneOfNode, []);
                        break; 
                    
                    case "and":
                        let andNode = this.createAndNode(node);
                        // cacaoPlaybook.workflow[andId] = andNode
                        stixNodes.set(id, andNode);
                        stixChildren.set(andNode, []);
                        break; 

                    case "or":
                        let orNode = this.createOrNode(node);
                        // cacaoPlaybook.workflow[orId] = orNode
                        stixNodes.set(id, orNode);
                        stixChildren.set(orNode, []);
                        break;     

                    case "end":
                        let endNode = this.createCacaoEndNode();
                        stixNodes.set(id, endNode);
                        stixChildren.set(endNode, []);
                        break;

                    case "condition":
                        let conditionNode = this.createCacaoConditionNode();
                        stixNodes.set(id, conditionNode);
                        stixChildren.set(conditionNode, []);
                        break;
                    default:
                        throw new Error(`Unexpected node type: ${node.template.id}`)
                        // let [nodeId, basicNode] = this.createBasicNode(node);
                        // cacaoPlaybook.workflow[nodeId] = basicNode
                        // stixNodes.set(id, basicNode);
                        // stixChildren.set(basicNode, []);
                        break;
                }
        }

        // let [startId, startNode] = this.createCacaoStartNode()
        
        // cacaoPlaybook.workflow_start = startId

        // let [[firstNodeId, firstNode], ...otherNodes] = graph.nodes
        // switch(firstNode.template.id) {
        //     case "response_action":
        //         let [actionId, actionNode] = this.createCacaoActionNode(firstNode);
        //         startNode['on_completion'] = actionId
        //         cacaoPlaybook.workflow[startId] = startNode
        //         if (otherNodes.length == 0){
        //             let [endId, endNode] = this.createCacaoEndNode();
        //             actionNode['on_completion'] = endId                    
        //             cacaoPlaybook.workflow[actionId] = actionNode
        //             cacaoPlaybook.workflow[endId] = endNode                  
        //         }
        //         else{
        //             cacaoPlaybook.workflow[actionId] = actionNode
        //             stixNodes.set(actionId, actionNode);
        //             stixChildren.set(actionNode, []);
        //         }
                
        //         break;
        //     default:
        //         let [nodeId, basicNode] = this.createBasicNode(firstNode);
        //         startNode['on_completion'] = nodeId
        //         cacaoPlaybook.workflow[startId] = startNode
        //         if (otherNodes.length == 0){
        //             let [endId, endNode] = this.createCacaoEndNode();
        //             basicNode['on_completion'] = endId
        //             cacaoPlaybook.workflow[nodeId] = basicNode
        //             cacaoPlaybook.workflow[endId] = endNode                     
        //         }
        //         else
        //         {
        //             cacaoPlaybook.workflow[nodeId] = basicNode
        //             stixNodes.set(nodeId, basicNode);
        //             stixChildren.set(basicNode, []);
        //         }
        //         break;
        // }
        

        // let last = otherNodes.pop()
        // if (last)
        // {
        // let [lastNodeId, lastNode] = last

        //     for (let [id, node] of otherNodes) {
        //         lastNode = node          
        //         switch(node.template.id) {
        //             case "response_action":
        //                 let [actionId, actionNode] = this.createCacaoActionNode(node);
        //                 cacaoPlaybook.workflow[actionId] = actionNode
        //                 stixNodes.set(id, actionNode);
        //                 stixChildren.set(actionNode, []);
        //                 break;
        //             default:
        //                 let [nodeId, basicNode] = this.createBasicNode(node);
        //                 cacaoPlaybook.workflow[nodeId] = basicNode
        //                 stixNodes.set(id, basicNode);
        //                 stixChildren.set(basicNode, []);
        //                 break;
        //         }
        //     }

        //     let [endId, endNode] = this.createCacaoEndNode();
        //     cacaoPlaybook.workflow[endId] = endNode
        // }

        // Create adjacency list from graph edges
        for (let edge of graph.edges.values()) {
            let prev = edge.prev;
            let next = edge.next;
            // Skip edges that don't connect two nodes
            console.log("before");
            if (prev.length !== 1 || next.length !== 1)
            {
                console.log("skip");
                continue;
            }
            console.log("register");
            // Register link
            let prevNode = stixNodes.get(prev[0]);
            let nextNode = stixNodes.get(next[0]);
            if (prevNode && nextNode) {
                stixChildren.get(prevNode)!.push({
                    obj: nextNode,
                    via: edge.prevLinkMap.keys().next().value
                });
            } else {
                throw new Error(`Edge '${edge}' is missing one or more nodes.`);
            }
        }

        // Embed references
        for (let [node, children] of stixChildren) {
            let node_key = Object.entries(node)[0][0]
            switch(node[node_key].type) {
                    case "start":
                        if (children.length !== 1){
                            throw new Error("Unexpected children count of START node!")
                        }
                        let startId = Object.entries(children[0].obj)[0][0]  
                        cacaoPlaybook.workflow_start = startId
                        node[node_key]['on_completion'] = startId
                        break;

                    case "action":
                        if (children.length !== 1){
                            throw new Error("Unexpected children count of ACTION node!")
                        }
                        
                        let actionId = Object.entries(children[0].obj)[0][0]          
                        node[node_key]['on_completion'] = actionId
                        break;

                    case "parallel":
                        if (children.length < 1){
                            throw new Error("Unexpected children count of PARALLEL node!")
                        }
                        for (let child of children){
                            let parallelId = Object.entries(child.obj)[0][0]
                            node[node_key].next_steps?.push(parallelId)                            
                        }
                        break;
                        
                    case "one_of":
                        if (children.length < 1){
                            throw new Error("Unexpected children count of PARALLEL node!")
                        }
                        for (let child of children){
                            let oneOfId = Object.entries(child.obj)[0][0]          
                            node[node_key].united_steps?.push(oneOfId)
                        }
                        break; 
                    
                    case "and":
                        if (children.length !== 1){
                            throw new Error("Unexpected children count of START node!")
                        }
                        
                        let andId = Object.entries(children[0].obj)[0][0]          
                        node[node_key]['on_completion'] = andId
                        break; 

                    case "or":
                        if (children.length !== 1){
                            throw new Error("Unexpected children count of START node!")
                        }
                        
                        let orId = Object.entries(children[0].obj)[0][0]          
                        node[node_key]['on_completion'] = orId                             
                        break;     

                    case "end":

                        break;

                    default:
                        throw new Error(`Unexpected node type: ${node[node_key].type}`)
                }
        }

        for (let [node, _] of stixChildren) {
            let node_key = Object.entries(node)[0][0]
            cacaoPlaybook.workflow[node_key] = node[node_key]
        }

        // Return playbook as string
        return JSON.stringify(cacaoPlaybook, null, 2);
    }
    createCacaoConditionNode(stixId: string = Crypto.randomUUID()): {[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction} {
        let cacaoCondition: CacaoConditionStep = {
            type: "condition",
            on_true: "",
            on_false: ""
        };
        let id = `condition--${stixId}`;
        return {[id]: cacaoCondition};
    }
    createOrNode(node: GraphObjectExport, stixId: string = Crypto.randomUUID()): {[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction} {
        let ermackOr: CacaoWorkflowStep = {
            type: "or"
        };
        let id = `or--${stixId}`;
        return {[id]: ermackOr};
    }
    createAndNode(node: GraphObjectExport, stixId: string = Crypto.randomUUID()): {[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction} {
        let ermackAnd: CacaoWorkflowStep = {
            type: "and"
        };
        let id = `and--${stixId}`;
        return {[id]: ermackAnd};
    }
    createOneOfNode(node: GraphObjectExport, stixId: string = Crypto.randomUUID()): {[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction} {
        let ermackOneOf: CacaoWorkflowStep = {
            type: "one_of",
            united_steps: []
        };
        let id = `one-of--${stixId}`;
        return {[id]: ermackOneOf};        
    }


    ///////////////////////////////////////////////////////////////////////////
    //  1. Stix Node Creation  ////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    private createCacaoStartNode(stixId: string = Crypto.randomUUID()): {[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction} {
        let cacaoStart: CacaoWorkflowStep = {
            type: "start"
        };
        let id = `start--${stixId}`;
        return {[id]: cacaoStart};
    }

    private createCacaoEndNode(stixId: string = Crypto.randomUUID()): {[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction} {
        let cacaoStart: CacaoWorkflowStep = {
            type: "end"
        };
        let id = `end--${stixId}`;
        return {[id]: cacaoStart};
    }

    private createCacaoParallelNode(stixId: string = Crypto.randomUUID()): {[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction} {
        let cacaoParallel: CacaoParallelStep = {
            type: "parallel",
            next_steps: []
        };
        let id = `parallel--${stixId}`;
        return {[id]: cacaoParallel};
    }

    private createErmackOneOfNode(stixId: string = Crypto.randomUUID()): {[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction} {
        let ermackOneOf: ErmackOneOfStep = {
            type: "one-of",
            united_steps: []
        };
        let id = `one-of--${stixId}`;
        return {[id]: ermackOneOf};
    }
    
    // /**
    //  * Merges an action's properties into a STIX action node.
    //  * @param node
    //  *  The STIX action node.
    //  * @param property
    //  *  The action's properties.
    //  */
    // private mergeActionProperty(node: ErmackAction, property: DictionaryProperty) {
    //     for (let [key, prop] of property.value) {
    //         if (prop.isDefined()) {
    //             node[key] = prop.toRawValue();
    //         }            
    //     }
    // }

    /**
     * Merges a basic dictionary into a STIX node.
     * @param node
     *  The STIX node.
     * @param property
     *  The dictionary property.
     */
    private createBasicNode(node: GraphObjectExport): [string, CacaoWorkflowStep] {
        for (let prop of node.props.toRawValue()) {
            console.log(prop)
            // switch (prop.type) {
            //     case PropertyType.Dictionary:
            //         throw new Error("Basic dictionaries cannot contain dictionaries.");
            //     case PropertyType.Enum:
            //         if (prop instanceof EnumProperty && prop.isDefined()) {
            //             let value = prop.toReferenceValue()!.toRawValue()!;
            //             node[key] = value === "True";
            //         }
            //         break;
            //     case PropertyType.List:
            //         if (prop.isDefined()) {
            //             this.mergeBasicListProperty(node, key, prop as ListProperty);
            //         }
            //         break;
            //     default:
            //         if (prop.isDefined()) {
            //             node[key] = prop.toRawValue();
            //         }
            //         break;
            // }
        }
        let a : CacaoWorkflowStep = {
            type: "test"
        }
        return ["", a]
    }

    /**
     * Merges a basic list into a STIX node.
     * @param node
     *  The STIX node.
     * @param key
     *  The list property's key.
     * @param property
     *  The list property.
     */
    private mergeBasicListProperty(node: Sdo, key: string, property: ListProperty) {
        node[key] = [];
        for (let prop of property.value.values()) {
            switch (prop.type) {
                case PropertyType.Dictionary:
                    throw new Error("Basic lists cannot contain dictionaries.");
                case PropertyType.List:
                    throw new Error("Basic lists cannot contain lists.");
                case PropertyType.Enum:
                    throw new Error("Basic lists cannot contain enums.");
                default:
                    if (prop.isDefined()) {
                        node[key].push(prop.toRawValue());
                    }
                    break;
            }
        }
    }


    ///////////////////////////////////////////////////////////////////////////
    //  2. Relationships Embeddings  //////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    /**
     * Embed a reference to each child in the parent. If any of the children
     * cannot be embedded, return a new SRO in its place.
     *
     * @remarks
     * While processing each node, we also process the in edges and out edges of that
     * node. Some edges may be represented as embedded refs in the node's SDO, and
     * others may be represented as separate relationship objects (i.e. SROs), therefore
     * this method can return multiple objects.
     *
     * @param parent
     *  The STIX node.
     * @param children
     *  The STIX node's children.
     * @returns
     *  Zero or more SROs.
     */
    private tryEmbed(parent: Sdo, children: Link[]): Sro[] {
        let SROs = [];
        // Attempt to embed children in parent
        for (const c of children) {
            let sro = null;
            switch (parent.type) {
                case "attack-action":
                    sro = this.tryEmbedInAction(parent, c.obj);
                    break;
                case "attack-asset":
                    sro = this.tryEmbedInAsset(parent, c.obj);
                    break;
                case "attack-condition":
                    sro = this.tryEmbedInCondition(parent, c.obj, c.via);
                    break;
                case "attack-operator":
                    sro = this.tryEmbedInOperator(parent, c.obj);
                    break;
                case "note":
                    this.tryEmbedInNote(parent, c.obj);
                    break;
                default:
                    sro = this.tryEmbedInDefault(parent, c.obj);
            }
            // If embed failed, append SRO
            if (sro) {
                SROs.push(sro);
            }
        }
        return SROs;
    }

    /**
     * Embed a reference to the child in the action. If the child cannot be
     * embedded, return a new SRO.
     * @param parent
     *  A STIX action node.
     * @param child
     *  A STIX child node.
     * @returns
     *  An SRO, if one was created.
     */
    private tryEmbedInAction(parent: Sdo, child: Sdo): Sro | undefined {
        let sro;
        switch (child.type) {
            case "process":
                /**
                 * Note:
                 * If there are multiple children with type "process", only the
                 * first one will be set as the command ref. The others will be
                 * set as SROs.
                 */
                if (parent.command_ref) {
                    sro = this.createSro(parent, child);
                } else {
                    parent.command_ref = child.id;
                }
                break;
            case "attack-asset":
                if (!parent.asset_refs) {
                    parent.asset_refs = [];
                }
                parent.asset_refs.push(child.id);
                break;
            case "attack-action":
            // Falls through
            case "attack-operator":
            // Falls through
            case "attack-condition":
                if (!parent.effect_refs) {
                    parent.effect_refs = [];
                }
                parent.effect_refs.push(child.id);
                break;
            default:
                sro = this.createSro(parent, child);
        }
        return sro;
    }

    /**
     * Embed a reference to the child in the asset. If the child cannot be
     * embedded, return a new SRO.
     * @param parent
     *  A STIX asset node.
     * @param child
     *  A STIX child node.
     * @returns
     *  An SRO, if one was created.
     */
    private tryEmbedInAsset(parent: Sdo, child: Sdo): Sro | undefined {
        let sro;
        /**
         * Note:
         * If there are multiple children, only the first one will be set as
         * the object_ref. The others will be set as SROs.
         */
        if (parent.object_ref) {
            sro = this.createSro(parent, child);
        } else {
            parent.object_ref = child.id;
        }
        return sro;
    }

    /**
     * Embed a reference to the child in the condition. If the child cannot be
     * embedded, return a new SRO.
     * @param parent
     *  A STIX condition node.
     * @param child
     *  A STIX child node.
     * @param via
     *  The route the child is connected through.
     * @returns
     *  An SRO, if one was created.
     */
    private tryEmbedInCondition(parent: Sdo, child: Sdo, via: string): Sro | undefined {
        let sro;
        switch (child.type) {
            case "attack-action":
            // Falls through
            case "attack-operator":
            // Falls through
            case "attack-condition":
                switch (via) {
                    case "true_anchor":
                        if (!parent.on_true_refs) {
                            parent.on_true_refs = [];
                        }
                        parent.on_true_refs.push(child.id);
                        break;
                    case "false_anchor":
                        if (!parent.on_false_refs) {
                            parent.on_false_refs = [];
                        }
                        parent.on_false_refs.push(child.id);
                        break;
                    default:
                        sro = this.createSro(parent, child);
                        break;
                }
                break;
            default:
                sro = this.createSro(parent, child);
        }
        return sro;
    }

    /**
     * Embed a reference to the child in the operator. If the child cannot be
     * embedded, return a new SRO.
     * @param parent
     *  A STIX operator node.
     * @param child
     *  A STIX child node.
     * @returns
     *  An SRO, if one was created.
     */
    private tryEmbedInOperator(parent: Sdo, child: Sdo): Sro | undefined {
        let sro;
        switch (child.type) {
            case "attack-action":
            // Falls through
            case "attack-operator":
            // Falls through
            case "attack-condition":
                if (!parent.effect_refs) {
                    parent.effect_refs = [];
                }
                parent.effect_refs.push(child.id);
                break;
            default:
                sro = this.createSro(parent, child);
        }
        return sro;
    }

    /**
     * Embed a reference to the child in the note. If the child cannot be
     * embedded, return a new SRO.
     * @param parent
     *  A STIX note node.
     * @param child
     *  A STIX child node.
     * @returns
     *  An SRO, if one was created.
     */
    private tryEmbedInNote(parent: Sdo, child: Sdo): void {
        if (!parent.object_refs) {
            parent.object_refs = [];
        }
        parent.object_refs.push(child.id);
    }

    /**
     * Embed a reference to the child in the parent. If the child cannot be
     * embedded, return a new SRO.
     * @param parent
     *  A STIX parent node.
     * @param child
     *  A STIX child node.
     * @returns
     *  An SRO, if one was created.
     */
    private tryEmbedInDefault(parent: Sdo, child: Sdo): Sro {
        return this.createSro(parent, child);
    }


    ///////////////////////////////////////////////////////////////////////////
    //  3. CACAO Playbook  ////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    /**
     * Create the initial CACAO playbook.
     * @returns
     *  The initial CACAO playbook.
     */
    private createCacaoPlaybookStub(stixId: string = Crypto.randomUUID()): CacaoPlaybook {
        let playbook: CacaoPlaybook = {
            type: "playbook",
            id: `response--${stixId}`,
            ...ErmackSpec,
            created: "",
            modified: "",
            created_by: "",
            workflow_start: "",
            workflow: {}
        };

        return playbook;
    }

    /**
     * Creates the extension-definition SDO.
     * @param creatorId
     *  The creator's id.
     * @returns
     *  The extension-definition SDO.
     */
    private createExtensionSdo(creatorId: string): ExtensionSdo {
        let obj = this.createSdo("extension-definition", AttackFlowExtensionId);
        return {
            ...obj,
            name: "Attack Flow",
            description: "Extends STIX 2.1 with features to create Attack Flows.",
            created: AttackFlowExtensionCreatedDate,
            modified: AttackFlowExtensionModifiedDate,
            created_by_ref: creatorId,
            schema: AttackFlowSchemaUrl,
            version: AttackFlowSchemaVersion,
            extension_types: ["new-sdo"],
            external_references: [
                AttackFlowDocsExternalReference,
                AttackFlowGitHubExternalReference,
            ]
        };
    }

    /**
     * Creates the extension-definition author SDO.
     * @returns
     *  The extension-definition author SDO.
     */
    private createExtensionAuthorSdo(): ExtensionAuthorSdo {
        let obj = this.createSdo("identity", AttackFlowExtensionId);
        return {
            ...obj,
            create_by_ref: obj.id,
            name: AttackFlowExtensionCreatorName,
            identity_class: "organization",
            created: AttackFlowExtensionCreatedDate,
            modified: AttackFlowExtensionModifiedDate
        };
    }

    /**
     * Creates the attack flow SDO.
     * @param id
     *  The page's id.
     * @param page
     *  The page object.
     * @param authorId
     *  The author's id.
     */
    private createFlowSdo(id: string, page: GraphObjectExport, authorId: string): Sdo {

        // Create flow
        let flow: Sdo = {
            ...this.createSdo(page.template.id, id),
            created_by_ref: authorId,
            start_refs: []
        };

        // Merge properties
        for (let [key, prop] of page.props.value) {
            switch (key) {
                case "author":
                    // Author SDO is exported separately
                    break;
                case "external_references":
                    if (!(prop instanceof ListProperty)) {
                        throw new Error(`'${key}' is improperly defined.`);
                    }
                    if (prop.descriptor.form.type !== PropertyType.Dictionary) {
                        throw new Error(`'${key}' is improperly defined.`);
                    }
                    flow[key] = [];
                    for (let ref of prop.value.values()) {
                        let entries = ref.toRawValue() as RawEntries;
                        flow[key].push(Object.fromEntries(entries));
                    }
                    break;
                case "scope":
                    if (!(prop instanceof EnumProperty)) {
                        throw new Error(`'${key}' is improperly defined.`);
                    }
                    if (!prop.isDefined()) {
                        break;
                    }
                    flow[key] = prop
                        .toReferenceValue()!
                        .toString()
                        .toLocaleLowerCase();
                    break;
                default:
                    if (prop.isDefined()) {
                        flow[key] = prop.toRawValue();
                    }
                    break;
            }
        }

        // Return flow
        return flow;

    }

    /**
     * Creates the attack flow author SDO.
     * @param page
     *  The page object.
     * @returns
     *  The attack flow author SDO.
     */
    private createFlowAuthorSdo(page: GraphObjectExport): Sdo {
        let props = page.props.value.get("author");

        // Create author
        let author = this.createSdo("identity");

        // Merge properties
        if (props instanceof CollectionProperty) {
            for (let [key, prop] of props.value) {
                switch (key) {
                    case "identity_class":
                        if (!(prop instanceof EnumProperty)) {
                            throw new Error(`'${key}' is improperly defined.`);
                        }
                        if (!prop.isDefined()) {
                            break;
                        }
                        author[key] = prop
                            .toReferenceValue()!
                            .toString()
                            .toLocaleLowerCase();
                        break;
                    default:
                        if (prop.isDefined()) {
                            author[key] = prop.toRawValue();
                        }
                        break;
                }
            }
        } else {
            throw new Error("'author' is improperly defined.");
        }

        // Return author
        return author;

    }


    ///////////////////////////////////////////////////////////////////////////
    //  4. SDO & SRO  /////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    /**
     * Creates a STIX Domain Object (SDO).
     * @param template
     *  The STIX object's template.
     * @param stixId
     *  The STIX object's id.
     *  (Default: Randomly generated)
     * @returns
     *  The SDO object.
     */
    private createSdo(template: string, stixId: string = Crypto.randomUUID()): Sdo {
        let now = new Date().toISOString();
        let type = (AttackFlowTemplatesMap.get(template) ?? template).replace(/_/g, "-");

        // Create SDO
        let sdo: Sdo = {
            type: type,
            id: `${type}--${stixId}`,
            spec_version: "2.1",
            created: now,
            modified: now,
        };

        // Declare extension on Attack Flow SDOs.
        if (AttackFlowSdos.has(type)) {
            sdo.extensions = {
                [`extension-definition--${AttackFlowExtensionId}`]: {
                    extension_type: "new-sdo",
                }
            };
        }

        // Return SDO
        return sdo;
    }

    /**
     * Creates a STIX Relationship Object (SRO).
     * @param parent
     *  The parent STIX node.
     * @param child
     *  The child STIX node.
     * @param type
     *  The relationship type.
     *  (Default: related-to)
     * @returns
     *  The SRO object.
     */
    private createSro(parent: Sdo, child: Sdo, type: string = "related-to"): Sro {
        const stixId = Crypto.randomUUID();
        const now = new Date().toISOString();
        return {
            type: "relationship",
            id: `relationship--${stixId}`,
            spec_version: "2.1",
            created: now,
            modified: now,
            relationship_type: type,
            source_ref: parent.id,
            target_ref: child.id
        };
    }

    /**
     * Creates a STIX Domain Object (SDO).
     * @param template
     *  The STIX object's template.
     * @param stixId
     *  The STIX object's id.
     *  (Default: Randomly generated)
     * @returns
     *  The SDO object.
     */
    private createCacaoActionNode(node: GraphObjectExport, stixId: string = Crypto.randomUUID()): {[key:string]: CacaoWorkflowStep|CacaoParallelStep|ErmackOneOfStep|ErmackAction} {
        let now = new Date().toISOString();
        let properties = node.props.toRawValue()

        // Create SDO
        let ermackAction: ErmackAction = {
            type: "action",
            author: "",
            created: now,
            modified: now,
            description: "",
            extended_description: "",
            id: "",
            stage: "",
            title: "",
            ...Object.fromEntries(properties)
        };

        let actionId = `action--${stixId}`;
        // Return SDO
        return {[actionId]: ermackAction};
    }

    ///////////////////////////////////////////////////////////////////////////
    //  5. Helpers  ///////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    /**
     * Resolves a set of subproperties from a collection property.
     * @param property
     *  The collection property.
     * @param ids
     *  The subproperty id's.
     * @returns
     *  The subproperties.
     */
    private getSubproperties(property: CollectionProperty, ...ids: string[]): Property[] {
        let subproperties = [];
        for (let id of ids) {
            let prop = property.value.get(id);
            if (prop) {
                subproperties.push(prop);
            } else {
                throw new Error(`${id} was not defined on root property.`);
            }
        }
        return subproperties;
    }

}

export default CacaoPublisher;