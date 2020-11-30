'use strict';

let {Contract} = require('fabric-contract-api');

class TransporterContract extends Contract {

	constructor() {
		// Provide a custom name to refer to this smart contract
		super('org.pharma-network.pharmanet.transporter');
	}

  async instantiate(ctx) {
		return 'PharmaNet - Transporter';
	}
  // helper function to loop the results.
  	async loopFunction(iterate) {
  		let results = [];
  		while (true) {
        let result = await iterate.next();
        if (result.value && result.value.value.toString()) {
  				results.push(JSON.parse(result.value.value.toString('utf8')));
        }
        if (result.done) {
  				await iterate.close();
          return results;
        }
      }
  	}

    /**
  	 * Register a new company account on the network
  	 * @param ctx - The transaction context object
  	 * @param companyCRN - COMPANY registeration number
  	 * @param companyName - COMPANY name
  	 * @param location - location of the company
  	 * @param organisationRole - organisation role
  	 * @returns
  	 */
  	async registerCompany(ctx, companyCRN, companyName, location, organisationRole) {
  		// Create a new composite key for the new company account
  		let companyKey = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.company', [companyCRN,companyName]);

  		// Consumer should not register
  		if('consumerMSP' == ctx.clientIdentity.mspId){
  			throw new Error('Unauthorised Organisation : '+ctx.clientIdentity.mspId);
  		}

  		// checking orgType
  		let hierarchyKey;
  		if(organisationRole == "Manufacturer"){// do a case sensitive check once later
  			hierarchyKey = 1;
  		}
  		else if(organisationRole == "Distributor"){
  			hierarchyKey = 2;
  		}
  		else if(organisationRole == "Retailer"){
  			hierarchyKey = 3;
  		}
  		else if(organisationRole == "Transporter"){
  			hierarchyKey = 4;
  		}
  		else{
  			throw new Error('There is no org type like the input. The org types are Transporter, Retailer, Distributor, Manufacturer');
  		}

  		//checking if company is already registered
  		let companyIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [companyCRN]);//partial composite key for checking company crn
  		let company = await this.loopFunction(companyIterator);
  		if(company.length > 0){
  			throw new Error('CRN already Registered');
  		}

  		// Create a company object to be stored in blockchain
  		let companyObject = {
  			companyID: companyKey,
  			name: companyName,
  			location: location,
  			hierarchyKey: hierarchyKey,
  			organisationRole: organisationRole,
  			createdBy: ctx.clientIdentity.getID(),
  			updatedBy: ctx.clientIdentity.getID(),
  			createdAt: new Date(),
  			updatedAt: new Date(),
  		};

  		// Convert the JSON object to a buffer and send it to blockchain for storage
  		let dataBuffer = Buffer.from(JSON.stringify(companyObject));
  		await ctx.stub.putState(companyKey, dataBuffer);
  		// Return value of new company account created to user

  		return companyObject;
  	}

    /**
  	 * Update shipment on the network
  	 * @param ctx - The transaction context object
  	 * @param buyerCRN -  CRN of Buyer Company
  	 * @param transporterCRN - CRN of Transporter Company
  	 * @param drugName -  Name of the DRUG
  	 *
  	 * @returns  A ‘Shipment object’
  	 */
  	async updateShipment(ctx, buyerCRN, drugName, transporterCRN) {

  		//Validate  if buyer exists
  			let buyerIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [buyerCRN]);//partial composite key for checking company crn
  			let buyers = await this.loopFunction(buyerIterator);
  			if(buyers.length == 0){
  				throw new Error('Buyer does not exist with CRN.');
  			}

  			//	Validate if transporter exists
  			let transporterIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [buyerCRN]);//partial composite key for checking company crn
  			let transporter = await this.loopFunction(transporterIterator);

  			if(transporter.length == 0){
  				throw new Error('Transporter does not exist with CRN.');
  			}

  			//composite key for shipment
  			let shipmentID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.shipment', [buyerCRN,drugName]);
  			let shipmentBuffer = await ctx.stub.getState(shipmentID).catch(err => console.log(err));
  			if (!shipmentBuffer.toString()) {
  				throw new Error('Invalid operation. Can\'t find any SHIPMENT with specified BUYER & DRUG');
  			}
  			let shipmentObject = JSON.parse(shipmentBuffer);

  			// Update all DRUG assets with new OWNER and shipment details
  			for(let i = 0; i < shipmentObject.assets.length; i++){
  				let drugObjectBuffer = await ctx.stub.getState(shipmentObject.assets[i])
  																									 .catch(err => console.log(err));
  				let drugObject = JSON.parse(drugObjectBuffer);

  				drugObject.owner = buyers[0].companyID;
  				drugObject.shipment.push(shipmentID);
  				let dataBuffer = Buffer.from(JSON.stringify(drugObject));
  				await ctx.stub.putState(drugObject.productID, dataBuffer);
  			}
  			// Update status to DELIVERED
  		shipmentObject.status = 'DELIVERED';
  		let shipmentDataBuffer = Buffer.from(JSON.stringify(shipmentObject));
  		await ctx.stub.putState(shipmentID, shipmentDataBuffer);

  		return shipmentObject;

  	}

    /**
  	 * View drug on the network
  	 * @param ctx - The transaction context object
  	 * @param serialNo  -  serial number of drug
  	 * @param drugName -  Name of the DRUG
  	 * @returns  A Drug object’
  	 */
  	async viewDrugCurrentState(ctx, drugName, serialNo){
  		//	Validate whether DRUG available with specified serialNo
  		let drugID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug', [drugName,serialNo]);
  		let drugHistoryBuffer = await ctx.stub.getState(drugID)
  																					.catch(err => console.log(err));
  		if (!drugHistoryBuffer.toString()) {
  			throw new Error('No DRUG with Name & Serial No',drugName,serialNo);
  		}
  		return JSON.parse(drugHistoryBuffer);
  	}

    /**
     * RegisViewter drug history on the network
     * @param ctx - The transaction context object
     * @param serialNo  -  serial number of drug
     * @param drugName -  Name of the DRUG
     * @returns  A Drug object’
     */
    async viewHistory(ctx, drugName, serialNo){
      //	Validate drug against serialNo
      let drugID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug', [drugName,serialNo]);
      let drugHistoryIterator = await ctx.stub.getHistoryForKey(drugID)
                                              .catch(err => console.log(err));
      let drugHistory = this.loopFunction(drugHistoryIterator);

      return drugHistory;
    }
}
module.exports = TransporterContract;
