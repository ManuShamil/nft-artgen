const {
    LAYERS
} = require('./config')

const {
    getAllFiles
} = require('./controllers/files')
const { convertToTree, evaluateTree, createSelectionTree, metaDataGenerator } = require('./controllers/tree')

const util = require('util')
const fs = require('fs')
const process = require('process')



const main = async () => {

    var files = await getAllFiles('layers', LAYERS)

    var tree = convertToTree( files )


    //console.log( util.inspect(tree.getAllNodes(), { maxArrayLength: null} ))

    evaluateTree( tree )


    //console.log( newSelectionTree.children[0].children[0] )
    //console.log( util.inspect(tree.getAllNodes(), { maxArrayLength: null} ))

    //const allNodes = tree.getAllNodes()


    let count = process.argv[2] || 1
    let output = metaDataGenerator( tree, count)

    fs.writeFileSync('export.json', JSON.stringify(output, null, 4), { encoding: 'utf-8'})
}

main()