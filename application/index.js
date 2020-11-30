const express = require('express');
const app = express();
const cors = require('cors');
const port = 3000;

// Import all function modules
const addToWallet = require('./1_addToWallet');
const contractFunctions = require('./contractFunctions');

// Define Express app settings
app.use(cors());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // try key value later
app.set('title', 'Pharma Network');

app.get('/', (req, res) => res.send('Finally this works'));

app.get('/addUsers', (req, res) => {//for invoking all certs reg
	addToWallet.initializeAllIdentititiesAtOnce()
		.then(() => {
			const result = {
				status: 'Success',
				message: `All orgs added to wallet`
			};
			res.json(result);
		})
		.catch((e) => {
			const result = {
				status: 'error',
				message: 'Failed',
				error: e
			};
			res.status(500).send(result);
		});
});

app.post('/addToWallet', (req, res) => {
	addToWallet.addIdentity(req.body.orgType, req.body.privateKeyFileName)//add to wallets
			.then(() => {
				console.log(`${req.body.orgType}'s User credentials added to wallet`);
				const result = {
					status: 'Success',
					message: `${req.body.orgType}'s User credentials added to wallet`
				};
				res.json(result);
			})
			.catch((e) => {
				const result = {
					status: 'error',
					message: 'Failed',
					error: e
				};
				res.status(500).send(result);
			});
});

app.post('/registerCompany', (req, res) => { // register a company
	contractFunctions.registerCompany(req.body.orgType,req.body)
	.then((response) => {
		const result = {
			status: 'Success',
			message: `registerCompany invoked successfully`,
			response : response
		};
		res.json(result);
	})
	.catch((e) => {
		const result = {
			status: 'ERROR',
			message: 'Failed',
			error: e.message
		};
		res.status(500).send(result);
	});
});

app.post('/addDrug', (req, res) => {// add drug //manufacturer= role check
	contractFunctions.addDrug(req.body.orgType,req.body)
	.then((response) => {
		const result = {
			status: 'Success',
			message: `addDrug invoked successfully`,
			response : response
		};
		res.json(result);
	})
	.catch((e) => {
		const result = {
			status: 'ERROR',
			message: 'Failed',
			error: e.message
		};
		res.status(500).send(result);
	});
});


app.post('/createPO', (req, res) => {//create PO
	contractFunctions.createPO(req.body.orgType,req.body)
	.then((response) => {
		const result = {
			status: 'Success',
			message: `createPO invoked successfully`,
			response : response
		};
		res.json(result);
	})
	.catch((e) => {
		const result = {
			status: 'ERROR',
			message: 'Failed',
			error: e.message
		};
		res.status(500).send(result);
	});
});

app.post('/createShipment', (req, res) => { // create shipment
	contractFunctions.createShipment(req.body.orgType,req.body)
	.then((response) => {
		const result = {
			status: 'Success',
			message: `createShipment invoked successfully`,
			response : response
		};
		res.json(result);
	})
	.catch((e) => {
		const result = {
			status: 'ERROR',
			message: 'Failed',
			error: e.message
		};
		res.status(500).send(result);
	});
});

app.post('/updateShipment', (req, res) => { // update shipment
	contractFunctions.updateShipment(req.body.orgType,req.body)
	.then((response) => {
		const result = {
			status: 'Success',
			message: `updateShipment invoked successfully`,
			response : response
		};
		res.json(result);
	})
	.catch((e) => {
		const result = {
			status: 'ERROR',
			message: 'Failed',
			error: e.message
		};
		res.status(500).send(result);
	});
});

app.post('/retailDrug', (req, res) => {// retail drug
	contractFunctions.retailDrug(req.body.orgType,req.body)
	.then((response) => {
		const result = {
			status: 'Success',
			message: `retailDrug invoked successfully`,
			response : response
		};
		res.json(result);
	})
	.catch((e) => {
		const result = {
			status: 'ERROR',
			message: 'Failed',
			error: e.message
		};
		res.status(500).send(result);
	});
});

