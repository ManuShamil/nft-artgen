const layers = [
	[ 1, 1, 1, 1, 1, 1],
	[ 5, 5, 5, 5, 40],
	[ 1, 3000, 5000, 5000, 10000]
]


const createDNA = ( layers ) => 
{

    const selectedElements = []

    layers.forEach( layer => {
        
        let totalWeight = layer.reduce( ( a, b ) => a + b, 0)

        let randomNum = Math.floor( Math.random() * totalWeight )

        //console.log( 'randomNum', randomNum)

        for ( var i=0; i<layer.length; i++)
        {
            let weight = layer[i]

            randomNum -= weight

            if ( randomNum < 0 )
            {
                selectedElements.push( i )
                break
            }
        }
    });

    //console.log( selectedElements )
    const selectedElementsActual = []

    selectedElements.forEach( 
        (val, index) => {
            selectedElementsActual.push( layers[index][val] )
        }
    )

    console.log( selectedElementsActual )
    
    return selectedElementsActual
}

var exit = false
var count = 0
while ( !exit )
{
    const selectedElementsActual = createDNA( layers )

    exit = true

    if ( selectedElementsActual[2] == 1)
    {
        console.log(' == 1')
        exit = true
    }

    count++
}

console.log(`Count : ${count}`)


var getWeightFromNodeName = (nodeName) => 
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


console.log(getWeightFromNodeName('Scar across#1.5.png'))