const util = require('util')
const dir = require('node-dir')
const fs = require('fs')

const getFiles = ( layerFolder, layerName ) => {
    return new Promise(
        (resolve, reject) => {

            dir.paths(
                `${layerFolder}/${layerName}`,
                ( err, paths ) => 
                {
                    if(err)
                    {
                        reject(err)
                        return
                    }

                    let dirs = paths.dirs
                    let files = paths.files

                    resolve(dirs.concat(files))
                }
            )

        }
    )
}

const getAllFiles = 
( layerFolder, layers ) => {
    return new Promise(
        async ( resolve, reject ) => {
            var files = []

            for ( let i=0; i< layers.length; i++)
            {
                let layerName = layers[i]
                let contents = await getFiles( layerFolder, layerName )
        
                files = files.concat( contents )
            }

            //console.log( util.inspect( files, { maxArrayLength: null} ))
        
            resolve( files )
        }
    )

}

const isDirectory = ( path ) => 
{
	try
	{
		return fs.lstatSync( path ).isDirectory() || fs.lstatSync( path ).isSymbolicLink()
	}
	catch (e) 
	{
		return false
	}
}

const readFile = ( fullPath ) =>
{
    return fs.readFileSync( fullPath, { encoding: 'utf-8', flag: 'r'})
}

module.exports = 
{
    getAllFiles,
    isDirectory,
    readFile
}