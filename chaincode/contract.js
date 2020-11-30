'use strict';

let {Contract} = require('fabric-contract-api');

class PharmanetContract extends Contract {

	constructor() {
		// Provide a custom name to refer to this smart contract
		super('org.pharma-network.pharmanet');
	}

	/* ****** All custom functions are defined below ***** */

	// This is a basic user defined function used at the time of instantiating the smart contract
	// to print the success message on console
	async instantiate(ctx) {
		console.log('pharmanet Smart Contract Instantiated');
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

		for(var i = 0;i < registeredDrugs.length; i++) {
			if(registeredDrugs[i].productID === productID){
				throw new Error('Drug with same Serial ID and Name exists :'+drugName+' & '+serialNo);
			}
		}

		let manufacturingBuffer = await ctx.stub
				.getState(manufacturingKey)
				.catch(err => console.log(err));

		let manufacturerCompanyID;

		if(manufacturingBuffer){
	 		let manufacturer = JSON.parse(manufacturingBuffer.toString());
			manufacturerCompanyID = manufacturer.companyID;
 		}
		else{
			return "Only registered manufacturer can do this operation";
		}
		// Create a drug object to be stored in blockchain
		let drugDetails = {
			productID: drugKey,
			name: drugName,
			manufacturer: manufacturerCompanyID,
			manufacturingDate: mfgDate,
			expiryDate: expDate,
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
	 * Register a new drug on the network
	 * @param ctx - The transaction context object
	 * @param buyerCRN -  CRN of Buyer Company
	 * @param sellerCRN - CRN of Seller Company
	 * @param drugName -  Name of the DRUG
	 * @param quantity - Quantity of the DRUG
	 *
	 * @returns  A ‘PO’
	 */
	async createPO(ctx, buyerCRN, sellerCRN, drugName, quantity) {
		// Create a new composite key for the new PO

		let poKey = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.po', [buyerCRN,drugName]);

		// only retailer and distributor validation
		if('distributorMSP' != ctx.clientIdentity.mspId && 'retailerMSP' != ctx.clientIdentity.mspId){
			throw new Error('Unauthorised Organisation: '+ctx.clientIdentity.mspId);
		}

		//Validate  if buyer exists
			let buyerIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [buyerCRN]);//partial composite key for checking company crn
			let buyers = await this.loopFunction(buyerIterator);
			if(buyers.length==0){
				throw new Error('Buyer does not exist with CRN.');
			}
			if(buyers[0].hierarchyKey == 1){
				throw new Error('Buyer should not be a MANUFACTURER');
			}

			//Validate  if seller exists
				let sellerIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [sellerCRN]);//partial composite key for checking company crn
				let sellers = await this.loopFunction(sellerIterator);
				if(sellers.length==0){
					throw new Error('Seller does not exist with CRN.');
				}
		//let drugKey = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug', [serialNo+"-"+companyCRN]);

		//	Validate DRUG
		let drugIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.drug', [drugName]);
		let drugResults = await this.loopFunction(drugIterator);

		if(drugResults.length==0){
			throw new Error('Drug not registered'+drugName);
		}
		//	Validate DRUG existence with Manufacturer
		let drugHasSeller = 0;
		for(var i = 0; i < drugResults.length; i++) {
			if(drugResults[i].owner == sellers[i].companyID){
				drugHasSeller = 1;
				break;
			}
		}

		if(!drugHasSeller){
			throw new Error('Seller does not own: '+drugName);
		}

		//	Validate hierarchical sale
		if(parseInt(sellers[0].hierarchyKey)+1 != parseInt(buyers[0].hierarchyKey)){
			throw new Error('You cannot buy from '+sellers[0].organisationRole+ " buyerCompanyInfo.hierarchyKey : "+buyers[0].hierarchyKey);
		}

		let poDetails = {
			poID: poKey,
			drugName: drugName,
			quantity: quantity,
			buyer: buyerCRN,
			seller: sellerCRN,
			buyerID: buyers[0].companyID,
			sellerID: sellers[0].companyID,
			createdBy: ctx.clientIdentity.getID(),
			updatedBy: ctx.clientIdentity.getID(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Convert the JSON object to a buffer and send it to blockchain for storage
		let dataBuffer = Buffer.from(JSON.stringify(poDetails));
		await ctx.stub.putState(poKey, dataBuffer);
		// Return value of new company account created to user
		return poDetails;
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

			var listOfAssetsArray = JSON.parse(listOfAssets);
			if(listOfAssetsArray.length!=parseInt(poDetails.quantity)){
				throw new Error('List of Assets should be equal to PO quantity.');
			}

			//	Validate PO
			let poID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.po', [buyerCRN,drugName]);
			let poDataBuffer = await ctx.stub.getState(poID).catch(err => console.log(err));
			if (!poDataBuffer.toString()) {
				throw new Error('No PO fount for BUYER :'+buyerCRN+", DRUG : "+drugName);
			}
			let poDetails = JSON.parse(poDataBuffer);
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

		if(!drugHasSeller){
			throw new Error('Seller does not own: '+drugName);
		}

		//	Validate drug stocks
		if(drugsToSend.length < poDetails.quantity){
			throw new Error('Seller doesnt have enough stock of : '+drugName);
		}

		//	Validate hierarchical sale
		if(parseInt(sellers[0].hierarchyKey)+1 != parseInt(buyers[0].hierarchyKey)){
			throw new Error('You cannot buy from '+sellers[0].organisationRole+ " buyerCompanyInfo.hierarchyKey : "+buyers[0].hierarchyKey);
		}

		let shipmentID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.shipment', [buyerCRN,drugName]);

		let newShipmentObject = {
			shipmentID: shipmentID,
			creator : buyerCompanySearchResults[0].companyID,
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
	 * Register a new drug on the network
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
			for(var i = 0; i < shipmentObject.assets.length; i++){
				let drugObjectBuffer = await ctx.stub.getState(shipmentObject.assets[i])
																									 .catch(err => console.log(err));
				let drugObject = Buffer.from(drugObjectDataBuffer);

				drugObject.owner = buyerCompanySearchResults[0].companyID;
				drugObject.shipment.push(shipmentID);
				let dataBuffer = Buffer.from(JSON.stringify(newShipmentObject));
				await ctx.stub.putState(drugObject.productID, dataBuffer);
			}
			// Update status to DELIVERED
		shipmentObject.status = 'DELIVERED';
		let shipmentDataBuffer = Buffer.from(JSON.stringify(shipmentObject));
		await ctx.stub.putState(shipmentID, shipmentDataBuffer);

		return shipmentObject;

	}

	/**
	 * Register a new drug on the network
	 * @param ctx - The transaction context object
	 * @param serialNo  -  serial number of drug
	 * @param retailerCRN  - CRN of retailer Company
	 * @param drugName -  Name of the DRUG
	 * @param customerAadhar -  customer aadhar number
	 * @returns  A ‘Shipment object’
	 */
	async retailDrug(ctx, drugName, serialNo, retailerCRN, customerAadhar) {

			// Validate ONLY ‘Retailer’
			if('retailerMSP'!=ctx.clientIdentity.mspId){
				throw new Error('Unauthorised Organization : '+ctx.clientIdentity.mspId);
			}

			//	Validate retailer
			let retailerIterator = await ctx.stub.getStateByPartialCompositeKey('org.pharma-network.pharmanet.company', [retailerCRN]);//partial composite key for checking company crn
			let retailers = await this.loopFunction(retailerIterator);
			if(retailers.length == 0){
				throw new Error('Retailer does not exist with CRN.');
			}

			//	Validate DRUG against serialNo
			let productID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug', [drugName,serialNo]);
			let drugObjectBuffer = await ctx.stub.getState(productID)
																							 .catch(err => console.log(err));
			if (!drugObjectBuffer.toString()) {
				throw new Error('No Drug registered with ',drugName,serialNo);
			}
			let drugObject = Buffer.from(drugObjectBuffer);

			if(drugObject.owner != retailers[0].companyID){
				throw new Error('Only drug owners can initiate this function',drugName,serialNo);
			}

			drugObject.owner = customerAadhar;//update aadhar of customer
			await ctx.stub.putState(productID, Buffer.from(JSON.stringify(drugObject)));

			return drugObject;
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
		return JSON.parse(drugObjectDataBuffer);
	}


}

module.exports = PharmanetContract;