app.post('/viewHistory', (req, res) => {// view history
	contractFunctions.viewHistory(req.body.orgType,req.body)
	.then((response) => {
		const result = {
			status: 'Success',
			message: `viewHistory invoked successfully`,
			response : response
		};
		res.json(result);
	})
	.catch((e) => {
		const result = {
			status: 'ERROR',
			message: 'Failed',
			error: e.message
		};
		res.status(500).send(result);
	});
});

app.post('/viewDrugCurrentState', (req, res) => {//get current state
	contractFunctions.viewDrugCurrentState(req.body.orgType,req.body)
	.then((response) => {
		const result = {
			status: 'Success',
			message: `viewDrugCurrentState invoked successfully`,
			response : response
		};
		res.json(result);
	})
	.catch((e) => {
		const result = {
			status: 'ERROR',
			message: 'Failed',
			error: e.message
		};
		res.status(500).send(result);
	});
});
// Verifying the SERVER on Port No 3000
app.listen(port, () => console.log(`Distributed PharmeNet App listening on port ${port}!`));

//commands easy
//update
//peer chaincode upgrade -o orderer.pharma-network.com:7050 -C pharmanet -n pharmanet -l node -v 1.5 -p /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/ -c '{"Args":["org.pharma-network.pharmanet.transporter:instantiate"]}' -P "OR ('manufacturerMSP.member','distributorMSP.member','retailerMSP.member','consumerMSP.member','transporterMSP.member')" >&log.txt
//peer chaincode upgrade -o orderer.pharma-network.com:7050 -C pharmanet -n pharmanet -l node -v 1.5 -p /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/ -c '{"Args":["org.pharma-network.pharmanet.retailer:instantiate"]}' -P "OR ('manufacturerMSP.member','distributorMSP.member','retailerMSP.member','consumerMSP.member','transporterMSP.member')" >&log.txt
//peer chaincode upgrade -o orderer.pharma-network.com:7050 -C pharmanet -n pharmanet -l node -v 1.5 -p /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/ -c '{"Args":["org.pharma-network.pharmanet.distributor:instantiate"]}' -P "OR ('manufacturerMSP.member','distributorMSP.member','retailerMSP.member','consumerMSP.member','transporterMSP.member')" >&log.txt
//peer chaincode upgrade -o orderer.pharma-network.com:7050 -C pharmanet -n pharmanet -l node -v 1.5 -p /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/ -c '{"Args":["org.pharma-network.pharmanet.manufacturer:instantiate"]}' -P "OR ('manufacturerMSP.member','distributorMSP.member','retailerMSP.member','consumerMSP.member','transporterMSP.member')" >&log.txt

//install
//peer chaincode install -n pharmanet -v 1.5 -l node -p /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/ >&log.txt

//instantiate
//peer chaincode instantiate -o orderer.pharma-network.com:7050 -C pharmanet -n pharmanet -l node -v 1.5 -p /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/ -c '{"Args":["org.pharma-network.pharmanet.transporter:instantiate"]}' -P "OR ('manufacturerMSP.member','distributorMSP.member','retailerMSP.member','consumerMSP.member','transporterMSP.member')" >&log.txt
//peer chaincode instantiate -o orderer.pharma-network.com:7050 -C pharmanet -n pharmanet -l node -v 1.5 -p /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/ -c '{"Args":["org.pharma-network.pharmanet.retailer:instantiate"]}' -P "OR ('manufacturerMSP.member','distributorMSP.member','retailerMSP.member','consumerMSP.member','transporterMSP.member')" >&log.txt
//peer chaincode instantiate -o orderer.pharma-network.com:7050 -C pharmanet -n pharmanet -l node -v 1.5 -p /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/ -c '{"Args":["org.pharma-network.pharmanet.distributor:instantiate"]}' -P "OR ('manufacturerMSP.member','distributorMSP.member','retailerMSP.member','consumerMSP.member','transporterMSP.member')" >&log.txt
//peer chaincode instantiate -o orderer.pharma-network.com:7050 -C pharmanet -n pharmanet -l node -v 1.5 -p /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/ -c '{"Args":["org.pharma-network.pharmanet.manufacturer:instantiate"]}' -P "OR ('manufacturerMSP.member','distributorMSP.member','retailerMSP.member','consumerMSP.member','transporterMSP.member')" >&log.txt
