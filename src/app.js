/**
 * Project providing ride related routes
 * @module ride/routes
 */

'use strict';

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const logger = require('./common/logger');

module.exports = (db) => {
  /**
   * Health check
   * @name /health
  */
  app.get('/health', (req, res) => res.send('Healthy'));

  /**
   * Create a Ride.
   * @param {Object} req.body - Request body object
   * @param {number} req.body.start_lat - Pickup location latitude of the rider
   * @param {number} req.body.start_long - Pickup location longitude of the rider
   * @param {number} req.body.end_lat - Drop off location latitude of the rider
   * @param {number} req.body.end_long - Drop off location latitude of the rider
   * @param {string} req.body.rider_name - Rider name
   * @param {string} req.body.driver_name - Driver name
   * @param {string} req.body.driver_vehicle - Driver's vehicle name (Ex: Toyota)
   * @param {Array.<Object>} - returns ride array object
   */
  app.post('/rides', jsonParser, (req, res) => {
    const startLatitude = Number(req.body.start_lat);
    const startLongitude = Number(req.body.start_long);
    const endLatitude = Number(req.body.end_lat);
    const endLongitude = Number(req.body.end_long);
    const riderName = req.body.rider_name;
    const driverName = req.body.driver_name;
    const driverVehicle = req.body.driver_vehicle;

    if (startLatitude < -90 || startLatitude > 90 || startLongitude < -180 || startLongitude > 180) {
      // eslint-disable-next-line camelcase
      const error_code = 'VALIDATION_ERROR';
      const message = 'Start latitude and longitude must be between -90 - 90 and -180 to 180 degrees respectively';
      // example of logging to winston logger
      logger.error(`Error at /rides %s %s %s`, error_code, message, JSON.stringify(req.body));
      return res.send({
        error_code,
        message
      });
    }

    if (endLatitude < -90 || endLatitude > 90 || endLongitude < -180 || endLongitude > 180) {
      return res.send({
        error_code: 'VALIDATION_ERROR',
        message: 'End latitude and longitude must be between -90 - 90 and -180 to 180 degrees respectively'
      });
    }

    if (typeof riderName !== 'string' || riderName.length < 1) {
      return res.send({
        error_code: 'VALIDATION_ERROR',
        message: 'Rider name must be a non empty string'
      });
    }

    if (typeof driverName !== 'string' || driverName.length < 1) {
      return res.send({
        error_code: 'VALIDATION_ERROR',
        message: 'Rider name must be a non empty string'
      });
    }

    if (typeof driverVehicle !== 'string' || driverVehicle.length < 1) {
      return res.send({
        error_code: 'VALIDATION_ERROR',
        message: 'Rider name must be a non empty string'
      });
    }

    var values = [req.body.start_lat, req.body.start_long, req.body.end_lat, req.body.end_long, req.body.rider_name, req.body.driver_name, req.body.driver_vehicle];

    db.run('INSERT INTO Rides(startLat, startLong, endLat, endLong, riderName, driverName, driverVehicle) VALUES (?, ?, ?, ?, ?, ?, ?)', values, function (err) {
      if (err) {
        return res.send({
          error_code: 'SERVER_ERROR',
          message: 'Unknown error'
        });
      }

      db.all('SELECT * FROM Rides WHERE rideID = ?', this.lastID, function (err, rows) {
        if (err) {
          return res.send({
            error_code: 'SERVER_ERROR',
            message: 'Unknown error'
          });
        }

        res.send(rows);
      });
    });
  });

  /**
   * Get all rides.
   * @name /rides
   * @returns {Array.<Object>} List of rides.
   */
  app.get('/rides', (req, res) => {
    const page = req.query.page || 1;
    const perpage = req.query.perpage || 10;
    const offset = page === 1 ? 1 : (page - 1) * perpage;
    const query = `SELECT * FROM Rides LIMIT ${perpage} OFFSET ${offset}`;

    db.all(query, function (err, rows) {
      if (err) {
        logger.error(`Error GET /rides %s %s`, err, query);
        return res.send({
          error_code: 'SERVER_ERROR',
          message: 'Unknown error'
        });
      }

      if (rows.length === 0) {
        return res.send({
          error_code: 'RIDES_NOT_FOUND_ERROR',
          message: 'Could not find any rides'
        });
      }

      res.send({
        page,
        perpage,
        rows
      });
    });
  });

  /**
   * Get a ride.
   * @name /rides/:id
   */
  app.get('/rides/:id', (req, res) => {
    db.all(`SELECT * FROM Rides WHERE rideID='${req.params.id}'`, function (err, rows) {
      if (err) {
        return res.send({
          error_code: 'SERVER_ERROR',
          message: 'Unknown error'
        });
      }

      if (rows.length === 0) {
        return res.send({
          error_code: 'RIDES_NOT_FOUND_ERROR',
          message: 'Could not find any rides'
        });
      }

      res.send(rows);
    });
  });

  return app;
};
