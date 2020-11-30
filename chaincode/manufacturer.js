'use strict';

let {Contract} = require('fabric-contract-api');

class ManufacturerContract extends Contract {

	constructor() {
		// Provide a custom name to refer to this smart contract
		super('org.pharma-network.pharmanet.manufacturer');
	}

  async instantiate(ctx) {
		return 'PharmaNet - Manufacturer';
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
  	 * Register a new drug on the network
  	 * @param ctx - The transaction context object
  	 * @param companyCRN - COMPANY registeration number
  	 * @param drugName - drug name
  	 * @param serialNo - serial number
  	 * @param mfgDate - manufacturing date
  	 * @param expDate - expiry date
  	 * @returns
  	 */
  	async addDrug(ctx, drugName, serialNo, mfgDate, expDate, companyCRN) {
  		// Create a new composite key for the new company account
  		let manufacturingKey = ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [companyCRN]);

  		let drugKey = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug', [drugName,serialNo]);


  		if('manufacturerMSP' != ctx.clientIdentity.mspId){
  			throw new Error('Only MANUFACTURERs allowed to do this operation');
  		}

  		let companyIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [companyCRN]);//partial composite key for checking company crn
  		let company = await this.loopFunction(companyIterator);

  		if(company.length == 0){
  			throw new Error('Invalid CRN. No MANUFACTURER exists with provided CRN');
  		}

  		let drugIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.drug', [drugName]);
  		let registeredDrugs = await this.loopFunction(drugIterator);

			//return registeredDrugs;
  		for(var i = 0;i < registeredDrugs.length; i++) {
  			if(registeredDrugs[i].productID === drugKey){
  				throw new Error('Drug with same Serial ID and Name exists :'+drugName+' & '+serialNo);
  			}
  		}

  		let manufacturingBuffer = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [companyCRN]);
			let manufacturer = await this.loopFunction(manufacturingBuffer);
  		let manufacturerCompanyID;
			//return manufacturer;
  		if(manufacturer[0].organisationRole == 'Manufacturer'){
  			manufacturerCompanyID = manufacturer[0].companyID;
   		}
  		else{
  			return "Only registered manufacturer can do this operation";
  		}
			//return manufacturer;
  		// Create a drug object to be stored in blockchain
  		let drugDetails = {
  			productID: drugKey,
  			name: drugName,
  			manufacturer: manufacturerCompanyID,
  			manufacturingDate: mfgDate,
  			expiryDate: expDate,
				serialNo:serialNo,
  			owner: manufacturerCompanyID,
  			shipment: [],
  			createdBy: ctx.clientIdentity.getID(),
  			updatedBy: ctx.clientIdentity.getID(),
  			createdAt: new Date(),
  			updatedAt: new Date(),
  		};

  		// Convert the JSON object to a buffer and send it to blockchain for storage
  		let dataBuffer = Buffer.from(JSON.stringify(drugDetails));
  		await ctx.stub.putState(drugKey, dataBuffer);
  		// Return value of new drug account created to user
  		return drugDetails;
  	}

    /**
  	 * Create a new shipment on the network
  	 * @param ctx - The transaction context object
  	 * @param buyerCRN -  CRN of Buyer Company
  	 * @param sellerCRN - CRN of Seller Company
  	 * @param drugName -  Name of the DRUG
  	 * @param quantity - Quantity of the DRUG
  	 *
  	 * @returns  A ‘PO’
  	 */
  	async createShipment(ctx, buyerCRN, drugName, listOfAssets, transporterCRN) {

  		//ONLY ‘Manufacturer’ or ‘Distributor’ or ‘Retailer’ to perform this operation
  		if('distributorMSP' != ctx.clientIdentity.mspId && 'retailerMSP' != ctx.clientIdentity.mspId  && 'manufacturerMSP' != ctx.clientIdentity.mspId){
  			throw new Error('Unauthorised Organization: '+ctx.clientIdentity.mspId);
  		}

  		//Validate  if buyer exists
  			let buyerIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [buyerCRN]);//partial composite key for checking company crn
  			let buyers = await this.loopFunction(buyerIterator);
  			if(buyers.length == 0){
  				throw new Error('Buyer does not exist with CRN.');
  			}
  			if(buyers[0].hierarchyKey == 1){
  				throw new Error('Buyer should not be a MANUFACTURER');
  			}

  			//	Validate if transporter exists
  			let transporterIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [transporterCRN]);//partial composite key for checking company crn
  			let transporter = await this.loopFunction(transporterIterator);

  			if(transporter.length == 0){
  				throw new Error('Transporter does not exist with CRN.');
  			}
  			//	Validate PO
  			let poID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.po', [buyerCRN,drugName]);
  			let poDataBuffer = await ctx.stub.getState(poID).catch(err => console.log(err));
  			if (!poDataBuffer.toString()) {
  				throw new Error('No PO found for BUYER :'+buyerCRN+", DRUG : "+drugName);
  			}
  			let poDetails = JSON.parse(poDataBuffer);

				var listOfAssetsArray = JSON.parse(listOfAssets);
  			if(listOfAssetsArray.length!=parseInt(poDetails.quantity)){
  				throw new Error('List of Assets should be equal to PO quantity.');
  			}

  		//let drugKey = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug', [serialNo+"-"+companyCRN]);

  		//	Validate DRUG
  		let drugIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.drug', [drugName]);
  		let drugResults = await this.loopFunction(drugIterator);

  		if(drugResults.length == 0){
  			throw new Error('Drug not registered'+drugName);
  		}
  		//	Validate DRUG existence with Manufacturer
  		let drugHasSeller = 0, drugsToSend = [], flag = 0;
			for(var i = 0; i < drugResults.length; i++) {
	  			if(drugResults[i].owner == poDetails.sellerID){
	  				drugHasSeller = 1;
						//return drugResults;
						for(var j = 0 ; j < listOfAssetsArray.length ; j++){
							//return listOfAssetsArray[0] == drugResults[0].serialNo;
		  				if(listOfAssetsArray[j] == drugResults[i].serialNo){
		  				drugsToSend[flag] = drugResults[i].productID;
							//return "inside"+drugsToSend[0];//check why push is not working
		  				flag++;
		  				}
						}
					if(drugsToSend.length == poDetails.quantity){//quantity limit, will anyways stop
	  				break;
	  			}
  				//break;
  			}
  		}
			if(flag == 0){//testing
				return drugResults;
			}

  		if(!drugHasSeller){
  			throw new Error('Seller does not own: '+drugName);
  		}
  		//	Validate drug stocks
  		if(drugsToSend.length < poDetails.quantity){
  			throw new Error('Seller doesnt have enough stock of : '+drugName + drugsToSend);
  		}

  		//	Validate hierarchical sale
  		//if(parseInt(sellers[0].hierarchyKey)+1 != parseInt(buyers[0].hierarchyKey)){
  			//throw new Error('You cannot buy from '+sellers[0].organisationRole+ " buyerCompanyInfo.hierarchyKey : "+buyers[0].hierarchyKey);
  		//}

  		let shipmentID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.shipment', [buyerCRN,drugName]);

  		let newShipmentObject = {
  			shipmentID: shipmentID,
  			creator : buyers[0].companyID,
  			assets : drugsToSend,
  			transporterCRN: transporterCRN,
  			status: 'IN-TRANSIT'
  		};

  		// Convert the JSON object to a buffer and send it to blockchain for storage
  		let dataBuffer = Buffer.from(JSON.stringify(newShipmentObject));
  		await ctx.stub.putState(shipmentID, dataBuffer);

  		return newShipmentObject;

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
module.exports = ManufacturerContract;
