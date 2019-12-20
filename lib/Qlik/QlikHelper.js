const measureListDef = {
    "qInfo": {
        "qType": "MeasureList",
        "qId": ""
    },
    "qMeasureListDef": {
        "qType": "measure",
        "qData": {
            "title": "/qMetaDef/title",
            "tags": "/qMetaDef/tags"
        }
    }
}
async function findMeasureByTitle(doc, title) {
    title = title.toLowerCase()     // Case insensitive search
    let list = await getMeasureList(doc)
    let obj = undefined
    if (list) {
        obj =  list.find((element) => {
            return get(['qData', 'title'], element).toLowerCase() == title
        })
    }
    if (obj != undefined) {
        return get(['qInfo', 'qId'], obj)
    } else {
        return undefined
    }

}

async function getMeasures(doc) {
    let list = await getMeasureList(doc)
    let measureDefs = []
    for (const elem of list) {
        let qId = get(['qInfo', 'qId'], elem)
        if (qId) {
            let measure = await doc.getMeasure(qId)
            let prop = await measure.getProperties()
            measureDefs.push(prop)
        }
    }
    return measureDefs
}

async function getMeasureList(doc) {
    listobj  = await doc.createSessionObject(measureListDef)
    list = await listobj.getLayout()
    return get(['qMeasureList', 'qItems'], list)
}


const dimensionListDef = {
    "qInfo": {
        "qType": "DimensioList",
        "qId": ""
    },
    "qDimensionListDef": {
        "qType": "dimension",
        "qData": {
            "title": "/qMetaDef/title",
            "tags": "/qMetaDef/tags"
        }
    }
}
async function findDimensionByTitle(doc, title) {
    title = title.toLowerCase()     // Case insensitive search
    let list = await getDimensionList(doc)
    let obj = undefined
    if (list) {
        obj =  list.find((element) => {
            return get(['qData', 'title'], element).toLowerCase() == title
        })
    }
    if (obj != undefined) {
        return get(['qInfo', 'qId'], obj)
    } else {
        return undefined
    }

}

async function getDimensions(doc) {
    let list = await getDimensionList(doc)
    let dimensionDefs = []
    for (const elem of list) {
        let qId = get(['qInfo', 'qId'], elem)
        if (qId) {
            let dimension = await doc.getDimension(qId)
            let prop = await dimension.getProperties()
            dimensionDefs.push(prop)
        }
    }
    return dimensionDefs
}

async function getDimensionList(doc) {
    listobj  = await doc.createSessionObject(dimensionListDef)
    list = await listobj.getLayout()
    return get(['qDimensionList', 'qItems'], list)
}

const deleteMeasure = async (doc, measureId) => {
  try {
    //console.log(measureId)
    const deleted = await doc.destroyMeasure(measureId)
    //console.log(deleted)
    return deleted===true?'Measure Deleted':'False'
  } catch(err){
    retVal = 'Error: ' + err.toString()
    console.log(err)
    return 'false'
  }
}

const renameMeasure = async (doc, measureId, newName) => {
  try {
    const measure = await doc.getMeasure(measureId)
      let prop = await measure.getProperties()
      prop.qMeasure.qLabel = newName
      prop.qMetaDef.title = newName
      const done = await measure.setProperties(prop)
      return done==='{}'?'Renamed':'Found Not renamed';
  } catch(err){
    retVal = 'Error: ' + err.toString()
    console.log('error renaming measure',err)
    return 'false'
  }
}

/*
 * Safely get a nested object.
 *
 * @see https://medium.com/javascript-inside/safely-accessing-deeply-nested-values-in-javascript-99bf72a0855a
 * @param {string[]} p  - An array of the names of the desired objects.
 * @param {object} o - The object to fetch items from.
 * @returns {object} - The resulting object or null.
*/
function get (p, o) {
    return p.reduce(function (xs, x) {
        return xs && xs[x] ? xs[x] : null;
    }, o);
}

module.exports = {
    findMeasureByTitle,
    getMeasures,
    findDimensionByTitle,
    getDimensions,
    deleteMeasure,
    renameMeasure
}
