
0.5.1 / 2013-08-23 
==================

  * detect connect timeout or response timeout fixed #18
  * update doc

0.5.0 / 2013-08-11 
==================

  * Support max redirects to protect loop redirect
  * Auto redirect handle (@ibigbug)

0.4.4 / 2013-08-10 
==================

  * handle json response to null when data size is zero

0.4.3 / 2013-08-10 
==================

  * Auto convert data to json string when content-type is 'json' fixed #15
  * add drone.io status build image

0.4.2 / 2013-08-10 
==================

  * fix SELF_SIGNED_CERT_IN_CHAIN test case on node 0.8 and 0.6
  * [√] https & self-signed certificate

0.4.1 / 2013-08-05 
==================

  * return RemoteSocketClosedError when Remote socket was terminated before `response.end()` was called

0.4.0 / 2013-08-05 
==================

  * If the underlaying connection was terminated before `response.end()` was called, `res.aborted` should be `true`. fixed #14
  * fixed test case for 0.6
  * add res.socket.end() test cases
  * remove 0.11 from travis

0.3.8 / 2013-08-02 
==================

  * add debug log

0.3.7 / 2013-07-11 
==================

  * PATCH method is also "application/x-www-form-urlencoded" by default
  * replace logo

0.3.6 / 2013-07-11 
==================

  * fixed bug in processing query string #13 (@xingrz)
  * updated readme example (@xingrz)
  * update authors
  * API docs (@xingrz)

0.3.5 / 2013-07-10 
==================

  * fixed writeSteam receive incomplete bug
  * update makefile
  * add coveralls
  * remove 0.11 from travis
  * add patch for node 0.6
  * fixed https request timeout tests
  * use blanket instead of jscover

0.3.4 / 2013-03-06 
==================

  * fixed #8 auto add application/x-www-form-urlencoded
  * fixed existsSync for node < 0.8

0.3.3 / 2012-12-14 
==================

  * support writeStream

0.3.2 / 2012-11-08 
==================

  * fixed #4 support urllib.request(options, args, callback)
  * fixed usage demo bug
  * fixed readme

0.3.1 / 2012-11-05 
==================

  * fixed #2 support stream and return the req object.
  * use jscover instead of jscoverage

0.3.0 / 2012-10-10 
==================

  * add coverage results
  * Bash auth support: `http://user:password@http://demo.com` .
