const process = require('process')
const fs = require('fs')
const { createCanvas, loadImage } = require('canvas')

const getImageBinary = ( imagePath ) => {

    return new Promise (
        async ( resolve, reject )  => {
            try {
                loadImage( imagePath )
                .then( image => resolve( image ))
            } catch (e) {
                reject(e)
            }

        }
    )
}

const loadImages = async ( metaData, callback ) => {
    const layerMetaDatas = []

    const layers = metaData.layers
    const layerNames = Object.keys( layers )

    layerNames.forEach( layerName => {
        
        layers[ layerName ].forEach( layerData => layerMetaDatas.push( layerData ) )
    })

    const layerData = {}
    layerMetaDatas.forEach( layerMetaData => layerData[ layerMetaData.layerOrder ] = layerMetaData)

    const result = []


    var keys = Object.keys( layerData )
    keys.sort((a, b) => a - b )

    for ( let index of keys )
    {
        let data = layerData[ index ]
        let image = await getImageBinary( data.fullpath )

        result.push(
            {
                layerMeta: data,
                image
            }
        )
    }

    return result
}

const getCleanName = ( imageName ) => {
    return imageName.split('#')[0].split('.')[0]
}

const getMetaDataExport = ( metaData ) => 
{
    let newMetaData = {}
    newMetaData.attributes = []

    let layers = metaData.layers
    let keys = Object.keys( layers )

    keys.forEach(
        key => {

            let currentLayer = layers[ key ]

            currentLayer.forEach(
                layerElement => {

                    let layerName = layerElement.layerName
                    let cleanName = getCleanName(layerElement.image)

                    newMetaData.attributes.push( {
                        trait_type: layerName,
                        value: cleanName
                    })
                }
            )

        }
    )

    return newMetaData
}

const printImage = async ( canvas, exportFolder, metaData, index ) => {

    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, 512, 512);

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, 512, 512);

    const imagesMeta = await loadImages( metaData )

    for ( let meta of imagesMeta )
        ctx.drawImage(
            meta.image,
            0,
            0,
            512,
            512
          )
    
    fs.writeFileSync(
        `${exportFolder}/images/${index}.png`,
        canvas.toBuffer("image/png")
    );

    let exportMeta = getMetaDataExport( metaData )


    fs.writeFileSync(
        `${exportFolder}/meta/${index}.json`,
        JSON.stringify(exportMeta, null, 4)
    );

    


}

const main = async () => 
{
    const imageMetaDataFile = process.argv[2]
    const exportFolder = process.argv[3]

    const canvas = createCanvas( 512, 512 )

    if ( fs.existsSync( exportFolder ) )
        fs.rmSync( exportFolder, { recursive: true } )    
    

    fs.mkdirSync( `${exportFolder}` )
    fs.mkdirSync( `${exportFolder}/images` )
    fs.mkdirSync( `${exportFolder}/meta` )

    const imageMetaDataArray = JSON.parse(fs.readFileSync( imageMetaDataFile, { encoding: 'utf-8', flag: 'r'} ))

    var i = 0
    for ( let metaData of imageMetaDataArray)
    {
        console.log(`Printing image: ${i+1}/${imageMetaDataArray.length}`)
        await printImage( canvas, exportFolder, metaData, i++)
    }

}

main()
