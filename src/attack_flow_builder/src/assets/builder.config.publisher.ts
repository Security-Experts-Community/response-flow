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


///////////////////////////////////////////////////////////////////////////////
//  Publisher Constants  //////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


export const AttackFlowExtensionId
    = "fb9c968a-745b-4ade-9b25-c324172197f4";

export const AttackFlowSchemaUrl
    = "https://center-for-threat-informed-defense.github.io/attack-flow/stix/attack-flow-schema-2.0.0.json";

export const AttackFlowSchemaVersion
    = "2.0.0";

export const AttackFlowExtensionCreatedDate
    = "2022-08-02T19:34:35.143Z";

export const AttackFlowExtensionModifiedDate
    = AttackFlowExtensionCreatedDate;

export const AttackFlowDocsExternalReference =
    {
        source_name: "Documentation",
        description: "Documentation for Attack Flow",
        url: "https://center-for-threat-informed-defense.github.io/attack-flow"
    };

export const AttackFlowGitHubExternalReference =
    {
        source_name: "GitHub",
        description: "Source code repository for Attack Flow",
        url: "https://github.com/center-for-threat-informed-defense/attack-flow"
    };

export const AttackFlowExtensionCreatorName
    = "MITRE Engenuity Center for Threat-Informed Defense";

export const AttackFlowSdos
    = new Set<string>([
        "attack-flow",
        "attack-action",
        "attack-asset",
        "attack-condition",
        "attack-operator"
    ]);

export const AttackFlowTemplatesMap: Map<string, string>
    = new Map([
        ["flow", "attack-flow"],
        ["action", "attack-action"],
        ["asset", "attack-asset"],
        ["condition", "attack-condition"],
        ["or", "attack-operator"],
        ["and", "attack-operator"],
    ]);


///////////////////////////////////////////////////////////////////////////////
//  Attack Flow Publisher  ////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


class AttackFlowPublisher extends DiagramPublisher {

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
        if(page) {
            graph.nodes.delete(pageId);
        } else {
            throw new Error("Page object missing from export.")
        }

        // Create bundle
        let stixBundle = this.createStixBundle();
        let author = this.createFlowAuthorSdo(page);
        let flow = this.createFlowSdo(pageId, page, author.id);
        stixBundle.objects.push(flow);
        stixBundle.objects.push(author);

        // Graph ID -> STIX node.
        let stixNodes = new Map<string, Sdo>();
        // Parent STIX node -> Child Links
        let stixChildren = new Map<Sdo, Link[]>();

        // Create SDOs and SCOs from graph nodes
        for (let [id, node] of graph.nodes) {
            let stixNode = this.toStixNode(id, node);
            stixBundle.objects.push(stixNode);
            stixNodes.set(id, stixNode);
            stixChildren.set(stixNode, []);
        }

        // Create adjacency list from graph edges
        for (let edge of graph.edges.values()) {
            let prev = edge.prev;
            let next = edge.next;
            // Skip edges that don't connect two nodes
            if(prev.length !== 1 || next.length !== 1)
                continue;
            // Register link
            let prevNode = stixNodes.get(prev[0]);
            let nextNode = stixNodes.get(next[0]);
            if (prevNode && nextNode) {
                stixChildren.get(prevNode)!.push({
                    obj: nextNode,
                    via: edge.prevLinkMap.keys().next().value
                });
            } else {
                throw new Error(`Edge '${ edge }' is missing one or more nodes.`);
            }
        }

        // Embed references
        for (let [node, children] of stixChildren) {
            let SROs = this.tryEmbed(node, children);
            // If any embeds failed, append SROs
            stixBundle.objects.push(...SROs);
        }

        // Configure flow roots
        for(let [id, value] of graph.nodes) {
            let type = value.template.id;
            // Node must be an action or condition
            switch(type) {
                case "action":
                case "condition":
                    break;
                default:
                    continue;
            }
            // Node parent cannot be an action or condition
            let invalidParentType = false;
            for(let edgeId of value.prev) {
                // Resolve parent
                let edge = graph.edges.get(edgeId)!;
                let nodeId = edge.prev[0];
                if(!nodeId) {
                    continue;
                }
                // Check parent type
                let node = graph.nodes.get(nodeId)!;
                switch(node.template.id) {
                    case "action":
                    case "condition":
                        invalidParentType = true;
                        break;
                }
            }
            if(invalidParentType) {
                continue;
            }
            // Add flow root
            let stixId = stixNodes.get(id)!.id;
            flow.start_refs.push(stixId);
        }

