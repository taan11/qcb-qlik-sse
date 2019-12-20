const q = require('qlik-sse');
const sessionMgr = require('../../lib/Qlik/QlikSession');
const helper = require('../../lib/Qlik/QlikHelper');

const functionConfig = {
    name: 'DeleteMeasure',
    functionType: q.sse.FunctionType.SCALAR,
    returnType: q.sse.DataType.STRING,
    params: [
      {
      name: 'name',
      dataType: q.sse.DataType.STRING,
      }
    ],
}

/**
 * Create a Measure in the calling app.
 * @function DeleteMeasure
 * @param {string} name
 * @returns {string} status - "Created" or "Replaced" plus any validation error messages.
 * @example
 * DeleteMeasure(nameField, defField, labelExprField)
 * @example
 * DeleteMeasure('Total Sales', 'Sum(Sales)', 'Sales $(max(Year))')
 */
  const functionDefinition = async function DeleteMeasure(request) {

    request.on('data', async (bundle) => {
      try {
        const common = q.sse.CommonRequestHeader.decode(request.metadata.get('qlik-commonrequestheader-bin')[0]);
        const rows = [];
        let result = 0;
        for (const row of bundle.rows) {
          let name = row.duals[0].strData
          result = await DoDeleteMeasure({name:name, commonHeader: common})
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

const DoDeleteMeasure = async function DoDeleteMeasure({name, commonHeader}) {
  let retVal = 'False'

  let isDesktop = commonHeader.userId == 'Personal\\Me'
  let session = null
  try {
    session = sessionMgr.getSession(commonHeader);
    global = await session.open()
    doc = await global.openDoc(commonHeader.appId)
    measureId = await helper.findMeasureByTitle(doc, name)
    //console.log(name)
    if(measureId){
      retVal = await helper.deleteMeasure(doc, measureId);
    } else {
      retVal = 'Measure not found'
    }
    //Persist deletion in QS Desktop
    if (isDesktop){
      await doc.doSave()
    }
    // Syntax check the measure and record result
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
