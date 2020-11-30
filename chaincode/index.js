'use strict';

const pharmanetcontract = require('./contract.js');
const manufacturercontract = require('./manufacturer.js');
const distributorcontract = require('./distributor.js');
const retailercontract = require('./retailer.js');
const transportercontract = require('./transporter.js');
module.exports.DistributorContract = distributorcontract;
module.exports.RetailerContract = retailercontract;
module.exports.TransporterContract = transportercontract;
module.exports.ManufacturerContract = manufacturercontract;
module.exports.contracts = [manufacturercontract, transportercontract, retailercontract, distributorcontract,pharmanetcontract];
