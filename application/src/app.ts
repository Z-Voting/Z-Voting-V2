import {Gateway, GatewayOptions} from 'fabric-network';
import * as path from 'path';
import {buildCCPOrg1, buildWallet, prettyJSONString} from './utils/AppUtil';
import {buildCAClient, enrollAdmin, registerAndEnrollUser} from './utils/CAUtil';

const channelName = 'zvoting';
const chaincodeName = 'zvoting';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

async function main() {
    try {
        // build an in memory object with the network configuration (also known as a connection profile)
        const ccp = buildCCPOrg1();

        // build an instance of the fabric ca services client based on
        // the information in the network configuration
        const caClient = buildCAClient(ccp, 'ca.org1.example.com');

        // setup the wallet to hold the credentials of the application user
        const wallet = await buildWallet(walletPath);

        // in a real application this would be done on an administrative flow, and only once
        await enrollAdmin(caClient, wallet, mspOrg1);

        // in a real application this would be done only when a new user was required to be added
        // and would be part of an administrative flow
        await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

        // Create a new gateway instance for interacting with the fabric network.
        // In a real application this would be done as the backend server session is setup for
        // a user that has been verified.
        const gateway = new Gateway();

        const gatewayOpts: GatewayOptions = {
            wallet,
            identity: org1UserId,
            discovery: {enabled: true, asLocalhost: true}, // using asLocalhost as this gateway is using a fabric network deployed locally
        };

        try {
            // setup the gateway instance
            // The user will now be able to create connections to the fabric network and be able to
            // submit transactions and query. All transactions submitted by this gateway will be
            // signed by this user using the credentials stored in the wallet.
            await gateway.connect(ccp, gatewayOpts);

            // Build a network instance based on the channel where the smart contract is deployed
            const network = await gateway.getNetwork(channelName);

            // Get the contract from the network.
            const contract = network.getContract(chaincodeName);

            const electionId = Math.floor(Math.random() * 10000);

            // Create election
            try {
                console.log('\n--> Submit Transaction: CreateElection');
                await contract.submitTransaction('CreateElection', `election${electionId}`, `election ${electionId}`);
                console.log('*** Result: election created');
            } catch (e) {
                console.error(e.toString());
            }

            // This will fail as election is not ready
            try {
                console.log('\n--> Submit Transaction: StartElection');
                await contract.submitTransaction('StartElection', `election${electionId}`);
                console.log('*** Result: election started');
            } catch (e) {
                console.error(e.toString());
            }

            // One candidate is added
            try {
                console.log('\n--> Submit Transaction: AddCandidate');
                await contract.submitTransaction('AddCandidate', `candidateA_partyA_election${electionId}`, 'Candidate A', 'PartyACandidateA', `election${electionId}`);
                console.log('*** Result: Candidate Added');
            } catch (e) {
                console.error(e.toString());
            }

            // This fails as same candidate is added again
            try {
                console.log('\n--> Submit Transaction: AddCandidate');
                await contract.submitTransaction('AddCandidate', `candidateA_partyA_election${electionId}`, 'Candidate A', 'PartyACandidateA', `election${electionId}`);
                console.log('*** Result: Candidate Added');
            } catch (e) {
                console.error(e.toString());
            }

            // Election is started
            try {
                console.log('\n--> Submit Transaction: StartElection');
                await contract.submitTransaction('StartElection', `election${electionId}`);
                console.log('*** Result: election started');
            } catch (e) {
                console.error(e.toString());
            }

            // Let's try a query type operation (function).
            // This will be sent to just one peer and the results will be shown.
            console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
            let result = await contract.evaluateTransaction('GetAllAssets');
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);

            // Now let's try to submit a transaction.
            // This will be sent to both peers and if both peers endorse the transaction, the endorsed proposal will be sent
            // to the orderer to be committed by each of the peer's to the channel ledger.
            console.log('\n--> Submit Transaction: CreateAsset, creates new asset with ID, color, owner, size, and appraisedValue arguments');
            await contract.submitTransaction('CreateAsset', 'asset13', 'yellow', '5', 'Tom', '1300');
            console.log('*** Result: committed');

            console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given assetID');
            result = await contract.evaluateTransaction('ReadAsset', 'asset13');
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);

            console.log('\n--> Evaluate Transaction: AssetExists, function returns "true" if an asset with given assetID exist');
            result = await contract.evaluateTransaction('AssetExists', 'asset1');
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);

            console.log('\n--> Submit Transaction: UpdateAsset asset1, change the appraisedValue to 350');
            await contract.submitTransaction('UpdateAsset', 'asset1', 'blue', '5', 'Tomoko', '350');
            console.log('*** Result: committed');

            console.log('\n--> Evaluate Transaction: ReadAsset, function returns "asset1" attributes');
            result = await contract.evaluateTransaction('ReadAsset', 'asset1');
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);

            // try {
            //     // How about we try a transactions where the executing chaincode throws an error
            //     // Notice how the submitTransaction will throw an error containing the error thrown by the chaincode
            //     console.log('\n--> Submit Transaction: UpdateAsset asset70, asset70 does not exist and should return an error');
            //     await contract.submitTransaction('UpdateAsset', 'asset70', 'blue', '5', 'Tomoko', '300');
            //     console.log('******** FAILED to return an error');
            // } catch (error) {
            //     console.log(`*** Successfully caught the error: \n    ${error}`);
            // }

            console.log('\n--> Submit Transaction: TransferAsset asset1, transfer to new owner of Tom');
            await contract.submitTransaction('TransferAsset', 'asset1', 'Tom');
            console.log('*** Result: committed');

            console.log('\n--> Evaluate Transaction: ReadAsset, function returns "asset1" attributes');
            result = await contract.evaluateTransaction('ReadAsset', 'asset1');
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        } finally {
            // Disconnect from the gateway when the application is closing
            // This will close all connections to the network
            gateway.disconnect();
        }
    } catch (error) {
        console.error(`******** FAILED to run the application: ${error}`);
    }
}

main()
    .then(() => console.log("Successfully executed app"))
    .catch(reason => console.error(`Error: ${reason.toString()}`));
