const q = require('qlik-sse');
const _ = require('lodash')

const functionConfig = {
    name: 'StartCase',
    functionType: q.sse.FunctionType.SCALAR,
    returnType: q.sse.DataType.STRING,
    params: [
      {
        name: 'str',
        dataType: q.sse.DataType.STRING,
      }
    ],
  }
/**
 * Format a string in Start Case.
 * @function StartCase
 * @param {string} str
 * @returns {string}
 * @example
 * startCase('helloWorld')  // returns 'Hello World'
 */
  const functionDefinition = function startCase(request) {
    request.on('data', (bundle) => {
      try {
        const rows = [];
        bundle.rows.forEach((row) => {
          let str = row.duals[0].strData
          let result = _.startCase( str );
          rows.push({
            duals: [{ strData: result}]
          });
        });
        request.write({
          rows
        });
      }
      catch (error) {
        console.log(error)
      }
    });
  }

module.exports = {
  functionDefinition,
  functionConfig
};
