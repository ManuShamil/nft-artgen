const { Node, NODE_SELECTION_MODE } = require('./node')

class Tree 
{
    base = null
    constructor( baseName )
    {
        this.base = new Node( baseName )
    }

    insertNode( parts )
    {
        parts = parts.slice(1) //! remove 'layers' from parts

        //console.log( parts )

        this.base.insertNode( parts )
    }

    getAllNodes()
    {
        var allNodes = []

        this.base.children.forEach(node => {
            
            allNodes.push( node )

            node.getChildrenHierarchy( allNodes )
        });

        return allNodes
    }
}

module.exports = Tree