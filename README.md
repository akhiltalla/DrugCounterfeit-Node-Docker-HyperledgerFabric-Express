# DrugCounterfeit-Node-Docker-HyperledgerFabric-Express

This project was done for a problem in the Drug industry, which is Drug Counterfeit (reproducing false drugs/ reusing expired drugs)

The solution is supply chain transparency (or) Serialisation-enabled traceability. Using serial numbers to track products at the item level, companies would also reduce costs of their expired medicines, reduce instances of stock dumping and achieve pinpoint accuracy of item-level sales data. 

Solution consists of a drug management network, which consists of various stakeholders like - Manufacturer, Transporter, Distributer, Retailer and finally Consumer as MSPs(Membership Service Provider).

#The roles of each of the stakeholder is - 

1. Manufacturers: All the drug manufacturers that are registered or will be registered in the future with the network will belong to this level.

2. Distributors: All the drug distributors that are registered or will be registered in the future on the network will belong to this organisation. These distributors will purchase drugs directly from the manufacturers.

3. Retailers: All pharmacists or drug retailers will be a part of this organisation. The retailers will receive drug consignments from the distributors. 

4. Consumers: These are the people who purchase medicines from pharmacists. 

5. Transporters: A transporter is an entity that is responsible for the shipment of consignments from one point to another.



#The functions my smartcontracts are able to provide are - 

1. Register a Company to the network
2. Register a Drug to the network
3. Create a Purchase order(PO) to transfer drug
4. Create shipment for the Orders
5. Update the shipment once it is recieved by one party
6. Retail the drug to consumer

#To expose the above network, i wrote a node application which - 
1. This application will be used by the organisations to interact with the functions defined inside the smart contract.
2. Wrote different connection profiles for each stakeholder of the organisation.
3. Created a wallet to store the identity of the Admin user of each organisation.(Each of the network has 2 peers Admin and Peer)
4. Wrote node modules corresponding to every function defined in the smart contract. While invoking the transactions pass the name of the organisation to each node module. Using this name, access the corresponding connection profile and connect to the network and get an instance of the smart contract. 
5. Created a node server for this application using the Express library and expose these node modules for application as server-side endpoints.
6. Sent HTTP requests on these endpoints using Postman application. Collection is provided in the test folder.



