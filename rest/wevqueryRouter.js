/**
 * Modular router to handle requests based on wevquery
 * https://expressjs.com/en/guide/routing.html
 */


const express = require('express');
const mongoDAO = require('../mongoDAO/mongoDAO.js');
const jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
const async = require('async');

const wevQueryOptions = require('../options');
const userCredentials = require('../userCredentials.js');

const router = express.Router();

console.log(`WevQuery REST service running, REST secure: ${wevQueryOptions.secureRest}`);

// middleware that is specific to this router
router.use((req, res, next) => {
  console.log('Wevquery router Time: ', Date.now());
  next();
});

/**
 * The root of the router returns a list of available queries
 */
router.get('/', (req, res) => {
  res.json({
    error: false,
    message: 'MOVING interaction REST service',
    routes: router.stack // registered routes
      .filter(r => r.route) // take out all the middleware
      .map(r => r.route.path), // get all the paths
  });
});

// define the about route
router.get('/about', (req, res) => {
  res.send('MOVING interaction REST service');
});

/** If the option has been set, the REST service will require a JSON Web Token */
if (wevQueryOptions.secureRest) {
  /**
   * Given a username and password, returns the corresponding token
   */
  router.get('/authenticate', (req, res) => {
    console.log(`Authentication triggered:${req.query.name},${req.query.pass}`);

    // Given credentials must: be part of the request, have different user and pass (not weak), and exist in the userCredentials file
    if ((typeof req.query.pass === 'undefined' || typeof req.query.name === 'undefined')
      || req.query.pass === req.query.name
      || userCredentials.restUsers[req.query.name] !== req.query.pass) {
      res.json({ error: true, message: 'Authentication failed.' });
      console.log('Authentication rejected');
    } else {
      const tokenOptions = {};
      if ((req.query && req.query.expiresIn) || (req.body && req.body.expiresIn)) tokenOptions.expiresIn = req.query.expiresIn || req.body.expiresIn;

      console.log(tokenOptions);
      // WARNING: if the payload (first parameter for jwt.sign) is a string, the expireIn fails
      const token = jwt.sign({ name: req.query.name }, userCredentials.restSecret, tokenOptions);

      // return the information including token as JSON
      res.json({
        error: false,
        message: 'token created',
        token,
      });
    }
  });

  /**
   * Middleware to ensure there is a token
   * All the functions below this one are protected
   */
  router.use((req, res, next) => {
    // check header or url parameters or post parameters for token
    let token = null;
    try {
      token = req.query.token || req.body.token || req.headers['x-access-token'];
    } catch (e) {
      // do nothing, no token was found
    }

    // decode token
    if (token) {
      // verifies secret and checks exp
      jwt.verify(token, userCredentials.restSecret, (err, decoded) => {
        if (err) {
          return res.json({ success: false, message: 'Failed to authenticate token.' });
        }
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        next();
      });
    } else {
      // if there is no token
      // return an error
      return res.status(403).send({
        success: false,
        message: 'No token provided.',
      });
    }
  });
}

/**
 * Retrieve the list of available queries
 */
router.get('/catalog', (req, res) => {
  mongoDAO.getCatalogQueries((err, catalogQueries) => {
    res.json(catalogQueries);
  });
});


/**
 * Returns the result of searching for a particular event with a set of options,
 * as indicated in the tutorial:
 */
router.route('/event/:eventname/')
  .get((req, res) => {
    const queryOptions = {};
    queryOptions.eventName = req.params.eventname;

    // Provides access to the parameters following the conventional ?name=value&name2=value2
    // If any of the following parameters is provided, store them as queryOptions

    if (typeof req.query.userid !== 'undefined') { queryOptions.userList = [req.query.userid]; }

    if (typeof req.query.starttime !== 'undefined') { queryOptions.startTimems = parseInt(req.query.starttime.toString(), 10); }

    if (typeof req.query.endtime !== 'undefined') { queryOptions.endTimems = parseInt(req.query.endtime.toString(), 10); }

    if (typeof req.query.url !== 'undefined') { queryOptions.url = req.query.url; }


    // If any of the compulsory variables has not been defined, return an error
    if (queryOptions.eventName) {
      // Retrieve the results for that event with the given options.
      mongoDAO.requestEvents(queryOptions, (err, eventList) => {
        if (err) return res.json({ error: true, message: 'wevqueryRouter /event/:eventname/ error', err });
        return res.json(eventList);
      });
    } else {
      res.json({ error: true, message: 'wevqueryRouter /event/:eventname/ is missing variables' });
    }
  });

