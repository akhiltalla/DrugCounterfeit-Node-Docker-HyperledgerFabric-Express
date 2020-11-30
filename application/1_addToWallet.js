'use strict';

/**
 * This is a Node.JS module to load a user's Identity to his wallet.
 * This Identity will be used to sign transactions initiated by this user.
 * 	User name would be Manufacturer, Distributer, Transporter, Retailer
 */

const fs = require('fs'); // FileSystem Library
const path = require('path'); // Support library to build filesystem paths in NodeJs
const { FileSystemWallet, X509WalletMixin } = require('fabric-network'); // Wallet Library provided by Fabric

const crypto_materials = path.resolve(__dirname, '../network/crypto-config'); // Directory where all Network artifacts are stored

// A wallet is a filesystem path that stores a collection of Identities
async function addIdentity(orgType,privateKeyFileName){ // try loop logic later
	try {
		const wallet = new FileSystemWallet('./identity/'+orgType+'');

		// Fetch the credentials from our previously generated Crypto Materials required to create this user's identity
		const credentialPath = path.join(crypto_materials, '/peerOrganizations/'+orgType+'.pharma-network.com/users/Admin@'+orgType+'.pharma-network.com');
		const certificate = fs.readFileSync(path.join(credentialPath, '/msp/signcerts/Admin@'+orgType+'.pharma-network.com-cert.pem')).toString();//check if this works

		// IMPORTANT: Change the private key name to the key generated on your computer
		const privatekey = fs.readFileSync(path.join(credentialPath, '/msp/keystore/'+privateKeyFileName)).toString();

		// Load credentials into wallet
		const identityLabel = orgType.toUpperCase()+'_ADMIN';
		const identity = X509WalletMixin.createIdentity(''+orgType+'MSP', certificate, privatekey);

		await wallet.import(identityLabel, identity);

		console.log(identityLabel +" identity added successfully");

	} catch (error) {
		console.log(error.stack);
		throw new Error(`Error adding to wallet. ${error}`);
	}
}

/**
 * initialisation of all users
 *
 */
async function initializeAllIdentititiesAtOnce() {
	try {
		await addIdentity('manufacturer','6795f606047b0617a9a0b2cba10c56bdf8aa139c6ae2e0af77ef38e2d030ff12_sk');
		await addIdentity('distributor','21163343603477bc1e2e06795706f589d1be0ebc9f567ca0a32010bbfd8f88d8_sk');
		await addIdentity('retailer','1e22eba6078d3d517bff9a412774e4a3e19eff8fc0634f21d4c93f7c7596fa67_sk');
		await addIdentity('consumer','ae73bf008210e5f8bf2a28dd9fc6d913719329d5d3f6f38116a0dd3fe2361b98_sk');
		await addIdentity('transporter','214e5528eba225868d750a48c9368e8a4ec38ca7a9cd3dffca8fb29c6fddbfbd_sk');
	} catch (error) {
		console.log(error.stack);
		throw new Error(`Error ${error}`);
	}
}

exports.addIdentity = addIdentity;
exports.initializeAllIdentititiesAtOnce = initializeAllIdentititiesAtOnce;
