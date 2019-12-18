const q = require('qlik-sse');
const sessionMgr = require('../../lib/Qlik/QlikSession');
const helper = require('../../lib/Qlik/QlikHelper');

const functionConfig = {
    name: 'CreateDimensionFromProperties',
    functionType: q.sse.FunctionType.SCALAR,
    returnType: q.sse.DataType.STRING,
    params: [
      {
      name: 'obj',
      dataType: q.sse.DataType.STRING,
      },
    ],
}

/**
 * Create a dimension in the calling app.
 * @function CreatedimensionFromProperties
 * @param {string} props - dimensionProps in JSON format
 * @returns {string} status - "Created" or "Replaced" plus any validation error messages.
 * @example
 * CreatedimensionFromProperties(dimensionDefField)
 */
  const functionDefinition = async function CreateDimensionFromProperties(request) {
    request.on('data', async (bundle) => {
      try {
        const common = q.sse.CommonRequestHeader.decode(request.metadata.get('qlik-commonrequestheader-bin')[0]);
        const rows = [];
        let result = 0
        for (const row of bundle.rows) {
          let props = row.duals[0].strData
          result = await DoCreateDimension({props: props, commonHeader: common})
          rows.push({
            duals: [{ strData: result}]
          })
        }
        request.write({
          rows
        })
        request.end()
      }
      catch (error) {
        console.log(error)
      }
  });
}

const DoCreateDimension = async function DoCreateDimension({props, commonHeader}) {
  let retVal = 'False'
  const obj = JSON.parse(props)

  let isDesktop = commonHeader.userId == 'Personal\\Me'  
  let session = null
  try {
    session = sessionMgr.getSession(commonHeader);
    let dimension
    global = await session.open()
    doc = await global.openDoc(commonHeader.appId)
    let dimensionId = await helper.findDimensionByTitle(doc, obj.qMetaDef.title)
    if (!dimensionId) {   // dimension does not exist
      dimension = await doc.createDimension(obj)
      retVal = 'Created';
    } else {  // dimension exists, update the properties with the input
      dimension = await doc.getDimension(dimensionId)
      let prop = await dimension.getProperties()  // Current properties 
      prop = Object.assign(prop, obj) // Update with new properties
      prop.qInfo.qId = dimensionId  // Restore the qId
      await dimension.setProperties(prop) 
      retVal = 'Replaced';   
    }
    // Persist the dimension
    docprop = await doc.getAppProperties()
    if (docprop.published) {
        await dimension.publish()
        await dimension.approve()
    }
    if (isDesktop)         {
      await doc.doSave()
    }  
    // Syntax check the dimension and record result
    let def = obj.qDimension.qDef
    let checkValue = await doc.checkExpression(def)
    if (checkValue.qErrorMsg) {
      retVal += '; ' + checkValue.qErrorMsg
    }
    if (checkValue.qBadFieldNames.length > 0) {
      retVal += '; Bad field names: ' + checkValue.qBadFieldNames.map((elem) => def.substr(elem.qFrom, elem.qCount)).join(', ')
    }
  } 
  catch (err) {
    retVal = 'Error: ' + err.toString()
    console.log(err)
  }
  finally {
    if (session) {
      session = await sessionMgr.closeSession(session)
    }
  }
  return Promise.resolve(retVal)
}

module.exports = {
  functionDefinition,
  functionConfig
};