/**
 * Returns the result of searching for all events for a particular user ID with a set of options,
 * as indicated in the tutorial:
 */
router.route('/user/:userid/')
  .get((req, res) => {
    const queryOptions = {};
    queryOptions.userList = [req.params.userid];

    // Provides access to the parameters following the conventional ?name=value&name2=value2
    // If any of the following parameters is provided, store them as queryOptions

    if (typeof req.query.starttime !== 'undefined') { queryOptions.startTimems = parseInt(req.query.starttime.toString(), 10); }

    if (typeof req.query.endtime !== 'undefined') { queryOptions.endTimems = parseInt(req.query.endtime.toString(), 10); }

    if (typeof req.query.url !== 'undefined') { queryOptions.url = req.query.url; }

    // If any of the compulsory variables has not been defined, return an error
    if (queryOptions.userList) {
      // Retrieve the results for that event with the given options.
      mongoDAO.requestEvents(queryOptions, (err, eventList) => {
        if (err) return res.json({ error: true, message: 'wevqueryRouter /user/:userid/ error', err });
        return res.json(eventList);
      });
    } else {
      return res.json({ error: true, message: 'wevqueryRouter /user/:userid/ is missing variables' });
    }
    return null;
  });


/**
 * Returns the list of latest results with their corresponding counts for a specific user.
 * The number of latest results to return can be set with 'length', and defaults to 10
 * as indicated in the tutorial:
 */
router.route('/searchhistory/:userid/')
  .get((req, res) => {
    const queryOptions = {};
    queryOptions.userID = req.params.userid;

    // Provides access to the parameters following the conventional ?name=value&name2=value2
    // If any of the following parameters is provided, store them as queryOptions

    if (typeof req.query.length !== 'undefined') { queryOptions.length = parseInt(req.query.length.toString(), 10); }

    // If any of the compulsory variables has not been defined, return an error
    if (queryOptions.userID) {
      // Retrieve the results for that event with the given options.
      mongoDAO.requestMovingSearchHistory(queryOptions, (err, eventList) => {
        if (err) return res.json({ error: true, message: 'wevqueryRouter /searchhistory/:userid/ error', err });
        return res.json(eventList);
      });
    } else {
      return res.json({ error: true, message: 'wevqueryRouter /searchhistory/:userid/ is missing variables' });
    }
    return null;
  });

/**
* Returns the list of results ever clicked by any user.
*/
router.route('/resultclicklist')
  .get((req, res) => {
    const queryOptions = {};

    // Provides access to the parameters following the conventional ?name=value&name2=value2
    // If any of the following parameters is provided, store them as queryOptions
    if (typeof req.query.userList !== 'undefined') { queryOptions.userList = req.query.userList; }
    if (typeof req.query.starttime !== 'undefined') { queryOptions.startTimems = parseInt(req.query.starttime.toString(), 10); }
    if (typeof req.query.endtime !== 'undefined') { queryOptions.endTimems = parseInt(req.query.endtime.toString(), 10); }
    if (typeof req.query.url !== 'undefined') { queryOptions.url = req.query.url; }

    if (typeof req.query.length !== 'undefined') { queryOptions.length = parseInt(req.query.length.toString(), 10); }

    mongoDAO.requestMovingResultClickList(queryOptions, (err, eventList) => {
      if (err) return res.json({ error: true, message: 'wevqueryRouter /resultclicklist error', err });
      return res.json(eventList);
    });
    return null;
  });

/**
 * Testing functions to ensure events are being captured.
 * By default it looks for the information for the previous day (optional days parameter equal to one).
 * Optionally, the number of days to go back can be specified.
 */
router.route('/test/')
  .get((req, res) => {
    // Create the time constraints for the query
    const queryParams = {};

    if (typeof req.query.days === 'undefined') {
      // The starting date is a day before today
      queryParams.startTimems = new Date().getTime() - 86400000;
      queryParams.endTimems = new Date().getTime();
    } else {
      queryParams.startTimems = new Date().getTime() -
        (parseInt(req.query.days.toString(), 10) * 86400000);
      queryParams.endTimems = new Date().getTime() -
        ((parseInt(req.query.days.toString(), 10) - 1) * 86400000);
    }

    // Return number of events
    async.parallel(
      [
        (callback) => {
          mongoDAO.getEventCount(queryParams, callback);
        },
        (callback) => {
          mongoDAO.getUniqueUserCount(queryParams, callback);
        },
        (callback) => {
          mongoDAO.getUniqueEpisodes(queryParams, callback);
        },
      ],
      (err, results) => {
        if (err) return res.json({ error: true, message: 'wevqueryRouter /test/ error' });
        return res.json({
          error: false,
          startTimems: queryParams.startTimems,
          endTimems: queryParams.endTimems,
          eventNumber: results[0],
          uniqueUserNumber: results[1],
          uniqueEpiNumber: results[2],
        });
      }
    );
    return null;
  });