        // Return bundle as string
        return JSON.stringify(stixBundle, null, 2);
    }


    ///////////////////////////////////////////////////////////////////////////
    //  1. Stix Node Creation  ////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    /**
     * Exports a graph object to an SDO or SCO.
     * @param id
     *  The graph object's id.
     * @param node
     *  The graph object.
     * @returns
     *  The exported SDO or SCO.
     */
    private toStixNode(id: string, node: GraphObjectExport): Sdo {
        let obj = this.createSdo(node.template.id, id);
        switch(obj.type) {
            case "attack-action":
                this.mergeActionProperty(obj, node.props);
                break;
            default:
                this.mergeBasicDictProperty(obj, node.props);
                break;
        }
        return obj;
    }

    /**
     * Merges an action's properties into a STIX action node.
     * @param node
     *  The STIX action node.
     * @param property
     *  The action's properties.
     */
    private mergeActionProperty(node: Sdo, property: DictionaryProperty) {
        for(let [key, prop] of property.value) {
            switch(key) {
                case "confidence":
                    if(!(prop instanceof EnumProperty)) {
                        throw new Error("'confidence' is improperly defined.");
                    }
                    if(!prop.isDefined()) {
                        break;
                    }
                    prop = prop.toReferenceValue()!;
                    if(!(prop instanceof DictionaryProperty)) {
                        throw new Error("'confidence' is improperly defined.");
                    }
                    [ prop ] = this.getSubproperties(prop, "value");
                    // Fall through
                default:
                    if(prop.isDefined()) {
                        node[key] = prop.toRawValue();
                    }
            }
        }
    }

    /**
     * Merges a basic dictionary into a STIX node.
     * @param node
     *  The STIX node.
     * @param property
     *  The dictionary property.
     */
    private mergeBasicDictProperty(node: Sdo, property: DictionaryProperty) {
        for(let [key, prop] of property.value) {
            switch(prop.type) {
                case PropertyType.Dictionary:
                    throw new Error("Basic dictionaries cannot contain dictionaries.");
                case PropertyType.Enum:
                    if (prop instanceof EnumProperty && prop.isDefined()) {
                        let value = prop.toReferenceValue()!.toRawValue()!;
                        node[key] = value === "True";
                    }
                    break;
                case PropertyType.List:
                    if (prop.isDefined()) {
                        this.mergeBasicListProperty(node, key, prop as ListProperty);
                    }
                    break;
                default:
                    if(prop.isDefined()) {
                        node[key] = prop.toRawValue();
                    }
                    break;
            }
        }
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
        for(let prop of property.value.values()) {
            switch(prop.type) {
                case PropertyType.Dictionary:
                    throw new Error("Basic lists cannot contain dictionaries.");
                case PropertyType.List:
                    throw new Error("Basic lists cannot contain lists.");
                case PropertyType.Enum:
                    throw new Error("Basic lists cannot contain enums.");
                default:
                    if(prop.isDefined()) {
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
                switch(via) {
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
        if(!parent.object_refs) {
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
    //  3. Stix Bundle  ///////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////


    /**
     * Create the initial STIX bundle with required extension/creator SDOs.
     * @returns
     *  The initial STIX bundle with required extension/creator SDOs.
     */
    private createStixBundle(): BundleSdo {
        const extensionAuthor = this.createExtensionAuthorSdo();
        const extension = this.createExtensionSdo(extensionAuthor.id);
        return {
            ...this.createSdo("bundle"),
            objects             : [extension, extensionAuthor]
        };
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
            name                : "Attack Flow",
            description         : "Extends STIX 2.1 with features to create Attack Flows.",
            created             : AttackFlowExtensionCreatedDate,
            modified            : AttackFlowExtensionModifiedDate,
            created_by_ref      : creatorId,
            schema              : AttackFlowSchemaUrl,
            version             : AttackFlowSchemaVersion,
            extension_types     : ["new-sdo"],
            external_references : [
                AttackFlowDocsExternalReference,
                AttackFlowGitHubExternalReference,
            ]
        }
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
            create_by_ref       : obj.id,
            name                : AttackFlowExtensionCreatorName,
            identity_class      : "organization",
            created             : AttackFlowExtensionCreatedDate,
            modified            : AttackFlowExtensionModifiedDate
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
            created_by_ref      : authorId,
            start_refs          : []
        }

        // Merge properties
        for(let [key, prop] of page.props.value) {
            switch(key) {
                case "author":
                    // Author SDO is exported separately
                    break;
                case "external_references":
                    if(!(prop instanceof ListProperty)) {
                        throw new Error(`'${ key }' is improperly defined.`);
                    }
                    if(prop.descriptor.form.type !== PropertyType.Dictionary) {
                        throw new Error(`'${ key }' is improperly defined.`);
                    }
                    flow[key] = [];
                    for(let ref of prop.value.values()) {
                        let entries = ref.toRawValue() as RawEntries;
                        flow[key].push(Object.fromEntries(entries));
                    }
                    break;
                case "scope":
                    if(!(prop instanceof EnumProperty)) {
                        throw new Error(`'${ key }' is improperly defined.`);
                    }
                    if(!prop.isDefined()) {
                        break;
                    }
                    flow[key] = prop
                        .toReferenceValue()!
                        .toString()
                        .toLocaleLowerCase();
                    break;
                default:
                    if(prop.isDefined()) {
                        flow[key] = prop.toRawValue()
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
        if(props instanceof CollectionProperty) {
            for(let [key, prop] of props.value) {
                switch(key) {
                    case "identity_class":
                        if(!(prop instanceof EnumProperty)) {
                            throw new Error(`'${ key }' is improperly defined.`);
                        }
                        if(!prop.isDefined()) {
                            break;
                        }
                        author[key] = prop
                            .toReferenceValue()!
                            .toString()
                            .toLocaleLowerCase();
                        break;
                    default:
                        if(prop.isDefined()) {
                            author[key] = prop.toRawValue()
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
            type                : type,
            id                  : `${ type }--${ stixId }`,
            spec_version        : "2.1",
            created             : now,
            modified            : now,
        }

        // Declare extension on Attack Flow SDOs.
        if (AttackFlowSdos.has(type)) {
            sdo.extensions = {
                [`extension-definition--${ AttackFlowExtensionId }`] : {
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
            type                : "relationship",
            id                  : `relationship--${ stixId }`,
            spec_version        : "2.1",
            created             : now,
            modified            : now,
            relationship_type   : type,
            source_ref          : parent.id,
            target_ref          : child.id
        };
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
        for(let id of ids) {
            let prop = property.value.get(id);
            if(prop) {
                subproperties.push(prop);
            } else {
                throw new Error(`${ id } was not defined on root property.`);
            }
        }
        return subproperties;
    }

}

export default AttackFlowPublisher;


///////////////////////////////////////////////////////////////////////////
//  Internal Types  ///////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////


export type Sdo = {
    type         : string,
    id           : string,
    spec_version : string,
    created      : string,
    modified     : string,
    extensions?   : {
        [key: string] : {
            extension_type: string
        }
    },
    [key: string]: any
}

export type Sro = {
    type              : string,
    id                : string,
    spec_version      : string,
    created           : string,
    modified          : string,
    relationship_type : string,
    source_ref        : string,
    target_ref        : string
}

export type ExtensionSdo = Sdo & {
    name                : string,
    description         : string,
    created             : string,
    modified            : string,
    created_by_ref      : string,
    schema              : string,
    version             : string,
    extension_types     : string[],
    external_references : {
        source_name: string,
        description: string,
        url: string
    }[]
}

export type ExtensionAuthorSdo = Sdo & {
    create_by_ref  : string,
    name           : string,
    identity_class : string,
    created        : string,
    modified       : string
}

type BundleSdo = Sdo & {
    objects : [ExtensionSdo, ExtensionAuthorSdo, ...Sdo[]]
}

export type Link = {
    obj: Sdo,
    via: string
}
