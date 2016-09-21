// ```
// Import Google Analytics report to mongodb @daily
// ```

const google = require('googleapis');
const moment = require('moment');
const assert = require('assert');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

const ensureNumberValues = obj => {
  const result = {};
  Object.keys(obj).forEach(key => {
    result[key] = new Number(obj[key]).valueOf();
  });
  return result;
}

// ## Usage

// **process.env.URL**
//
// MongoDB connection url
const URL = process.env.URL;

// **process.env.KEY** `required`
//
// You **must** provide service account key filename as `KEY` environment
const KEY = require(process.env.KEY);

// **process.env.DATE** `optional`
//
// Default yesterday in `YYYY-MM-DD` format
const DATE = process.env.DATE || moment().subtract('1', 'day').format('YYYY-MM-DD');

// **process.env.METRICS** `optional`
//
// Default `ga:sessions,ga:users` metrics to import
const METRICS = process.env.METRICS || 'ga:sessions,ga:users';

// **scopes** `not configurable`
const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

assert(KEY, 'Must provide service account key filename');
assert(URL, 'Must provide mongodb connection url');

// ## Google JWT is used

const jwtClient = new google.auth.JWT(KEY.client_email, null, KEY.private_key, SCOPES, null);

// Set JWT auth as a global default
google.options({ auth: jwtClient });

// ## STEPS

// Use google analytics v3 version
var analytics = google.analytics('v3');

// ### Step 1: List all profiles
analytics.management.profiles.list({
  accountId: '~all',
  webPropertyId: '~all',
  fields: 'items(id,name,timezone)'
}, (err, res) => {

  assert(!err, err);

  console.log(`[success] ${res.items.length} profiles to fetch`);

  let successCount = 0;

  MongoClient.connect(URL, (err, db)=> {
    const collection = db.collection('metrics');

    // ### Step 2: fetch each profile detail


    res.items.forEach((item, i) => {
      setTimeout(()=> {
        analytics.data.ga.get({
          'ids': `ga:${item.id}`,
          'start-date': DATE,
          'end-date': DATE,
          'metrics': METRICS,
          'fields': 'totalsForAllResults'
        }, (err, result)=> {
          assert(!err, err);

          // ### Step 3: Prepare data to insert
          const dataToInsert = Object.assign(ensureNumberValues(result.totalsForAllResults), item, {
            date: new Date(DATE),
            _id: `${DATE}-${item.id}`
          });

          // ### Step 4: InsertOrUpdate MongoDB
          collection.save(dataToInsert, (err, result)=> {
            assert(!err, err);

            console.log(`[success] ${Math.round(100 * (++successCount / res.items.length))}% #profile-${item.id}-${item.name}`);

            if (successCount == res.items.length) {
              console.log('[success] Done')
              db.close();
              process.exit(0);
            }
          });
        })
      }, i * 1000);
    })
  });
});

setTimeout(()=> {
  console.error('[error] Timeout')
  process.exit(1);
}, 60000);


// <noscript><iframe src="//www.googletagmanager.com/ns.html?id=GTM-KJ6MC5" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
// <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='//www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-KJ6MC5');</script>
