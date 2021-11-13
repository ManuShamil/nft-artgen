const path = require('path')
const wildcardMatch = require('wildcard-match')
const { readFile } = require('../controllers/files')

const NODE_SELECTION_MODE = {
    OR: 0,
    AND: 1,
    NONE: 2
}

class Node
{
    nodeName = ''
    layerName = null
    parent = null
    attributes = {}
    children = []
    childLength = 0
    depth = 0
    isDir = false
    fullPath = null
    isLayer = false
    isConfig = false
    config = null
    weight = 1

    nthIndex = 0
    
    constructor(  nodeName, parent )
    {
        this.nodeName = nodeName
        this.parent = parent
    }

    isFile = () =>  !this.isDir

    getChildNode = 
    ( nodeName ) => this.children.find( childNode => childNode.nodeName == nodeName )

    getDepth = () =>
    {
        let depth = 0

        let parent = this.parent

        if ( parent ) depth = parent.depth + 1

        return depth
    }

    deleteNode = ( nodeName ) => {

        nodeName = nodeName.toLowerCase()

        this.children = this.children.filter( child => child.nodeName.toLowerCase() != nodeName )

        this.childLength = this.children.length
    }

    insertNode = ( parts ) => 
    {
        var part = parts[0]

        var newNode = this.getChildNode( part )

        if ( !newNode)
        {
            newNode = new Node( part, this )
            newNode.depth = this.getDepth() + 1
            newNode.nthIndex = this.childLength

            this.children.push( newNode )
            this.childLength++
        }

        parts = parts.slice(1)

        if ( parts.length > 0)
            newNode.insertNode( parts )
    }

    getFullPath = () => {
        if ( this.fullPath != null )
            return this.fullPath

        let pathArray = []

        let nodeName = this.nodeName
        let parent = this.parent

        pathArray.push( nodeName )

        while ( parent != null )
        {
            nodeName = parent.nodeName

            pathArray.push( nodeName )

            parent = parent.parent
        }

        pathArray.reverse()
        this.fullPath = pathArray.join( path.sep )

        return this.fullPath
    }

    hasChildren = () => this.children.length > 0

    getChildren = () => this.children

    getChildrenHierarchy = ( children ) => {

        this.children.forEach(
            child => {

                children.push( child )

                if ( child.hasChildren() )
                    child.getChildrenHierarchy( children )
            }
        )
    }

    readNode = () => {
        
        return readFile( this.getFullPath() )

    }

    isDirectLayerParent = () => this.layerName != null

    setAttribute = ( config ) => {

        if ( config == undefined ) return

        if ( config.layerName != undefined )
            this.parent.layerName = config.layerName
        
        let selectionModes = config.selectionType

        let mode = 'OR'

        for ( let config of selectionModes )
        {
            mode = config['mode']
            let pattern = config['pattern']
            let index = config['index']

            const wcmatch = wildcardMatch( pattern.toLocaleLowerCase() )

            if ( wcmatch( this.nodeName.toLocaleLowerCase() ) )
            {
                if ( index != undefined )
                    this.attributes[ 'index' ] = index

                switch (mode.toLowerCase()) 
                {
                    case 'or':
                        mode = NODE_SELECTION_MODE.OR
                        break;
                    case 'and':
                        mode = NODE_SELECTION_MODE.AND
                        break;
                    default:
                        mode = NODE_SELECTION_MODE.NONE
                        break;
                }

                
                this.attributes[ 'selectionType' ] = mode
            }

        }

    }
}

class SelectionNode
{
    node = null
    children = []
    selectionType = NODE_SELECTION_MODE.AND
    isDirectLayerParent = false

    constructor( node )
    {
        this.node = node
    }

    build = () => {

        let nodeChildren = this.node.children

        nodeChildren.forEach( 
            node => {

                let newNode = new SelectionNode( node )


                if ( node.attributes.selectionType != undefined )
                    newNode.selectionType = node.attributes.selectionType

                newNode.isDirectLayerParent = node.isDirectLayerParent()

                newNode.build()

                this.insertNode( newNode )
            }
        )
    }

    chooseFromRandomWithWeight = ( selectionNodesArray ) => 
    {

        let totalWeight = 0

        selectionNodesArray.forEach( selectionNode => totalWeight += selectionNode.node.weight )

        let randomWeight = Math.floor( Math.random() * totalWeight )

        let selectedNode = selectionNodesArray [ Math.floor( Math.random() * selectionNodesArray.length ) ]

        for ( let i=0; i<selectionNodesArray.length; i++ )
        {
            let selectionNode = selectionNodesArray[i]

            let nodeWeight = selectionNode.node.weight
            
            randomWeight -= nodeWeight

            if ( randomWeight < 0 )
            {
                selectedNode = selectionNode
                break;
            }
        }

        return selectedNode
    }

    process = () => {

        let chosenChildren = this.children.filter( node => node.selectionType == NODE_SELECTION_MODE.AND )

        let randomChildren = this.children.filter( node => node.selectionType == NODE_SELECTION_MODE.OR )
        
        //let randomIndex = Math.floor(Math.random() * randomChildren.length)

        let chosenFromRandom = this.chooseFromRandomWithWeight( randomChildren )

        chosenChildren.push( chosenFromRandom )

        //console.log( 'chosen',chosenChildren )

        this.children = chosenChildren

        this.children.forEach( node => 
            {   
                if ( node != undefined)
                    node.process()
            }
        )
    }

    getNode = () => this.node

    insertNode( node )
    {
        this.children.push( node )
    }

    buildMetaData( output )
    {
        if ( this.node.isFile() )
        {
            if ( this.node.parent != undefined && this.node.parent.isDirectLayerParent() )
            {
                let layerName = this.node.parent.layerName
                let data = {}
    
                data = 
                {
                    layerName,
                    index: this.node.attributes.index == undefined ? 0 : this.node.attributes.index,
                    image: this.node.nodeName,
                    depth: this.node.depth,
                    nthIndex: this.node.nthIndex,
                    fullpath: this.node.getFullPath(),
                    isFile: this.node.isFile(),
                    selectionType: this.node.attributes.selectionType,
                    weight: this.node.weight
                }
                
                output.push( data )
                //console.log( data )
            }

        }

        this.children.forEach( node => 
            {
                if ( node != undefined)
                    node.buildMetaData( output ) 
            }
        )
    }
}

module.exports = {
    Node,
    SelectionNode,
    NODE_SELECTION_MODE
}
