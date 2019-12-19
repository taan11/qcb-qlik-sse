const q = require('qlik-sse');
const sessionMgr = require('../../lib/Qlik/QlikSession');
const helper = require('../../lib/Qlik/QlikHelper');
const _ = require('lodash')

const functionConfig = {
    name: 'RenameMeasure',
    functionType: q.sse.FunctionType.SCALAR,
    returnType: q.sse.DataType.STRING,
    params: [
      {
      name: 'currentName',
      dataType: q.sse.DataType.STRING,
      },
      {
        name: 'newName',
        dataType: q.sse.DataType.STRING,
      }
    ],
}

/**
 * Create a dimension in the calling app.
 * @function RenameMeasure
 * @param {string} currentName
 * @param {string} newName
 * @returns {string} status - "Renamed" or "Not found" plus any validation error messages.
 * @example
 * RenameMeasure(currentName, newName)
 * @example
 */
  const functionDefinition = async function RenameMeasure(request) {
    request.on('data', async (bundle) => {
      try {
        const common = q.sse.CommonRequestHeader.decode(request.metadata.get('qlik-commonrequestheader-bin')[0]);
        const rows = [];
        let result = 0
        for (const row of bundle.rows) {
          let currentName = row.duals[0].strData
          let newName =  row.duals[1].strData
          result = await DoRenameMeasure({currentName: currentName,  newName: newName, commonHeader: common})
          rows.push({
            duals: [{ strData: result}]
          })
          // console.log("result", result)
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

const DoRenameMeasure = async function DoRenameMeasure({currentName, newName, commonHeader}) {
  let retVal = 'False'

  let isDesktop = commonHeader.userId == 'Personal\\Me'
  let session = null
  try {
    session = sessionMgr.getSession(commonHeader);
    global = await session.open()
    doc = await global.openDoc(commonHeader.appId)
    measureId = await helper.findMeasureByTitle(doc, currentName)
    if(measureId){
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
      retVal = await renameMeasure(doc, measureId, newName);
    } else {
      //console.log('Measure not found')
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
