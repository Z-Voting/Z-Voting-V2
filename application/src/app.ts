const BlindSignature = require('blind-signatures');
const NodeRSA = require('node-rsa');

import {Gateway, GatewayOptions} from 'fabric-network';
import * as path from 'path';
import {buildCCPOrg1, buildWallet} from './utils/AppUtil';
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
        await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1', [
            {name: 'election.judge', value: 'true', ecert: true},
            {name: 'election.creator', value: 'true', ecert: true},
        ]);

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
                await contract.submitTransaction('CreateElection', `${electionId}`, `election ${electionId}`);
                console.log('*** Result: election created');
            } catch (e) {
                console.error(e.toString());
            }

            // Get Private Endorsement Right
            try {
                console.log('\n--> Submit Transaction: GetPrivateEndorsementRight');
                await contract.submitTransaction('GetPrivateEndorsementRight', `privateData`);
                console.log('*** Result: GetPrivateEndorsementRight succeeded');
            } catch (e) {
                console.error(e.toString());
            }



            // // Judge is Added
            // try {
            //     const key = BlindSignature.keyGeneration({b: 2048});
            //
            //     const privateKey = key.exportKey('pkcs8').toString();
            //     console.log("\n");
            //     console.log(privateKey);
            //     console.log("\n");
            //
            //     const n = key.keyPair.n.toString();
            //     const e = key.keyPair.e.toString();
            //
            //     const rounds = 1;
            //     console.log(`Start verifying ${rounds} signatures`);
            //     for (let i = 0; i < rounds; i++) {
            //         const message = "The quick brown fox jumps over a lazy dog";
            //         const {blinded, r} = BlindSignature.blind({
            //             message: message,
            //             N: n,
            //             E: e,
            //         }); // Alice blinds message
            //
            //         const signed = BlindSignature.sign({
            //             blinded: blinded,
            //             key: key
            //         });
            //
            //         const unblinded = BlindSignature.unblind({
            //             signed: signed,
            //             N: n,
            //             r: r
            //         });
            //
            //         // console.log("\n\n------------------------");
            //         // console.log(unblinded.toString());
            //         // console.log("------------------------\n\n");
            //
            //
            //         const result = BlindSignature.verify({
            //             unblinded: unblinded.toString(),
            //             N: n,
            //             E: e,
            //             message: message,
            //         });
            //         // if (result) {
            //         //     console.log('Alice: Signatures verify!');
            //         // } else {
            //         //     console.log('Alice: Invalid signature');
            //         // }
            //
            //         const result2 = BlindSignature.verify2({
            //             unblinded: unblinded.toString(),
            //             key: key,
            //             message: message,
            //         });
            //         // if (result2) {
            //         //     console.log('Bob: Signatures verify!');
            //         // } else {
            //         //     console.log('Bob: Invalid signature');
            //         // }
            //     }
            //     console.log("End verifying 10000 signatures");
            //
            //
            // } catch (e) {
            //     console.error(e.toString());
            // }

            // One candidate is added
            try {
                console.log('\n--> Submit Transaction: AddCandidate');
                await contract.submitTransaction('AddCandidate', 'Candidate A', 'PartyACandidateA', `election${electionId}`);
                console.log('*** Result: Candidate Added');
            } catch (e) {
                console.error(e.toString());
            }

            // One candidate is added
            try {
                console.log('\n--> Submit Transaction: AddCandidate');
                await contract.submitTransaction('AddCandidate', 'Candidate B', 'PartyBCandidateB', `${electionId}`);
                console.log('*** Result: Candidate Added');
            } catch (e) {
                console.error(e.toString());
            }

            // Get Elections
            try {
                console.log('\n--> Submit Transaction: GetElections');
                const result = await contract.evaluateTransaction('GetElections');
                console.log(`*** Result: ${result}`);
            } catch (e) {
                console.error(e.toString());
            }

            // Get Election Candidates
            try {
                console.log('\n--> Submit Transaction: GetCandidates');
                const result = await contract.evaluateTransaction('GetCandidates', `${electionId}`);
                console.log(`*** Result: ${result}`);
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