/**
 * Given a response object and a query result collection name,
 * sends the results to the client and deletes the temporary collection.
 * @param {Response} res
 * @param {String} queryCollName
 */
function returnResultsAndClean(res, queryCollName) {
  // return the results, and delete the collection
  mongoDAO.getXmlQueryDataByCollection(queryCollName, (err, title, itemList) => {
    if (err) return console.error(`WevQueryRouter: getXmlQueryData() ERROR connecting to DB${err}`);
    console.log('wevQueryRouter() query ended, retrieving results');
    const jsonOutput = [];

    for (let index = 0; index < itemList.length; index += 1) {
      jsonOutput.push(itemList[index]);
    }
    res.json(jsonOutput);

    // Delete generated temporal collection
    mongoDAO.deleteTempResultCollection(queryCollName, (deteleErr) => {
      if (deteleErr) {
        return console.error(`WevQueryRouter: deleteTempResultCollection()'
            ERROR deleting: ${queryCollName} ${err}`);
      }
    });
  });
}

/**
 * Returns the result of running a stored query with a set of options, as indicated in the tutorial:
 * https://docs.google.com/document/d/15X6GMB3PmMgjTLcsd0NpJZJuVwDLuzKnONcDLWrbMzk/edit#bookmark=id.qntrmapd95jz
 */
router.route('/:queryname/')
  .get((req, res) => {
    const queryName = req.params.queryname;

    const queryOptions = {};

    // Provides access to the parameters following the conventional ?name=value&name2=value2
    // If any of the following parameters is provided, store them as queryOptions

    if (typeof req.query.userid !== 'undefined') { queryOptions.userList = [req.query.userid]; }

    if (typeof req.query.starttime !== 'undefined') { queryOptions.startTimems = parseInt(req.query.starttime.toString(), 10); }

    if (typeof req.query.endtime !== 'undefined') { queryOptions.endTimems = parseInt(req.query.endtime.toString(), 10); }

    if (typeof req.query.url !== 'undefined') { queryOptions.url = req.query.url; }

    if (typeof req.query.strictMode !== 'undefined') { queryOptions.isQueryStrict = req.query.strictMode.toLowerCase() === 'true'; }

    if (typeof req.query.fillEventInfo !== 'undefined') { queryOptions.fillEventInfo = req.query.fillEventInfo.toLowerCase() === 'true'; }

    const title = queryName;

    // If any of the variables has not been defined, return an error
    if (queryName) {
      // Retrieve the information for that query
      mongoDAO.getCatalogQueryInfo(queryName, (err, queryCatalogInfo) => {
        if (queryCatalogInfo === null) { res.json({ error: true, message: `The query '${queryName}' could not be found` }); } else {
          // Store the query into a new collection, with a temporary name
          mongoDAO.runXmlTempQuery(
            title, queryCatalogInfo.queryXML, queryOptions,
            (runQueryFinishedErr, queryTitle, queryCollName, processTime) => {
              if (runQueryFinishedErr) return console.error(`wevQueryRouter() ERROR in endCallback ${err}`);
              // Query ended

              // Do we need to fill in ALL information for resulting events?
              if (queryOptions.fillEventInfo) {
                mongoDAO.feedQueryInformationByCollection(queryCollName, (feedInfoErr) => {
                  if (feedInfoErr) return console.error(`WevQueryRouter: feedQueryInformationByCollection() ERROR connecting to DB ${feedInfoErr}`);
                  // The collection has been fed, return the collection, which is now FULL
                  returnResultsAndClean(res, queryCollName);
                });
              } else {
                // no need to fill in additional information, return collection as it is
                returnResultsAndClean(res, queryCollName);
              }
            },
            (runQueryLaunchedErr, queryTitle, queryData) => {
              if (runQueryLaunchedErr) return console.error(`wevQueryRouter() ERROR in launchedCallback ${err}`);
              console.log(`WevQueryRouter: getXmlQueryData() MapReduce started for query title
                ${queryTitle} with query ${queryData}`);
            }
          );
        }
      });
    } else { res.json({ error: true, message: 'wevqueryRouter /:queryname/ is missing variables' }); }
  });

module.exports = router;
