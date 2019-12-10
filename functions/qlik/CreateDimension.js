const q = require('qlik-sse');
const sessionMgr = require('../../lib/Qlik/QlikSession');
const helper = require('../../lib/Qlik/QlikHelper');

const functionConfig = {
    name: 'CreateDimension',
    functionType: q.sse.FunctionType.SCALAR,
    returnType: q.sse.DataType.STRING,
    params: [
      {
      name: 'name',
      dataType: q.sse.DataType.STRING,
      },
      {
        name: 'def',
        dataType: q.sse.DataType.STRING,
      }
    ],
}

/**
 * Create a dimension in the calling app.
 * @function CreateDimension
 * @param {string} name
 * @param {string} definition
 * @param {string} label expression
 * @returns {string} status - "Created" or "Replaced" plus any validation error messages.
 * @example
 * CreateDimension(nameField, defField)
 * @example
 * CreatDimension('Total Sales', 'Sum(Sales)', 'Sales $(max(Year))')
 */
  const functionDefinition = async function CreateDimension(request) {
    request.on('data', async (bundle) => {
      try {
        const common = q.sse.CommonRequestHeader.decode(request.metadata.get('qlik-commonrequestheader-bin')[0]);
        const rows = [];
        let result = 0
        for (const row of bundle.rows) {
          let name = row.duals[0].strData
          let def =  row.duals[1].strData
          result = await DoCreateDimension({name: name,  def: def, commonHeader: common})
          rows.push({
            duals: [{ strData: result}]
          })
          console.log("result", result)
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

const DoCreateDimension = async function DoCreateDimension({name, def, commonHeader}) {
  let retVal = 'False'
  const dimensionDef = {
    qInfo: {
      qType: "dimension"
    },
    qDim: {
      qGrouping: 0,
      qFieldDefs: [
        `${def}`
      ],
      qFieldLabels: [
       `${name}`
      ]
    },
    qMetaDef: {
      title: `${name}`
    }
  }
  
  let isDesktop = commonHeader.userId == 'Personal\\Me'
  let session = null
  try {
    session = sessionMgr.getSession(commonHeader);
    let dimension
    global = await session.open()
    doc = await global.openDoc(commonHeader.appId)
    let dimensionId = await helper.findDimensionByTitle(doc, name)
    if (!dimensionId) {   // dimension does not exist
      dimension = await doc.createDimension(dimensionDef)
      retVal = 'Created';
    } else {  // dimension exists, update the properties with the new def
      dimension = await doc.getDimension(dimensionId)
      let prop = await dimension.getProperties()
      prop.qDim.qFieldDefs = [def]
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
    let checkValue = await doc.checkExpression(def)
    if (checkValue.qErrorMsg) {
      retVal += '; ' + checkValue.qErrorMsg
    }
    if (checkValue.qBadFieldNames.length > 0) {
      retVal += '; Bad field names: ' + checkValue.qBadFieldNames.map((elem) => def.substr(elem.qFrom, elem.qCount)).join(', ')
    }
    session = await sessionMgr.closeSession(session)
  } catch (err) {
    retVal = 'Error: ' + err.toString()
    console.log(err)
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
