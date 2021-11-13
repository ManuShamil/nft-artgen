const path = require('path')
const util = require('util')
const wcmatch = require('wildcard-match')

const Tree = require('../models/tree')
const { NODE_SELECTION_MODE, SelectionNode } = require('../models/node')

const { isDirectory } = require('./files')

const getParts = 
( files ) => {
    
    var parts = []

    files.forEach(
        ( item ) => 
        {
            item = path.normalize( item )

            var splitParts = item.split( path.sep )
            parts.push( splitParts )
        }
    )

    return parts    
} 

const convertToTree = ( files ) => {
    filesInParts = getParts( files )

    let layerName = filesInParts[0][0]

    var tree = new Tree( layerName )

    filesInParts.forEach(parts => tree.insertNode( parts ))

    //console.log(  util.inspect(tree, {showHidden: false, depth: null, colors: true} )  )

    return tree 
}

const validateConfig = ( config ) => {
    
    let keys = Object.keys( config )

    if ( !keys.includes( 'selectionType' ) || !Array.isArray(config[ 'selectionType']))
        return false

    return true
}

const getWeightFromNodeName = (nodeName) => 
{
    if ( nodeName == undefined ) return 1
    
    let weight = 1

    let weightPart = nodeName.split('#')

    if ( weightPart.length <= 1 )
        return weight

    weightPart = weightPart[1]
    splitParts = weightPart.split('.')

    weightPart = []
    splitParts.forEach( val => { 

        let num = Number( val )

        if ( !isNaN( num ) ) weightPart.push(num) 
        
    })
    
    weight = Number(weightPart.join('.'))

    if ( isNaN( weight ) ) return 1


    return weight
}

/**
 * 1. calculate full path and assign directory/file/layer/config flags to each node
 * 2. check if config.json exists in every directory
 * 4. check if config.json is in the correct format
 * 5. add atribute to each node
 * 6. assign weights
 */
const evaluateTree = ( tree ) => {

    const allNodes = tree.getAllNodes()

    let throwErr = false
    let configRequiredDirs = []

    //! 1. calculate full path and assign directory/file flags to each node
    allNodes.map(
        node => {
            let fullPath = node.getFullPath()

            let isDir = isDirectory( fullPath )

            //console.log( isDir, node.getFullPath())

            node.weight = getWeightFromNodeName( node.nodeName )
     
            node.isDir = isDir

            if ( isDir )
            {
                //! check if config exists as child

                let configNode = node.getChildNode('config.json')
                
                if (!configNode)
                    configRequiredDirs.push( node.getFullPath() )
                else
                {
                    let data = configNode.readNode()

                    //console.log( node.getFullPath() )
                    node.config = JSON.parse( data )

                    let configVerified = validateConfig( node.config )

                    if ( !configVerified )
                    {
                        console.log(` ${ configNode.getFullPath() }, invalid config defined`)
                        throw Error()
                    }
                }
            }
            else
            {
                //! set flags for layer/config
                let nodeName = node.nodeName.toLowerCase()

                const pngMatch = wcmatch('*.png')
                const configMath = wcmatch('config.json')

                if ( pngMatch( nodeName ) )
                    node.isLayer = true
                else if ( configMath( nodeName ))
                    node.isConfig = true

            }


            return node
        }
    )


    allNodes.map( node => {

        /**
         * set attributes for each mod
         */
        if ( node.parent != undefined )
            node.setAttribute( node.parent.config )

        /**
         * delete all config.json
         */
        if ( node.isDir ) node.deleteNode('config.json')
            
        /**
         * delete all bat files
         */
        node.deleteNode('link.bat')
        node.deleteNode('unlink.bat')

        return node
    })


    if ( configRequiredDirs.length > 0) throwErr = true

    if ( throwErr )
    {
        let err = `!!!config.json not found for the following directories!!!:`
        console.log( err )
        console.log( configRequiredDirs )

        throw new Error( err )
    }


}

const createSelectionTree = ( tree ) =>
{
    let selectNode = new SelectionNode(tree.base)
    selectNode.build()

    return selectNode
}

const processMetaArray = ( metaArray ) => 
{
    var output = {
        uniqueId: null,
        layers: {}
    }

    metaArray.forEach(
        ( meta ) => 
        {
            let { layerName } = meta

            if ( output.layers[ layerName ] == undefined )
                output.layers[ layerName ] = []

            output.layers[ layerName ].push( meta )
        }
    )

    return output
}

const buildImageMetaData = ( baseNode ) => 
{
    let output = []
    baseNode.buildMetaData( output )

    output = processMetaArray( output )

    return output
}

const processSelectionTree = ( baseNode ) => {

    baseNode.process()

    let result = buildImageMetaData( baseNode )

    return result 
}

const getUniqueId = ( metaData ) => 
{
    let keys = Object.keys( metaData.layers )

    let uniqueIdString = ''

    keys.forEach(
        ( key ) => 
        {
            let layers = metaData.layers[ key ]

            layers.forEach(layerdata =>  uniqueIdString += layerdata.depth)
            layers.forEach(layerdata =>  uniqueIdString += layerdata.nthIndex)
            
        } 
    )

    return uniqueIdString
    
}

const getLayerOrder = ( layerIndexes, layerOrders ) =>
{
    var layerIndexMap = {}

    layerIndexes.forEach( (val, index) => layerIndexMap[index] = val) 

    var layerIndexValues = []
    var layerIndexMapKeys = Object.keys( layerIndexMap )

    layerIndexMapKeys.forEach( key => layerIndexValues.push( layerIndexMap[key]))

    layerIndexValues.sort((a, b) => a - b)

    var alreadySortedKeys = []
 
    var findKeyToUpdateInIndexMap = ( val ) => 
    {
        let keys = Object.keys( layerIndexMap )
        
        for ( var i=0; i<keys.length; i++)
        {
            if ( layerIndexMap[i] == val && !alreadySortedKeys.includes(i))
            {
                alreadySortedKeys.push(i)
                return i
            }
        }


        return keys[0]
    }
        
    
    var createNewMap = ( ) => {
        let newMap = {}
        
        let currentOrder = 0
        
        layerIndexValues.forEach( (value, index ) => {
            
            let keyToUpdateInIndexMap = findKeyToUpdateInIndexMap( value )
            
            newMap[keyToUpdateInIndexMap] = currentOrder++
        })
        
        return newMap
    }
    
    return createNewMap( )
}

const calculateLayerOrder = ( metaData ) => 
{
    let layers = metaData.layers

    let layerKeys = Object.keys( layers )

    let layerIndexes = []

    layerKeys.forEach( layerKey => {

        let chosenLayers = layers[ layerKey ]

        chosenLayers.forEach( val => layerIndexes.push( val.index ))
    })

    let layerOrders = []
    layerIndexes.forEach( val => layerOrders.push(0) )

    layerOrders = getLayerOrder( layerIndexes, layerOrders )

    let i = 0;
    layerKeys.forEach( layerKey => {

        let chosenLayers = layers[ layerKey ]

        chosenLayers.map( val => {

            val["layerOrder"] = layerOrders[i++]

            return val
        })

    })

    return metaData
}


const metaDataGenerator = ( tree, count ) =>
{
    let resultCount = 0
    let uniqueIDs = []

    let output = []

    while ( resultCount < count )
    {
        
        let selectionTree = createSelectionTree( tree )

        let metaData = processSelectionTree( selectionTree )

        metaData = calculateLayerOrder( metaData )

        //console.log( metaData )

        let uniqueId = getUniqueId( metaData )

        metaData.uniqueId = uniqueId

        if ( uniqueIDs.includes( uniqueId ) )
        {
            console.log(`uniqueId: "${uniqueId}" already exists, ignoring`)
            continue
        }

        //console.log( metaData )

        uniqueIDs.push( uniqueId )

        output.push( metaData )

        resultCount++
        
        console.log(`Generated ${resultCount}/${count} meta data`)

    }

    return output
}

module.exports = {
    convertToTree,
    evaluateTree,
    createSelectionTree,
    metaDataGenerator
}